import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { Message as PrismaMessage } from '@prisma/client';
import { ChatMessage, LLMService, ToolCall } from 'src/ai/llm.service';
import { MessageService } from 'src/chat/message.service';
import { ToolService } from 'src/chat/tools';
import { MessageApiResponse } from '@fylr/types';

export interface AgentRunOptions {
  userMessage: PrismaMessage;
  conversation: {
    id: string;
    userId: string;
  };
  server: Server;
}

@Injectable()
export abstract class BaseAgentStrategy {
  constructor(
    protected readonly llmService: LLMService,
    protected readonly toolService: ToolService,
    protected readonly messageService: MessageService,
  ) {}

  abstract run(options: AgentRunOptions): Promise<void>;

  protected async getContextMessages(
    conversationId: string,
    maxMessages: number = 50,
  ): Promise<ChatMessage[]> {
    const messages = await this.messageService.getMessages(conversationId);
    return this.buildContextMessages(messages, maxMessages);
  }

  protected buildContextMessages(
    messages: MessageApiResponse[],
    maxMessages: number,
  ): ChatMessage[] {
    const contextMessages: ChatMessage[] = messages
      .map((m) => {
        const msg: ChatMessage = {
          role: m.role as ChatMessage['role'],
          content: m.content ?? undefined,
        };
        if (m.toolCalls) msg.tool_calls = m.toolCalls as unknown as ToolCall[];
        if (m.role === 'tool' && m.toolCallId) msg.tool_call_id = m.toolCallId;
        return msg;
      })
      .filter((m) => m.content || m.tool_calls || m.role === 'tool');

    if (contextMessages.length <= maxMessages) return contextMessages;

    const firstMessage = contextMessages[0];
    const recentMessages = contextMessages.slice(-(maxMessages - 1));
    return [firstMessage, ...recentMessages];
  }

  protected async synthesiseAndStream(): Promise<void> {
    // Create a function that takes in the data and then calls a ai gateway symmerization
  }
}
