import { Message, Conversation } from '@prisma/client';
import { Server } from 'socket.io';
import { ToolDefinition } from '../tools';

export interface IAgentStrategy {
  execute(
    userMessage: Message,
    conversation: Conversation,
    server: Server,
    tools: ToolDefinition[],
  ): Promise<void>;
}
