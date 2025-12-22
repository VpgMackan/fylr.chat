import { Message } from '@prisma/client';
import { Server } from 'socket.io';
import {
  IAgentStrategy,
  ConversationWithSources,
  AgentStrategyServices,
} from './agent.strategy';
import { HelperStrategy } from './helper.strategy';
import { ToolService } from 'src/chat/tools';
import { VectorSearchResult } from 'src/ai/reranking.service';
import { ChatMessage, ToolCall } from 'src/ai/llm.service';
import { InternalServerErrorException } from '@nestjs/common';
import {
  createStructuredError,
  createEmptyResultResponse,
} from '../../tools/error-handler';
import {
  sanitizeMessage,
  sanitizeText,
  sanitizeObject,
} from 'src/utils/text-sanitizer';

interface ConversationMetadata {
  agenticMode?: string;
  webSearchEnabled?: boolean;
}

export class LoopStrategy extends HelperStrategy implements IAgentStrategy {
  protected logger: any;

  constructor(
    readonly iterations: number,
    services: AgentStrategyServices,
  ) {
    super(services);
  }

  async execute(
    userMessage: Message,
    conversation: ConversationWithSources,
    server: Server,
  ): Promise<void> {
    let currentIteration = 0;
    const MAX_CONTEXT_MESSAGES = 50;
    const usedSourceChunks: VectorSearchResult[] = [];

    try {
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
          `No tools available for conversation ${conversation.id}, falling back to RAG mode`,
        );
        return this.provideFinalAnswer();
      }

      const initialThought = await this.messageService.createMessage(
        {
          role: 'assistant',
          reasoning: 'Processing your request...',
          parentMessageId: userMessage.id,
        },
        conversation.id,
      );
      server.to(conversation.id).emit('conversationAction', {
        action: 'agentThought',
        conversationId: conversation.id,
        data: initialThought,
      });

      const messages = await this.prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
      });

      const llmMessages: ChatMessage[] = this.buildContextMessages(
        messages,
        MAX_CONTEXT_MESSAGES,
      );

      while (currentIteration < this.iterations) {
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

          const thoughtMessage = await this.messageService.createMessage(
            {
              role: 'assistant',
              reasoning: responseMessage.content,
              toolCalls: responseMessage.tool_calls,
              parentMessageId: userMessage.id,
            },
            conversation.id,
          );
          server.to(conversation.id).emit('conversationAction', {
            action: 'agentThought',
            conversationId: conversation.id,
            data: thoughtMessage,
          });
          llmMessages.push({
            role: 'assistant',
            content: responseMessage.content,
            tool_calls: responseMessage.tool_calls as ToolCall[],
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
            // TODO
            await this.provideFinalAnswer();
            return;
          }

          const toolResults = await Promise.all(
            responseMessage.tool_calls.map(async (toolCall) => {
              try {
                const parsedArgs = JSON.parse(
                  typeof toolCall.function.arguments === 'string'
                    ? toolCall.function.arguments
                    : JSON.stringify(toolCall.function.arguments),
                ) as Record<string, unknown>;
                const toolName = toolCall.function.name;

                this.emitToolProgress(
                  toolName,
                  `Executing ${toolName}...`,
                  server,
                  conversation.id,
                );
                const result = (await this.toolService.executeTool(
                  toolName,
                  parsedArgs,
                  {
                    conversationId: conversation.id,
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
            await this.messageService.createMessage(
              {
                role: 'tool',
                toolCallId: result.tool_call_id,
                content: result.content,
                parentMessageId: userMessage.id,
              },
              conversation.id,
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
          server.to(conversation.id).emit('conversationAction', {
            action: 'streamError',
            conversationId: conversation.id,
            data: {
              message: `Error during processing: ${iterationError instanceof Error ? iterationError.message : 'Unknown error'}`,
            },
          });
          throw iterationError;
        }

        if (currentIteration >= this.iterations) {
          console.warn(
            `Reached max iterations (${this.iterations}) for conversation ${conversation.id}`,
          );
        }

        await this.provideFinalAnswer();
      }
    } catch (error) {
      console.error('Error in generateAndStreamAiResponseWithTools:', error);
      server.to(conversation.id).emit('conversationAction', {
        action: 'streamError',
        conversationId: conversation.id,
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
}
