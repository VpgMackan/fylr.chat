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
import { SourceService } from 'src/source/source.service';
import { ToolService } from './tools/tool.service';
import { sanitizeMessage, sanitizeText } from 'src/utils/text-sanitizer';

import { tools as specialTools } from './tool';

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    private readonly llmService: LLMService,
    private readonly vectorService: AiVectorService,
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

    emitStatus('searchQuery', 'Formulating search query...');
    const hypotheticalAnswer = await this.llmService.generate({
      prompt_type: 'hyde',
      prompt_vars: { chatHistory, userQuery },
    });

    emitStatus('retrieval', 'Searching relevant sources...');
    const searchQueryEmbedding =
      await this.vectorService.search(hypotheticalAnswer);

    const sourceIds = conversation.sources.map((s) => s.id);
    const relevantChunks =
      sourceIds.length > 0
        ? await this.sourceService.findByVector(searchQueryEmbedding, sourceIds)
        : [];

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

    emitStatus('generation', 'Generating response...');

    const stream = this.llmService.generateStream({
      prompt_type: 'final_rag',
      prompt_version: 'v1',
      prompt_vars: { context, chatHistory, userQuery, sourceReferenceList },
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
          metadata: {
            relatedSources: relevantChunks.map((c) => ({
              id: c.id,
              sourceId: c.source.id,
              libraryId: c.source.libraryId,
              name: c.source.name,
              chunkIndex: c.chunkIndex,
            })),
          },
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

    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        throw new NotFoundException(
          `Conversation with ID "${conversationId}" not found.`,
        );
      }

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
                  },
                );
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(result),
                  success: true,
                };
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : 'Unknown error';
                console.error(
                  `Tool execution error for ${toolCall.function.name}:`,
                  error,
                );
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({
                    error: true,
                    message: `Error executing ${toolCall.function.name}: ${errorMessage}`,
                  }),
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
              },
              conversationId,
            );
            llmMessages.push({ role: 'tool', ...result, tool_calls: null });
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
   * Builds context messages from database messages, keeping most recent within limit
   */
  private buildContextMessages(messages: any[], maxMessages: number): any[] {
    // Always include user messages and their immediate assistant responses
    // Prioritize recent messages
    const contextMessages = messages
      .map((m) => ({
        role: m.role,
        content: m.content,
        tool_calls: m.toolCalls,
      }))
      .filter((m) => m.content || m.tool_calls); // Filter out empty messages

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
    overrideQuery?: string,
  ) {
    try {
      const promptVars: { messages: any[]; overrideQuery?: string } = {
        messages,
      };
      if (overrideQuery) {
        promptVars.overrideQuery = overrideQuery;
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

      const finalAssistantMessage = await this.createMessage(
        { role: 'assistant', content: fullResponse },
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

    await this.prisma.message.delete({
      where: {
        id: assistantMessageId,
      },
    });

    await this.generateAndStreamAiResponse(userMessage, server);
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
      await this.getMessage(id);
      return await this.prisma.message.delete({ where: { id } });
    } catch (error) {
      throw new InternalServerErrorException(`Failed to delete message ${id}`);
    }
  }
}
