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
    const score = this.calculateComplexityScore(prompt);

    const thoughtMessage = await this.services.messageService.createMessage(
      {
        role: 'assistant',
        reasoning: `${
          score < 33 ? 'Fast' : score < 66 ? 'Normal' : 'Thorough'
        } strategy selected based on complexity score of ${score}.`,
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
    if (score < 33) {
      strategy = new FastStrategy(this.services);
    } else if (score < 66) {
      strategy = new LoopStrategy(5, this.services);
    } else {
      strategy = new LoopStrategy(15, this.services);
    }

    await strategy.execute(userMessage, conversation, server);
  }

  private calculateComplexityScore(prompt: string): number {
    const lowerPrompt = prompt.toLowerCase();

    // Length score: min(prompt_length / 2000 * 25, 25)
    const lengthScore = Math.min((prompt.length / 2000) * 25, 25);

    // Task type score
    const simpleKeywords = [
      'summarize',
      'short',
      'define',
      'rewrite',
      'convert',
      'explain',
    ];
    const complexKeywords = [
      'analyze',
      'design',
      'debug',
      'evaluate',
      'compare',
      'architect',
      'step-by-step',
      'algorithm',
      'simulate',
    ];

    let taskScore = 0;
    simpleKeywords.forEach((kw) => {
      if (lowerPrompt.includes(kw)) taskScore += 1;
    });
    complexKeywords.forEach((kw) => {
      if (lowerPrompt.includes(kw)) taskScore += 10;
    });
    taskScore = Math.min(taskScore, 25);

    let domainScore = 0;
    if (
      ['code', 'api', 'algorithm', 'programming'].some((kw) =>
        lowerPrompt.includes(kw),
      )
    ) {
      domainScore = 10;
    }
    if (
      ['math', 'legal', 'scientific', 'medical', 'reasoning'].some((kw) =>
        lowerPrompt.includes(kw),
      )
    ) {
      domainScore = 20;
    }

    let reasoningScore = 0;
    if (lowerPrompt.includes('step')) reasoningScore += 10;
    if ((lowerPrompt.match(/\?/g) || []).length > 2) reasoningScore += 10;
    if (lowerPrompt.split('\n').length > 3) reasoningScore += 10;
    if (
      ['why', 'how does', 'break down', 'trade offs'].some((kw) =>
        lowerPrompt.includes(kw),
      )
    )
      reasoningScore += 10;
    reasoningScore = Math.min(reasoningScore, 25);

    return Math.min(
      lengthScore + taskScore + domainScore + reasoningScore,
      100,
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
