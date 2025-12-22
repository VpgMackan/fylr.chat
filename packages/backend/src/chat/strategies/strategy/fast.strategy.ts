import { Message } from '@prisma/client';
import { Server } from 'socket.io';
import { ToolDefinition, ToolService } from 'src/chat/tools';
import {
  IAgentStrategy,
  ConversationWithSources,
  AgentStrategyServices,
} from './agent.strategy';
import { HelperStrategy } from './helper.strategy';

export class FastStrategy extends HelperStrategy implements IAgentStrategy {
  constructor(services: AgentStrategyServices) {
    super(services);
  }

  async execute(
    userMessage: Message,
    conversation: ConversationWithSources,
    server: Server,
  ): Promise<void> {}
}
