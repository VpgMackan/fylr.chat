import { Message, Conversation } from '@prisma/client';
import { Server } from 'socket.io';
import { IAgentStrategy } from './agent.strategy';
import { HelperStrategy } from './helper.strategy';

export class LoopStrategy extends HelperStrategy implements IAgentStrategy {
  constructor(
    readonly iterations: number,
    readonly server: Server,
    readonly conversationId: string,
  ) {
    super(server, conversationId);
  }

  async execute(
    userMessage: Message,
    conversation: Conversation,
    server: Server,
  ): Promise<void> {}
}
