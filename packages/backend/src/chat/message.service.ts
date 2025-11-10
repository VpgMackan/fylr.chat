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

import { LLMService } from 'src/ai/llm.service';
import { AiVectorService } from 'src/ai/vector.service';
import { RerankingService } from 'src/ai/reranking.service';
import { SourceService } from 'src/source/source.service';
import { ToolService } from './tools/tool.service';
import { PermissionsService } from 'src/auth/permissions.service';
import {
  sanitizeMessage,
  sanitizeText,
  sanitizeObject,
} from 'src/utils/text-sanitizer';
import {
  createStructuredError,
  createEmptyResultResponse,
} from './tools/error-handler';

import { tools as specialTools } from './tool';
import { ToolDefinition } from './tools/base.tool';

interface VectorSearchResult {
  id: string;
  fileId: string;
  content: string;
  chunkIndex: number;
  source: {
    id: string;
    libraryId: string;
    name: string;
  };
  relevanceScore?: number;
}

interface MessageWithThoughts extends MessageApiResponse {
  agentThoughts?: MessageApiResponse[];
}

interface LLMToolCallFunction {
  name: string;
  arguments: string;
}

interface LLMToolCall {
  id: string;
  type: 'function';
  function: LLMToolCallFunction;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string | null;
  tool_calls?: LLMToolCall[];
  tool_call_id?: string;
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
  ): Promise<MessageApiResponse> {
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

    return sanitizeMessage(message) as MessageApiResponse;
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

  async generateAndStreamAiResponse(
    userMessage: PrismaMessage,
    server: Server,
  ): Promise<void> {
    const { conversationId, content: userQuery } = userMessage;

    const emitStatus = (stage: string, message: string) => {
      server.to(conversationId).emit('conversationAction', {
        action: 'statusUpdate',
        conversationId,
        data: { stage, message },
      });
    };

    emitStatus('history', 'Analyzing conversation history...');
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { sources: true, user: { select: { role: true, id: true } } },
    });
    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID "${conversationId}" not found.`,
      );
    }

    await this.permissionsService.authorizeFeatureUsage(
      conversation.user.id,
      'CHAT_MESSAGES_DAILY',
    );

    const recentMessages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const chatHistory = recentMessages
      .reverse()
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const sourceIds = conversation.sources.map((s) => s.id);
    let relevantChunks: VectorSearchResult[] = [];

    if (sourceIds.length > 0) {
      emitStatus('searchQuery', 'Formulating search queries...');
      const hypotheticalAnswer = await this.llmService.generate({
        prompt_type: 'hyde',
        prompt_vars: { chatHistory, userQuery },
      });
      const queryVariations = await this.generateQueryVariations(
        userQuery as string,
      );
      emitStatus('retrieval', 'Searching with multiple query perspectives...');
      const allQueries = [hypotheticalAnswer, ...queryVariations];
      const vectorResults = await this.multiQueryRetrieval(
        allQueries,
        sourceIds,
        25,
      );

      if (vectorResults.length > 0 && conversation.user.role === UserRole.PRO) {
        try {
          emitStatus(
            'reranking',
            'Re-ranking results with AI for optimal relevance... ✨',
          );
          relevantChunks = await this.rerankingService.rerankVectorResults(
            userQuery as string,
            vectorResults,
            5,
          );
        } catch (rerankError) {
          console.error('Reranking failed, using vector results:', rerankError);
          relevantChunks = vectorResults.slice(0, 5);
        }
      } else {
        emitStatus('retrieval', 'Retrieving relevant documents...');
        relevantChunks = vectorResults.slice(0, 5);
        if (conversation.user.role === UserRole.PRO) {
          console.log(
            '[RAG Pipeline] No results found with multi-query retrieval',
          );
        }
      }
    }

    emitStatus('generation', 'Generating response...');

    const messages = recentMessages.map((m) => ({
      role: m.role,
      content: m.content || '',
    }));

    const promptVars: Partial<SynthesisPromptVars> = {
      messages,
      userQuestion: userQuery as string,
    };

    if (relevantChunks.length > 0) {
      promptVars.sourceReferenceList = relevantChunks.map((chunk, index) => ({
        number: index + 1,
        name: chunk.source.name,
        chunkIndex: chunk.chunkIndex,
      }));
      promptVars.context = relevantChunks
        .map(
          (chunk, index) =>
            `Content from Source Chunk [${index + 1}] (${chunk.source.name}):\n${chunk.content}`,
        )
        .join('\n\n---\n\n');
    }

    const stream = this.llmService.generateStream({
      prompt_type: 'synthesis',
      prompt_version: 'v1',
      prompt_vars: promptVars as Record<string, unknown>,
    });
    let fullResponse = '';
    let chunkIndex = 0;
    const streamId = `stream-${conversationId}-${Date.now()}`;

    for await (const chunk of stream) {
      const sanitizedChunk = sanitizeText(chunk) || '';
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

    if (fullResponse) {
      const metadata = {
        relatedSources: relevantChunks.map((c) => ({
          id: c.id,
          sourceId: c.source.id,
          libraryId: c.source.libraryId,
          name: c.source.name,
          chunkIndex: c.chunkIndex,
        })),
        rerankingUsed: conversation.user.role === UserRole.PRO,
        userRole: conversation.user.role,
      };

      const assistantMessage = await this.createMessage(
        { role: 'assistant', content: fullResponse, metadata },
        conversationId,
      );
      server.to(conversationId).emit('conversationAction', {
        action: 'messageEnd',
        conversationId,
        data: assistantMessage,
      });
    }
  }

  async generateAndStreamAiResponseWithTools(
    userMessage: PrismaMessage,
    server: Server,
  ): Promise<void> {
    const { conversationId } = userMessage;
    const MAX_ITERATIONS = 5;
    const MAX_CONTEXT_MESSAGES = 50;
    let currentIteration = 0;
    const usedSourceChunks: VectorSearchResult[] = [];

    const emitToolProgress = (toolName: string, message: string) => {
      server.to(conversationId).emit('conversationAction', {
        action: 'toolProgress',
        conversationId,
        data: { toolName, message },
      });
    };

    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          sources: {
            select: {
              id: true,
              library: { select: { defaultEmbeddingModel: true } },
            },
          },
          user: { select: { id: true, role: true } },
        },
      });
      if (!conversation) {
        throw new NotFoundException(
          `Conversation with ID "${conversationId}" not found.`,
        );
      }

      await this.permissionsService.authorizeFeatureUsage(
        conversation.user.id,
        'CHAT_AGENTIC_MESSAGES_DAILY',
      );

      const embeddingModel =
        conversation.sources.length > 0
          ? conversation.sources[0].library.defaultEmbeddingModel
          : undefined;

      const hasSources = conversation.sources.length > 0;
      const userMetadata = userMessage.metadata as ConversationMetadata;
      const conversationMetadata =
        conversation.metadata as ConversationMetadata;
      const webSearchEnabled =
        userMetadata?.webSearchEnabled === true ||
        conversationMetadata?.webSearchEnabled === true;

      const availableTools = this.getAvailableTools(
        hasSources,
        webSearchEnabled,
      );

      if (availableTools.length === 0) {
        this.logger.log(
          `No tools available for conversation ${conversationId}, falling back to RAG mode`,
        );
        return this.generateAndStreamAiResponse(userMessage, server);
      }

      const initialThought = await this.createMessage(
        {
          role: 'assistant',
          reasoning: 'Processing your request...',
          parentMessageId: userMessage.id,
        },
        conversationId,
      );
      server.to(conversationId).emit('conversationAction', {
        action: 'agentThought',
        conversationId,
        data: initialThought,
      });

      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });

      const llmMessages: ChatMessage[] = this.buildContextMessages(
        messages,
        MAX_CONTEXT_MESSAGES,
      );

      while (currentIteration < MAX_ITERATIONS) {
        currentIteration++;
        try {
          const llmResponse = await this.llmService.generateWithTools(
            llmMessages,
            availableTools,
          );

          const responseMessage = llmResponse.choices[0]?.message;
          if (!responseMessage) {
            throw new InternalServerErrorException(
              'LLM returned empty response',
            );
          }

          const thoughtMessage = await this.createMessage(
            {
              role: 'assistant',
              reasoning: responseMessage.content,
              toolCalls: responseMessage.tool_calls,
              parentMessageId: userMessage.id,
            },
            conversationId,
          );
          server.to(conversationId).emit('conversationAction', {
            action: 'agentThought',
            conversationId,
            data: thoughtMessage,
          });

          llmMessages.push({
            role: 'assistant',
            content: responseMessage.content,
            tool_calls: responseMessage.tool_calls as LLMToolCall[],
          });

          if (
            !responseMessage.tool_calls ||
            responseMessage.tool_calls.length === 0
          ) {
            break;
          }

          const finalAnswerCall = responseMessage.tool_calls.find(
            (tc) => tc.function.name === 'provide_final_answer',
          );
          if (finalAnswerCall) {
            await this.synthesizeAndStreamFinalAnswer(
              llmMessages,
              conversationId,
              server,
              userMessage.id,
              usedSourceChunks,
              undefined,
              conversation.user.role,
            );
            return;
          }

          const toolResults = await Promise.all(
            responseMessage.tool_calls.map(async (toolCall) => {
              try {
                const parsedArgs = JSON.parse(
                  toolCall.function.arguments,
                ) as Record<string, unknown>;
                const toolName = toolCall.function.name;

                emitToolProgress(toolName, `Executing ${toolName}...`);
                const result = (await this.toolService.executeTool(
                  toolName,
                  parsedArgs,
                  {
                    conversationId,
                    userId: conversation.userId,
                    embeddingModel: embeddingModel || '',
                  },
                )) as {
                  results?: unknown[];
                  success?: boolean;
                  query?: string;
                  url?: string;
                };

                if (
                  toolName === 'search_documents' &&
                  result.results &&
                  Array.isArray(result.results)
                ) {
                  usedSourceChunks.push(
                    ...(result.results as VectorSearchResult[]),
                  );
                  if (result.results.length === 0) {
                    return {
                      tool_call_id: toolCall.id,
                      content: JSON.stringify(
                        createEmptyResultResponse(
                          toolName,
                          (parsedArgs.query as string) || 'query',
                        ),
                      ),
                      success: false,
                    };
                  }
                }

                if (
                  toolName === 'web_search' &&
                  result.results &&
                  Array.isArray(result.results) &&
                  result.results.length === 0
                ) {
                  return {
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(
                      createEmptyResultResponse(
                        toolName,
                        (parsedArgs.query as string) || 'query',
                      ),
                    ),
                    success: false,
                  };
                }

                if (toolName === 'fetch_webpage' && result.success === false) {
                  return {
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(
                      createEmptyResultResponse(
                        toolName,
                        (parsedArgs.url as string) || 'URL',
                      ),
                    ),
                    success: false,
                  };
                }

                const sanitizedResult = sanitizeObject(result);
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(sanitizedResult),
                  success: true,
                };
              } catch (error) {
                console.error(
                  `Tool execution error for ${toolCall.function.name}:`,
                  error,
                );
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(
                    createStructuredError(error, toolCall.function.name),
                  ),
                  success: false,
                };
              }
            }),
          );

          for (const result of toolResults) {
            await this.createMessage(
              {
                role: 'tool',
                toolCallId: result.tool_call_id,
                content: result.content,
                parentMessageId: userMessage.id,
              },
              conversationId,
            );
            llmMessages.push({
              role: 'tool',
              tool_call_id: result.tool_call_id,
              content: result.content,
            });
          }

          if (llmMessages.length > MAX_CONTEXT_MESSAGES) {
            this.pruneContextMessages(llmMessages, MAX_CONTEXT_MESSAGES);
          }
        } catch (iterationError) {
          console.error(
            `Error in iteration ${currentIteration}:`,
            iterationError,
          );
          server.to(conversationId).emit('conversationAction', {
            action: 'streamError',
            conversationId,
            data: {
              message: `Error during processing: ${iterationError instanceof Error ? iterationError.message : 'Unknown error'}`,
            },
          });
          throw iterationError;
        }
      }

      if (currentIteration >= MAX_ITERATIONS) {
        console.warn(
          `Reached max iterations (${MAX_ITERATIONS}) for conversation ${conversationId}`,
        );
      }

      await this.synthesizeAndStreamFinalAnswer(
        llmMessages,
        conversationId,
        server,
        userMessage.id,
        usedSourceChunks,
        currentIteration >= MAX_ITERATIONS
          ? "I've completed my research but reached the maximum number of steps. Here's what I found:"
          : "Here's a summary of my findings:",
        conversation.user.role,
      );
    } catch (error) {
      console.error('Error in generateAndStreamAiResponseWithTools:', error);
      server.to(conversationId).emit('conversationAction', {
        action: 'streamError',
        conversationId,
        data: {
          message:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred during processing',
        },
      });
      throw error;
    }
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
            .map((tc: LLMToolCall) => {
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

  private getAvailableTools(
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

  private buildContextMessages(
    messages: PrismaMessage[],
    maxMessages: number,
  ): ChatMessage[] {
    const contextMessages: ChatMessage[] = messages
      .map((m) => {
        const msg: ChatMessage = {
          role: m.role as ChatMessage['role'],
          content: m.content,
        };
        if (m.toolCalls) {
          msg.tool_calls = m.toolCalls as unknown as LLMToolCall[];
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

  private pruneContextMessages(
    messages: ChatMessage[],
    maxMessages: number,
  ): void {
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

    if (agenticMode) {
      await this.generateAndStreamAiResponseWithTools(userMessage, server);
    } else {
      await this.generateAndStreamAiResponse(userMessage, server);
    }
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
