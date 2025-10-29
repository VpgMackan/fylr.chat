import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Server } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';

import { CreateMessageDto, UpdateMessageDto } from '@fylr/types';

import { LLMService } from 'src/ai/llm.service';
import { AiVectorService } from 'src/ai/vector.service';
import { RerankingService } from 'src/ai/reranking.service';
import { SourceService } from 'src/source/source.service';
import { ToolService } from './tools/tool.service';
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

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    private readonly llmService: LLMService,
    private readonly vectorService: AiVectorService,
    private readonly rerankingService: RerankingService,
    private sourceService: SourceService,
    private readonly toolService: ToolService,
  ) {}

  async getMessages(conversationId: string) {
    try {
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });
      return messages.map((msg) => sanitizeMessage(msg));
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve messages for conversation ${conversationId}`,
      );
    }
  }

  async getMessagesWithThoughts(conversationId: string) {
    try {
      const allMessages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });

      // Group messages: user messages, assistant messages with content, and attach thoughts
      const displayMessages: any[] = [];
      const thoughtBuffer: any[] = [];

      for (const msg of allMessages) {
        const sanitizedMsg = sanitizeMessage(msg);

        if (msg.role === 'user') {
          displayMessages.push(sanitizedMsg);
        } else if (msg.role === 'assistant') {
          if (msg.content) {
            // This is a final response - attach buffered thoughts
            displayMessages.push({
              ...sanitizedMsg,
              agentThoughts:
                thoughtBuffer.length > 0 ? [...thoughtBuffer] : undefined,
            });
            thoughtBuffer.length = 0; // Clear buffer
          } else if (msg.reasoning || msg.toolCalls) {
            // This is an agent thought - buffer it
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

  async createMessage(body: CreateMessageDto, conversationId: string) {
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

    return sanitizeMessage(message);
  }

  /**
   * Generates multiple query variations for improved retrieval coverage.
   * Uses the multi_query prompt to create 3-5 different phrasings of the same query.
   */
  private async generateQueryVariations(
    originalQuery: string,
  ): Promise<string[]> {
    try {
      const response = await this.llmService.generate({
        prompt_type: 'multi_query',
        prompt_vars: { query: originalQuery },
      });

      // Parse the response - expect one query per line
      const variations = response
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.match(/^[0-9]+\.|^[-*•]/)) // Remove numbering/bullets
        .slice(0, 5); // Max 5 variations

      console.log(
        `[RAG Pipeline] Generated ${variations.length} query variations for: "${originalQuery}"`,
      );
      return variations.length > 0 ? variations : [originalQuery];
    } catch (error) {
      console.error(
        '[RAG Pipeline] Failed to generate query variations:',
        error,
      );
      // Fallback to original query on error
      return [originalQuery];
    }
  }

  /**
   * Performs multi-query retrieval: searches with multiple query variations and combines results.
   */
  private async multiQueryRetrieval(
    queries: string[],
    sourceIds: string[],
    limit: number = 25,
  ): Promise<any[]> {
    console.log(
      `[RAG Pipeline] Performing multi-query retrieval with ${queries.length} queries`,
    );

    // Search with each query variation
    const allResults = await Promise.all(
      queries.map(async (query) => {
        const embedding = await this.vectorService.search(query);
        return this.sourceService.findByVector(
          embedding,
          sourceIds,
          Math.ceil(limit / queries.length), // Distribute limit across queries
        );
      }),
    );

    // Combine and deduplicate results by ID
    const resultsMap = new Map();
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
    userMessage,
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
      include: { sources: true },
    });
    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID "${conversationId}" not found.`,
      );
    }

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
    let relevantChunks: any[] = [];

    // Only do vector search if sources are available
    if (sourceIds.length > 0) {
      emitStatus('searchQuery', 'Formulating search queries...');

      // Generate hypothetical answer using HyDE
      const hypotheticalAnswer = await this.llmService.generate({
        prompt_type: 'hyde',
        prompt_vars: { chatHistory, userQuery },
      });

      // Generate query variations for multi-query retrieval
      const queryVariations = await this.generateQueryVariations(userQuery);

      emitStatus('retrieval', 'Searching with multiple query perspectives...');

      // Combine HyDE with query variations for comprehensive retrieval
      const allQueries = [hypotheticalAnswer, ...queryVariations];
      const vectorResults = await this.multiQueryRetrieval(
        allQueries,
        sourceIds,
        25,
      );

      // Apply reranking if we have results
      if (vectorResults.length > 0) {
        try {
          emitStatus('reranking', 'Re-ranking results for relevance...');
          relevantChunks = await this.rerankingService.rerankVectorResults(
            userQuery, // Use the actual user query for reranking
            vectorResults,
            5,
          );
        } catch (rerankError) {
          console.error('Reranking failed, using vector results:', rerankError);
          relevantChunks = vectorResults.slice(0, 5);
        }
      } else {
        console.log(
          '[RAG Pipeline] No results found with multi-query retrieval',
        );
      }
    }

    emitStatus('generation', 'Generating response...');

    let stream: AsyncGenerator<string>;

    // Build message history for synthesis
    const messages = recentMessages.map((m) => ({
      role: m.role,
      content: m.content || '',
    }));

    // Prepare prompt variables - synthesis handles both RAG and conversational modes
    const promptVars: any = {
      messages,
      userQuestion: userQuery,
    };

    // If we have relevant chunks, add RAG-specific context
    if (relevantChunks.length > 0) {
      const sourceReferenceList = relevantChunks.map((chunk, index) => ({
        number: index + 1,
        name: chunk.source.name,
        chunkIndex: chunk.chunkIndex,
      }));

      const context = relevantChunks
        .map((chunk, index) => {
          return `Content from Source Chunk [${index + 1}] (${
            chunk.source.name
          }):\n${chunk.content}`;
        })
        .join('\n\n---\n\n');

      promptVars.context = context;
      promptVars.sourceReferenceList = sourceReferenceList;
    }

    // Use synthesis for both conversational and RAG modes
    stream = this.llmService.generateStream({
      prompt_type: 'synthesis',
      prompt_version: 'v1',
      prompt_vars: promptVars,
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
      const assistantMessage = await this.createMessage(
        {
          role: 'assistant',
          content: fullResponse,
          metadata:
            relevantChunks.length > 0
              ? {
                  relatedSources: relevantChunks.map((c) => ({
                    id: c.id,
                    sourceId: c.source.id,
                    libraryId: c.source.libraryId,
                    name: c.source.name,
                    chunkIndex: c.chunkIndex,
                  })),
                }
              : {},
        },
        conversationId,
      );
      server.to(conversationId).emit('conversationAction', {
        action: 'messageEnd',
        conversationId,
        data: assistantMessage,
      });
    } else {
      // Handle no response
    }
  }

  async generateAndStreamAiResponseWithTools(
    userMessage: any,
    server: Server,
  ): Promise<void> {
    const { conversationId } = userMessage;
    const MAX_ITERATIONS = 5;
    const MAX_CONTEXT_MESSAGES = 50; // Limit context size to prevent overflow
    let currentIteration = 0;
    const usedSourceChunks: any[] = []; // Track all source chunks used

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
        },
      });
      if (!conversation) {
        throw new NotFoundException(
          `Conversation with ID "${conversationId}" not found.`,
        );
      }

      const embeddingModel =
        conversation.sources.length > 0
          ? conversation.sources[0].library.defaultEmbeddingModel
          : undefined;

      // Create and emit initial thought, linking it to the user message
      const initialThought = await this.createMessage(
        {
          role: 'assistant',
          reasoning: 'Processing your request...',
          parentMessageId: userMessage.id,
        },
        conversationId,
      );

      // Emit the initial thought to all clients in the room
      server.to(conversationId).emit('conversationAction', {
        action: 'agentThought',
        conversationId,
        data: initialThought,
      });

      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });

      // Build initial context with smart pruning
      const llmMessages = this.buildContextMessages(
        messages,
        MAX_CONTEXT_MESSAGES,
      );

      while (currentIteration < MAX_ITERATIONS) {
        currentIteration++;

        try {
          const llmResponse = await this.llmService.generateWithTools(
            llmMessages,
            [...this.toolService.getAllToolDefinitions(), ...specialTools],
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

          // Add assistant response to context
          llmMessages.push({
            role: responseMessage.role,
            content: responseMessage.content,
            tool_calls: responseMessage.tool_calls,
          });

          if (
            !responseMessage.tool_calls ||
            responseMessage.tool_calls.length === 0
          ) {
            // No more tool calls, synthesize final answer
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
            );
            return;
          }

          // Execute tools in parallel with individual error handling
          const toolResults = await Promise.all(
            responseMessage.tool_calls.map(async (toolCall) => {
              try {
                const parsedArgs = JSON.parse(toolCall.function.arguments);
                const result = await this.toolService.executeTool(
                  toolCall.function.name,
                  parsedArgs,
                  {
                    conversationId,
                    userId: conversation.userId,
                    embeddingModel: embeddingModel || '',
                  },
                );

                // Track source chunks from search_documents tool
                if (
                  toolCall.function.name === 'search_documents' &&
                  result.results &&
                  Array.isArray(result.results)
                ) {
                  usedSourceChunks.push(...result.results);

                  // Check for empty results and provide guidance
                  if (result.results.length === 0) {
                    const emptyResultError = createEmptyResultResponse(
                      toolCall.function.name,
                      parsedArgs.query || 'query',
                    );

                    return {
                      tool_call_id: toolCall.id,
                      content: JSON.stringify(emptyResultError),
                      success: false,
                    };
                  }
                }

                // Check for empty results from web_search
                if (
                  toolCall.function.name === 'web_search' &&
                  result.results &&
                  Array.isArray(result.results) &&
                  result.results.length === 0
                ) {
                  const emptyResultError = createEmptyResultResponse(
                    toolCall.function.name,
                    parsedArgs.query || 'query',
                  );

                  return {
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(emptyResultError),
                    success: false,
                  };
                }

                // Check for failed webpage fetches
                if (
                  toolCall.function.name === 'fetch_webpage' &&
                  result.success === false
                ) {
                  const emptyResultError = createEmptyResultResponse(
                    toolCall.function.name,
                    parsedArgs.url || 'URL',
                  );

                  return {
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(emptyResultError),
                    success: false,
                  };
                }

                // Sanitize the result to remove problematic Unicode characters
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

                // Create structured error with self-correction guidance
                const structuredError = createStructuredError(
                  error,
                  toolCall.function.name,
                );

                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(structuredError),
                  success: false,
                };
              }
            }),
          );

          // Save tool results and add to context
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

          // Prune context if it's getting too large
          if (llmMessages.length > MAX_CONTEXT_MESSAGES) {
            this.pruneContextMessages(llmMessages, MAX_CONTEXT_MESSAGES);
          }
        } catch (iterationError) {
          console.error(
            `Error in iteration ${currentIteration}:`,
            iterationError,
          );
          // Emit error status to client
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

      // If we exit the loop without calling provide_final_answer, synthesize anyway
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
      );
    } catch (error) {
      console.error('Error in generateAndStreamAiResponseWithTools:', error);
      // Emit error to client
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

  /**
   * Converts tool-calling conversation history into plain text messages
   * for models that don't support tool calling (e.g., for synthesis)
   */
  private convertToolMessagesToPlainText(messages: any[]): any[] {
    const plainTextMessages: any[] = [];

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
            .map((tc: any) => {
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
          plainTextMessages.push({
            role: 'assistant',
            content,
          });
        }
      } else if (msg.role === 'tool') {
        let toolContent = msg.content || '';

        try {
          const parsed = JSON.parse(toolContent);
          if (parsed.error) {
            toolContent = `Tool error: ${parsed.message || 'Unknown error'}`;
          } else {
            toolContent = `Tool result: ${JSON.stringify(parsed, null, 2)}`;
          }
        } catch {
          toolContent = `Tool result: ${toolContent}`;
        }

        plainTextMessages.push({
          role: 'assistant',
          content: toolContent,
        });
      }
    }

    return plainTextMessages;
  }

  /**
   * Extracts the most recent user question from the conversation history
   */
  private getMostRecentUserQuestion(messages: any[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user' && messages[i].content) {
        return messages[i].content;
      }
    }
    return '';
  }

  /**
   * Builds context messages from database messages, keeping most recent within limit
   */
  private buildContextMessages(messages: any[], maxMessages: number): any[] {
    // Always include user messages and their immediate assistant responses
    // Prioritize recent messages
    const contextMessages = messages
      .map((m) => {
        const msg: any = {
          role: m.role,
          content: m.content,
        };

        // Add tool_calls for assistant messages
        if (m.toolCalls) {
          msg.tool_calls = m.toolCalls;
        }

        // Add tool_call_id for tool messages
        if (m.role === 'tool' && m.toolCallId) {
          msg.tool_call_id = m.toolCallId;
        }

        return msg;
      })
      .filter((m) => {
        // Keep messages that have content, tool_calls, or are tool responses
        return m.content || m.tool_calls || m.role === 'tool';
      });

    // If within limit, return all
    if (contextMessages.length <= maxMessages) {
      return contextMessages;
    }

    // Otherwise, keep first message (usually user's original question) and most recent messages
    const firstMessage = contextMessages[0];
    const recentMessages = contextMessages.slice(-(maxMessages - 1));

    return [firstMessage, ...recentMessages];
  }

  /**
   * Prunes context messages to stay within limits while preserving conversation flow
   */
  private pruneContextMessages(messages: any[], maxMessages: number): void {
    if (messages.length <= maxMessages) {
      return;
    }

    // Keep system messages, first user message, and recent messages
    const systemMessages = messages.filter((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const firstUserMessage = nonSystemMessages.find((m) => m.role === 'user');
    const recentMessages = nonSystemMessages.slice(
      -(maxMessages - systemMessages.length - 1),
    );

    // Rebuild the array in place
    messages.length = 0;
    messages.push(...systemMessages);
    if (firstUserMessage && !recentMessages.includes(firstUserMessage)) {
      messages.push(firstUserMessage);
    }
    messages.push(...recentMessages.filter((m) => m !== firstUserMessage));
  }

  private async synthesizeAndStreamFinalAnswer(
    messages: any[],
    conversationId: string,
    server: Server,
    userMessageId: string,
    sourceChunks: any[] = [],
    overrideQuery?: string,
  ) {
    try {
      const plainTextMessages = this.convertToolMessagesToPlainText(messages);

      // Get the most recent user question to ensure synthesis focuses on it
      const recentUserQuestion = this.getMostRecentUserQuestion(messages);

      const promptVars: {
        messages: any[];
        overrideQuery?: string;
        userQuestion?: string;
      } = {
        messages: plainTextMessages,
      };

      if (overrideQuery) {
        promptVars.overrideQuery = overrideQuery;
      } else if (recentUserQuestion) {
        // Include the recent user question to help focus the synthesis
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

          // Skip empty chunks to avoid issues with first chunk
          if (!sanitizedChunk) {
            continue;
          }

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

      // Deduplicate source chunks and prepare metadata
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
                }
              : {},
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
    const assistantMessage = await this.prisma.message.findUnique({
      where: { id: assistantMessageId },
    });
    if (!assistantMessage || assistantMessage.role !== 'assistant') {
      throw new NotFoundException('Assistant message to regenerate not found.');
    }

    const userMessage = await this.prisma.message.findFirst({
      where: {
        conversationId: assistantMessage.conversationId,
        createdAt: { lt: assistantMessage.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!userMessage || userMessage.role !== 'user') {
      throw new NotFoundException(
        'Could not find the original user prompt for regeneration.',
      );
    }

    // Delete the assistant message
    await this.prisma.message.delete({
      where: {
        id: assistantMessageId,
      },
    });

    // Also delete any agent thought messages between the user message and assistant message
    await this.prisma.message.deleteMany({
      where: {
        conversationId: assistantMessage.conversationId,
        createdAt: {
          gt: userMessage.createdAt,
          lt: assistantMessage.createdAt,
        },
        role: 'assistant',
        content: null, // Agent thoughts have null content
      },
    });

    // Determine which mode to use based on the user message metadata
    const agenticMode = userMessage.metadata?.['agenticMode'] !== false; // Default to true

    if (agenticMode) {
      await this.generateAndStreamAiResponseWithTools(userMessage, server);
    } else {
      await this.generateAndStreamAiResponse(userMessage, server);
    }
  }

  async getMessage(id: string) {
    try {
      const message = await this.prisma.message.findUnique({
        where: { id },
      });
      return message ? sanitizeMessage(message) : message;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve message ${id}`,
      );
    }
  }

  async updateMessage(body: UpdateMessageDto, id: string) {
    try {
      await this.getMessage(id);
      const message = await this.prisma.message.update({
        where: { id },
        data: body,
      });
      return sanitizeMessage(message);
    } catch (error) {
      throw new InternalServerErrorException(`Failed to update message ${id}`);
    }
  }

  async deleteMessage(id: string) {
    try {
      const message = await this.getMessage(id);
      if (!message) {
        throw new NotFoundException(`Message ${id} not found`);
      }

      // If deleting a user message, also delete all child messages (thoughts, tool calls, and assistant responses)
      if (message.role === 'user') {
        await this.prisma.message.deleteMany({
          where: {
            parentMessageId: id,
          },
        });
      }

      // Delete the message itself
      return await this.prisma.message.delete({ where: { id } });
    } catch (error) {
      throw new InternalServerErrorException(`Failed to delete message ${id}`);
    }
  }
}
