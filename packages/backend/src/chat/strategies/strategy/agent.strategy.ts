import { Message, Conversation } from '@prisma/client';
import { Server } from 'socket.io';

export interface IAgentStrategy {
  execute(
    userMessage: Message,
    conversation: Conversation,
    server: Server,
  ): Promise<void>;
}
