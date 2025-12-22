import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Server } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';

import {
  CreateMessageDto,
  UpdateMessageDto,
  MessageApiResponse,
} from '@fylr/types';

import { UserRole, Message as PrismaMessage } from '@prisma/client';

import { ChatMessage, LLMService, ToolCall } from 'src/ai/llm.service';
import { AiVectorService } from 'src/ai/vector.service';
import { RerankingService, VectorSearchResult } from 'src/ai/reranking.service';
import { SourceService } from 'src/source/source.service';
import { ToolService } from './tools/tool.service';
import { PermissionsService } from 'src/auth/permissions.service';
import {
  sanitizeMessage,
  sanitizeText,
  sanitizeObject,
} from 'src/utils/text-sanitizer';

interface MessageWithThoughts extends MessageApiResponse {
  agentThoughts?: MessageApiResponse[];
}

interface SynthesisPromptVars {
  messages: { role: string; content: string }[];
  userQuestion: string;
  context?: string;
  sourceReferenceList?: { number: number; name: string; chunkIndex: number }[];
  overrideQuery?: string;
}

interface ConversationMetadata {
  agenticMode?: boolean;
  webSearchEnabled?: boolean;
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    private prisma: PrismaService,
    private readonly llmService: LLMService,
    private readonly vectorService: AiVectorService,
    private readonly rerankingService: RerankingService,
    private sourceService: SourceService,
    private readonly toolService: ToolService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async getMessages(conversationId: string): Promise<MessageApiResponse[]> {
    try {
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });
      return messages.map((msg) => sanitizeMessage(msg) as MessageApiResponse);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve messages for conversation ${conversationId}`,
      );
    }
  }

  async getMessagesWithThoughts(
    conversationId: string,
  ): Promise<MessageWithThoughts[]> {
    try {
      const allMessages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });

      const displayMessages: MessageWithThoughts[] = [];
      const thoughtBuffer: MessageApiResponse[] = [];

      for (const msg of allMessages) {
        const sanitizedMsg = sanitizeMessage(msg) as MessageApiResponse;

        if (msg.role === 'user') {
          displayMessages.push(sanitizedMsg);
        } else if (msg.role === 'assistant') {
          if (msg.content) {
            displayMessages.push({
              ...sanitizedMsg,
              agentThoughts:
                thoughtBuffer.length > 0 ? [...thoughtBuffer] : undefined,
            });
            thoughtBuffer.length = 0;
          } else if (msg.reasoning || msg.toolCalls) {
            thoughtBuffer.push(sanitizedMsg);
          }
        }
      }

      return displayMessages;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve messages for conversation ${conversationId}`,
      );
    }
  }

  async createMessage(
    body: CreateMessageDto,
    conversationId: string,
  ): Promise<PrismaMessage> {
    try {
      if (typeof body.metadata === 'string') {
        body.metadata = JSON.parse(body.metadata);
      }
    } catch (e) {
      throw new InternalServerErrorException('Invalid JSON format in metadata');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        ...body,
      },
    });

    return sanitizeMessage(message) as PrismaMessage;
  }

  private async generateQueryVariations(
    originalQuery: string,
  ): Promise<string[]> {
    try {
      const response = await this.llmService.generate({
        prompt_type: 'multi_query',
        prompt_vars: { query: originalQuery },
      });

      const variations = response
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.match(/^[0-9]+\.|^[-*•]/))
        .slice(0, 5);

      console.log(
        `[RAG Pipeline] Generated ${variations.length} query variations for: "${originalQuery}"`,
      );
      return variations.length > 0 ? variations : [originalQuery];
    } catch (error) {
      console.error(
        '[RAG Pipeline] Failed to generate query variations:',
        error,
      );
      return [originalQuery];
    }
  }

  private async multiQueryRetrieval(
    queries: string[],
    sourceIds: string[],
    limit = 25,
  ): Promise<VectorSearchResult[]> {
    console.log(
      `[RAG Pipeline] Performing multi-query retrieval with ${queries.length} queries`,
    );

    const allResults = await Promise.all(
      queries.map(async (query) => {
        const embedding = await this.vectorService.search(query);
        return this.sourceService.findByVector(
          embedding,
          sourceIds,
          Math.ceil(limit / queries.length),
        );
      }),
    );

    const resultsMap = new Map<string, VectorSearchResult>();
    allResults.flat().forEach((result) => {
      if (!resultsMap.has(result.id)) {
        resultsMap.set(result.id, result);
      }
    });

    const uniqueResults = Array.from(resultsMap.values()).slice(0, limit);
    console.log(
      `[RAG Pipeline] Multi-query retrieved ${uniqueResults.length} unique results from ${allResults.flat().length} total`,
    );

    return uniqueResults;
  }

  private convertToolMessagesToPlainText(
    messages: ChatMessage[],
  ): { role: string; content: string }[] {
    const plainTextMessages: { role: string; content: string }[] = [];

    for (const msg of messages) {
      if (msg.role === 'user') {
        plainTextMessages.push({
          role: 'user',
          content: msg.content || '',
        });
      } else if (msg.role === 'assistant') {
        let content = msg.content || '';
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          const toolCallsText = msg.tool_calls
            .map((tc: ToolCall) => {
              const args =
                typeof tc.function.arguments === 'string'
                  ? tc.function.arguments
                  : JSON.stringify(tc.function.arguments);
              return `Called tool: ${tc.function.name}(${args})`;
            })
            .join('\n');
          content = content ? `${content}\n\n${toolCallsText}` : toolCallsText;
        }
        if (content) {
          plainTextMessages.push({ role: 'assistant', content });
        }
      } else if (msg.role === 'tool') {
        let toolContent = msg.content || '';
        try {
          const parsed = JSON.parse(toolContent);
          toolContent = `Tool result: ${JSON.stringify(parsed, null, 2)}`;
        } catch {
          toolContent = `Tool result: ${toolContent}`;
        }
        plainTextMessages.push({ role: 'assistant', content: toolContent });
      }
    }
    return plainTextMessages;
  }

  private getMostRecentUserQuestion(messages: ChatMessage[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user' && messages[i].content) {
        return messages[i].content as string;
      }
    }
    return '';
  }

  private async synthesizeAndStreamFinalAnswer(
    messages: ChatMessage[],
    conversationId: string,
    server: Server,
    userMessageId: string,
    sourceChunks: VectorSearchResult[] = [],
    overrideQuery?: string,
    userRole?: UserRole,
  ) {
    try {
      const plainTextMessages = this.convertToolMessagesToPlainText(messages);
      const recentUserQuestion = this.getMostRecentUserQuestion(messages);
      const promptVars: Partial<SynthesisPromptVars> = {
        messages: plainTextMessages,
      };

      if (overrideQuery) {
        promptVars.overrideQuery = overrideQuery;
      } else if (recentUserQuestion) {
        promptVars.userQuestion = recentUserQuestion;
      }

      const stream = this.llmService.generateStream({
        prompt_type: 'synthesis',
        prompt_version: 'v1',
        prompt_vars: promptVars as Record<string, unknown>,
      });

      let fullResponse = '';
      let chunkIndex = 0;
      const streamId = `stream-${conversationId}-${Date.now()}`;

      try {
        for await (const chunk of stream) {
          const sanitizedChunk = sanitizeText(chunk) || '';
          if (!sanitizedChunk) continue;
          fullResponse += sanitizedChunk;
          server.to(conversationId).emit('conversationAction', {
            action: 'messageChunk',
            conversationId,
            data: {
              content: sanitizedChunk,
              chunkIndex: chunkIndex++,
              streamId,
            },
          });
        }
      } catch (streamError) {
        console.error('Error during synthesis streaming:', streamError);
        throw new InternalServerErrorException('Failed to stream final answer');
      }

      if (!fullResponse || fullResponse.trim().length === 0) {
        console.warn('Synthesis produced empty response');
        fullResponse =
          'I apologize, but I was unable to generate a response. Please try again.';
      }

      const uniqueChunks = Array.from(
        new Map(sourceChunks.map((chunk) => [chunk.id, chunk])).values(),
      );

      const finalAssistantMessage = await this.createMessage(
        {
          role: 'assistant',
          content: fullResponse,
          parentMessageId: userMessageId,
          metadata:
            uniqueChunks.length > 0
              ? {
                  relatedSources: uniqueChunks.map((c) => ({
                    id: c.id,
                    sourceId: c.source.id,
                    libraryId: c.source.libraryId,
                    name: c.source.name,
                    chunkIndex: c.chunkIndex,
                  })),
                  rerankingUsed: userRole === UserRole.PRO,
                  userRole: userRole,
                }
              : {
                  rerankingUsed: userRole === UserRole.PRO,
                  userRole: userRole,
                },
        },
        conversationId,
      );
      server.to(conversationId).emit('conversationAction', {
        action: 'messageEnd',
        conversationId,
        data: finalAssistantMessage,
      });
    } catch (error) {
      console.error('Error in synthesizeAndStreamFinalAnswer:', error);
      server.to(conversationId).emit('conversationAction', {
        action: 'streamError',
        conversationId,
        data: {
          message: 'Failed to generate final answer. Please try again.',
        },
      });
      throw error;
    }
  }

  async regenerateAndStreamAiResponse(
    assistantMessageId: string,
    server: Server,
  ) {
    if (!assistantMessageId) {
      throw new NotFoundException(
        'Assistant message ID is required for regeneration.',
      );
    }

    const assistantMessage = await this.prisma.message.findUnique({
      where: { id: assistantMessageId },
    });
    if (!assistantMessage || assistantMessage.role !== 'assistant') {
      throw new NotFoundException('Assistant message to regenerate not found.');
    }

    let userMessage;
    if (assistantMessage.parentMessageId) {
      userMessage = await this.prisma.message.findUnique({
        where: { id: assistantMessage.parentMessageId },
      });
    } else {
      userMessage = await this.prisma.message.findFirst({
        where: {
          conversationId: assistantMessage.conversationId,
          createdAt: { lt: assistantMessage.createdAt },
          role: 'user',
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!userMessage || userMessage.role !== 'user') {
      throw new NotFoundException(
        'Could not find the original user prompt for regeneration.',
      );
    }

    await this.prisma.message.delete({ where: { id: assistantMessageId } });
    await this.prisma.message.deleteMany({
      where: {
        conversationId: assistantMessage.conversationId,
        createdAt: {
          gt: userMessage.createdAt,
          lt: assistantMessage.createdAt,
        },
        role: 'assistant',
        content: null,
      },
    });

    const userMetadata = userMessage.metadata as ConversationMetadata;
    const agenticMode = userMetadata?.agenticMode !== false;

    /*if (agenticMode) {
      await this.generateAndStreamAiResponseWithTools(userMessage, server);
    } else {
      await this.generateAndStreamAiResponse(userMessage, server);
    }*/
  }

  async getMessage(id: string): Promise<MessageApiResponse | null> {
    try {
      const message = await this.prisma.message.findUnique({ where: { id } });
      return message ? (sanitizeMessage(message) as MessageApiResponse) : null;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve message ${id}`,
      );
    }
  }

  async updateMessage(
    body: UpdateMessageDto,
    id: string,
  ): Promise<MessageApiResponse> {
    try {
      await this.getMessage(id);
      const message = await this.prisma.message.update({
        where: { id },
        data: body,
      });
      return sanitizeMessage(message) as MessageApiResponse;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to update message ${id}`);
    }
  }

  async deleteMessage(id: string): Promise<PrismaMessage> {
    try {
      const message = await this.getMessage(id);
      if (!message) {
        throw new NotFoundException(`Message ${id} not found`);
      }

      if (message.role === 'user') {
        await this.prisma.message.deleteMany({
          where: { parentMessageId: id },
        });
      }

      return await this.prisma.message.delete({ where: { id } });
    } catch (error) {
      throw new InternalServerErrorException(`Failed to delete message ${id}`);
    }
  }
}
