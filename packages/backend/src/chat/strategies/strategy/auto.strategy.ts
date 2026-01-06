import { Message } from '@prisma/client';
import { Server } from 'socket.io';
import { NotFoundException } from '@nestjs/common';
import {
  IAgentStrategy,
  ConversationWithSources,
  AgentStrategyServices,
} from './agent.strategy';
import { HelperStrategy } from './helper.strategy';
import { FastStrategy } from './fast.strategy';
import { LoopStrategy } from './loop.strategy';

export class AutoStrategy extends HelperStrategy implements IAgentStrategy {
  constructor(readonly services: AgentStrategyServices) {
    super(services);
  }

  async execute(
    userMessage: Message,
    conversation: ConversationWithSources,
    server: Server,
  ): Promise<void> {
    const prompt = userMessage.content || '';
    const strategyType = await this.classifyQueryComplexity(prompt, conversation.userId);

    const thoughtMessage = await this.services.messageService.createMessage(
      {
        role: 'assistant',
        reasoning: `${strategyType} strategy selected based on LLM-powered semantic analysis.`,
        toolCalls: [],
        parentMessageId: userMessage.id,
      },
      conversation.id,
    );
    server.to(conversation.id).emit('conversationAction', {
      action: 'agentThought',
      conversationId: conversation.id,
      data: thoughtMessage,
    });

    let strategy: IAgentStrategy;
    if (strategyType === 'FAST') {
      strategy = new FastStrategy(this.services);
    } else if (strategyType === 'NORMAL') {
      strategy = new LoopStrategy(5, this.services);
    } else {
      strategy = new LoopStrategy(15, this.services);
    }

    await strategy.execute(userMessage, conversation, server);
  }

  private async classifyQueryComplexity(
    query: string,
    userId?: string,
  ): Promise<'FAST' | 'NORMAL' | 'THOROUGH'> {
    try {
      const response = await this.services.llmService.generate({
        prompt_type: 'strategy_router',
        prompt_version: 'v1',
        prompt_vars: {
          query,
        },
        ...(userId && { user_id: userId }),
      });

      const classification = response.trim().toUpperCase();

      if (['FAST', 'NORMAL', 'THOROUGH'].includes(classification)) {
        return classification as 'FAST' | 'NORMAL' | 'THOROUGH';
      }

      console.warn(
        `Unexpected LLM classification: "${response}". Defaulting to NORMAL.`,
      );
      return 'NORMAL';
    } catch (error) {
      console.error('Error classifying query complexity:', error);
      return 'NORMAL';
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

    await this.execute(userMessage, conversation, server);
  }
}
