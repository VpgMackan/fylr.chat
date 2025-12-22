import { Message, Conversation, Prisma } from '@prisma/client';
import { Server } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageService } from 'src/chat/message.service';
import { ConversationService } from 'src/chat/conversation.service';
import { LLMService } from 'src/ai/llm.service';
import { ToolService } from 'src/chat/tools';

export type ConversationWithSources = Conversation & {
  sources: Prisma.SourceGetPayload<{
    include: { library: { select: { defaultEmbeddingModel: true } } };
  }>[];
};

export interface AgentStrategyServices {
  prisma: PrismaService;
  messageService: MessageService;
  conversationService: ConversationService;
  llmService: LLMService;
  toolService: ToolService;
}

export interface IAgentStrategy {
  execute(
    userMessage: Message,
    conversation: ConversationWithSources,
    server: Server,
  ): Promise<void>;
}
