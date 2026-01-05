import { Message } from '@prisma/client';
import { Server } from 'socket.io';
import { NotFoundException } from '@nestjs/common';
import {
  IAgentStrategy,
  ConversationWithSources,
  AgentStrategyServices,
} from './agent.strategy';
import { HelperStrategy } from './helper.strategy';
import { VectorSearchResult } from 'src/ai/reranking.service';
import { ChatMessage, ToolCall } from 'src/ai/llm.service';
import { sanitizeObject } from 'src/utils/text-sanitizer';

export class FastStrategy extends HelperStrategy implements IAgentStrategy {
  async execute(
    userMessage: Message,
    conversation: ConversationWithSources,
    server: Server,
  ): Promise<void> {
    const usedSourceChunks: VectorSearchResult[] = [];

    const hasSources = conversation.sources.length > 0;
    const metadata = (userMessage.metadata ?? {}) as Record<string, unknown>;
    const webSearchEnabled = metadata?.webSearchEnabled === true;
    const availableTools = this.getAvailableTools(hasSources, webSearchEnabled);

    const planningMessages: ChatMessage[] = [
      { role: 'user', content: userMessage.content ? userMessage.content : '' },
    ];

    const planResponse = await this.llmService.generateWithTools(
      planningMessages,
      availableTools,
      'planner_system',
    );

    const planMessage = planResponse.choices[0]?.message;
    const toolCalls = planMessage?.tool_calls || [];

    const llmMessages: ChatMessage[] = [
      { role: 'user', content: userMessage.content ? userMessage.content : '' },
    ];

    // Only add assistant message if it has tool_calls
    if (toolCalls.length > 0) {
      llmMessages.push({
        role: 'assistant',
        content: planMessage?.content ?? undefined,
        tool_calls: toolCalls as ToolCall[],
      });
    }

    if (toolCalls.length > 0) {
      const toolPromises = toolCalls.map(async (toolCall) => {
        const args =
          typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;
        HelperStrategy.emitToolProgress(
          toolCall.function.name,
          'Executing...',
          server,
          conversation.id,
        );

        try {
          const result = await this.toolService.executeTool(
            toolCall.function.name,
            args,
            {
              conversationId: conversation.id,
              userId: conversation.userId,
              embeddingModel:
                conversation.sources[0]?.library.defaultEmbeddingModel,
            },
          );

          const resultWithResults = result as Record<string, unknown>;
          if (
            toolCall.function.name === 'search_documents' &&
            resultWithResults.results
          ) {
            usedSourceChunks.push(
              ...(resultWithResults.results as VectorSearchResult[]),
            );
          }

          return {
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(sanitizeObject(result)),
          };
        } catch (e) {
          return {
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify({ error: e.message }),
          };
        }
      });

      const toolResults = await Promise.all(toolPromises);

      llmMessages.push(
        ...(toolResults as Array<{
          tool_call_id: string;
          role: 'tool';
          content: string;
        }>),
      );
    }

    await this.provideFinalAnswer(
      llmMessages,
      conversation.id,
      server,
      userMessage.id,
      usedSourceChunks,
    );
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

    await this.execute(userMessage, conversation, server);
  }
}
