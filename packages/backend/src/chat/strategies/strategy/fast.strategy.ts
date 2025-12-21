import { Message, Conversation } from '@prisma/client';
import { Server } from 'socket.io';
import { ToolDefinition } from 'src/chat/tools';
import { IAgentStrategy } from './agent.strategy';
import { HelperStrategy } from './helper.strategy';

export class FastStrategy extends HelperStrategy implements IAgentStrategy {
  async execute(
    userMessage: Message,
    conversation: Conversation,
    server: Server,
    tools: ToolDefinition[],
  ): Promise<void> {}
}
