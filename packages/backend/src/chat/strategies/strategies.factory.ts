import { Injectable, forwardRef, Inject } from '@nestjs/common';
import {
  IAgentStrategy,
  AgentStrategyServices,
} from './strategy/agent.strategy';
import { FastStrategy } from './strategy/fast.strategy';
import { LoopStrategy } from './strategy/loop.strategy';
import { AutoStrategy } from './strategy/auto.strategy';
import { PermissionsService } from 'src/auth/permissions.service';
import { ToolService } from '../tools';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageService } from '../message.service';
import { ConversationService } from '../conversation.service';
import { LLMService } from 'src/ai/llm.service';

export enum AgentMode {
  AUTO = 'AUTO',
  FAST = 'FAST',
  NORMAL = 'NORMAL',
  THOROUGH = 'THOROUGH',
}

@Injectable()
export class AgentFactory {
  private readonly services: AgentStrategyServices;

  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly toolService: ToolService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
    @Inject(forwardRef(() => ConversationService))
    private readonly conversationService: ConversationService,
    @Inject(forwardRef(() => LLMService))
    private readonly llmService: LLMService,
  ) {
    this.services = {
      prisma: this.prisma,
      messageService: this.messageService,
      conversationService: this.conversationService,
      llmService: this.llmService,
      toolService: this.toolService,
    };
  }

  async getStrategy(mode: AgentMode, userId: string): Promise<IAgentStrategy> {
    switch (mode) {
      case AgentMode.FAST:
        await this.permissionsService.authorizeFeatureUsage(
          userId,
          'CHAT_FAST_MESSAGES_DAILY',
        );
        return new FastStrategy(this.services);
      case AgentMode.THOROUGH:
        await this.permissionsService.authorizeFeatureUsage(
          userId,
          'CHAT_THOROUGH_MESSAGES_DAILY',
        );
        return new LoopStrategy(15, this.services);
      case AgentMode.AUTO:
        await this.permissionsService.authorizeFeatureUsage(
          userId,
          'CHAT_AUTO_MESSAGES_DAILY',
        );
        return new AutoStrategy(this.services);
      case AgentMode.NORMAL:
      default:
        await this.permissionsService.authorizeFeatureUsage(
          userId,
          'CHAT_NORMAL_MESSAGES_DAILY',
        );
        return new LoopStrategy(5, this.services);
    }
  }
}
