import { Message } from '@prisma/client';
import { Server } from 'socket.io';
import {
  IAgentStrategy,
  ConversationWithSources,
  AgentStrategyServices,
} from './agent.strategy';
import { HelperStrategy } from './helper.strategy';

export class AutoStrategy extends HelperStrategy implements IAgentStrategy {
  constructor(services: AgentStrategyServices) {
    super(services);
  }

  async execute(
    userMessage: Message,
    conversation: ConversationWithSources,
    server: Server,
  ): Promise<void> {}
}
