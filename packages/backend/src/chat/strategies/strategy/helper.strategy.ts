import { Server } from 'socket.io';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ToolDefinition } from '../../tools/base.tool';
import { tools as specialTools } from '../../tool';
import { UserRole, Message as PrismaMessage } from '@prisma/client';
import { ToolService } from 'src/chat/tools';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageService } from 'src/chat/message.service';
import { ConversationService } from 'src/chat/conversation.service';
import {
  AgentStrategyServices,
  ConversationWithSources,
} from './agent.strategy';
import { ChatMessage, LLMService, ToolCall } from 'src/ai/llm.service';
import { VectorSearchResult } from 'src/ai/reranking.service';
import { sanitizeText } from 'src/utils/text-sanitizer';

export class HelperStrategy {
  protected readonly prisma: PrismaService;
  protected readonly messageService: MessageService;
  protected readonly conversationService: ConversationService;
  protected readonly llmService: LLMService;
  protected readonly toolService: ToolService;

  constructor(services: AgentStrategyServices) {
    this.prisma = services.prisma;
    this.messageService = services.messageService;
    this.conversationService = services.conversationService;
    this.llmService = services.llmService;
    this.toolService = services.toolService;
  }

  emitToolProgress(
    toolName: string,
    message: string,
    server: Server,
    conversationId: string,
  ) {
    server.to(conversationId).emit('conversationAction', {
      action: 'toolProgress',
      conversationId,
      data: { toolName, message },
    });
  }

  getAvailableTools(
    hasSources: boolean,
    webSearchEnabled: boolean,
  ): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    const allToolDefinitions = this.toolService.getAllToolDefinitions();

    if (hasSources) {
      const documentTools = [
        'search_documents',
        'read_document_chunk',
        'list_sources_in_library',
      ];
      tools.push(
        ...allToolDefinitions.filter((tool) =>
          documentTools.includes(tool.function.name),
        ),
      );
    }

    if (webSearchEnabled) {
      const webTools = ['web_search', 'fetch_webpage'];
      tools.push(
        ...allToolDefinitions.filter((tool) =>
          webTools.includes(tool.function.name),
        ),
      );
    }

    if (tools.length > 0) {
      tools.push(...(specialTools as ToolDefinition[]));
    }
    return tools;
  }

  buildContextMessages(
    messages: PrismaMessage[],
    maxMessages: number,
  ): ChatMessage[] {
    const contextMessages: ChatMessage[] = messages
      .map((m) => {
        const msg: ChatMessage = {
          role: m.role as ChatMessage['role'],
          content: m.content ?? undefined,
        };
        if (m.toolCalls) {
          msg.tool_calls = m.toolCalls as unknown as ToolCall[];
        }
        if (m.role === 'tool' && m.toolCallId) {
          msg.tool_call_id = m.toolCallId;
        }
        return msg;
      })
      .filter((m) => m.content || m.tool_calls || m.role === 'tool');

    if (contextMessages.length <= maxMessages) {
      return contextMessages;
    }

    const firstMessage = contextMessages[0];
    const recentMessages = contextMessages.slice(-(maxMessages - 1));
    return [firstMessage, ...recentMessages];
  }

  pruneContextMessages(messages: ChatMessage[], maxMessages: number): void {
    if (messages.length <= maxMessages) return;

    const systemMessages = messages.filter((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');
    const firstUserMessage = nonSystemMessages.find((m) => m.role === 'user');
    const recentMessages = nonSystemMessages.slice(
      -(maxMessages - systemMessages.length - 1),
    );

    messages.length = 0;
    messages.push(...systemMessages);
    if (firstUserMessage && !recentMessages.includes(firstUserMessage)) {
      messages.push(firstUserMessage);
    }
    messages.push(...recentMessages.filter((m) => m !== firstUserMessage));
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

  async provideFinalAnswer(
    messages: ChatMessage[],
    conversationId: string,
    server: Server,
    userMessageId: string,
    sourceChunks: VectorSearchResult[] = [],
    overrideQuery?: string,
    userRole?: UserRole,
  ): Promise<void> {
    try {
      const plainTextMessages = this.convertToolMessagesToPlainText(messages);
      const recentUserQuestion = this.getMostRecentUserQuestion(messages);
      const promptVars: Record<string, unknown> = {
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
        prompt_vars: promptVars,
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

      const finalAssistantMessage = await this.messageService.createMessage(
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
      console.error('Error in provideFinalAnswer:', error);
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

  async regenerate(
    assistantMessageId: string,
    conversation: ConversationWithSources,
    server: Server,
  ): Promise<void> {
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

    // Re-execute using the concrete strategy's execute method
    // This will be implemented by each strategy class
    throw new InternalServerErrorException(
      'regenerate method must be implemented by concrete strategy class',
    );
  }
}
