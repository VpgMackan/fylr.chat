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

export interface ToolDefinition {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
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

  protected getAvailableTools(
    hasSources: boolean,
    webSearchEnabled: boolean,
  ): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    const allToolDefinitions = this.toolService.getAllToolDefinitions();

    if (hasSources) {
      const documentTools = [
        'search_documents',
        'read_document_chunk',
        'list_sources_in_library',
      ];
      tools.push(
        ...allToolDefinitions.filter((tool: ToolDefinition) =>
          documentTools.includes(tool.function.name),
        ),
      );
    }

    if (webSearchEnabled) {
      const webTools = ['web_search', 'fetch_webpage'];
      tools.push(
        ...allToolDefinitions.filter((tool: ToolDefinition) =>
          webTools.includes(tool.function.name),
        ),
      );
    }

    return tools;
  }

  protected async synthesiseAndStream(): Promise<void> {
    // Create a function that takes in the data and then calls a ai gateway symmerization
  }
}
