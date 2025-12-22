import { Server } from 'socket.io';
import { ToolDefinition } from '../../tools/base.tool';
import { tools as specialTools } from '../../tool';
import { UserRole, Message as PrismaMessage } from '@prisma/client';
import { ToolService } from 'src/chat/tools';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageService } from 'src/chat/message.service';
import { ConversationService } from 'src/chat/conversation.service';
import { AgentStrategyServices } from './agent.strategy';
import { ChatMessage, LLMService, ToolCall } from 'src/ai/llm.service';

export class HelperStrategy {
  protected readonly prisma: PrismaService;
  protected readonly messageService: MessageService;
  protected readonly conversationService: ConversationService;
  protected readonly llmService: LLMService;
  protected readonly toolService: ToolService;

  constructor(services: AgentStrategyServices) {
    this.prisma = services.prisma;
    this.messageService = services.messageService;
    this.conversationService = services.conversationService;
    this.llmService = services.llmService;
    this.toolService = services.toolService;
  }

  emitToolProgress(
    toolName: string,
    message: string,
    server: Server,
    conversationId: string,
  ) {
    server.to(conversationId).emit('conversationAction', {
      action: 'toolProgress',
      conversationId,
      data: { toolName, message },
    });
  }

  getAvailableTools(
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
        ...allToolDefinitions.filter((tool) =>
          documentTools.includes(tool.function.name),
        ),
      );
    }

    if (webSearchEnabled) {
      const webTools = ['web_search', 'fetch_webpage'];
      tools.push(
        ...allToolDefinitions.filter((tool) =>
          webTools.includes(tool.function.name),
        ),
      );
    }

    if (tools.length > 0) {
      tools.push(...(specialTools as ToolDefinition[]));
    }
    return tools;
  }

  buildContextMessages(
    messages: PrismaMessage[],
    maxMessages: number,
  ): ChatMessage[] {
    const contextMessages: ChatMessage[] = messages
      .map((m) => {
        const msg: ChatMessage = {
          role: m.role as ChatMessage['role'],
          content: m.content ?? undefined,
        };
        if (m.toolCalls) {
          msg.tool_calls = m.toolCalls as unknown as ToolCall[];
        }
        if (m.role === 'tool' && m.toolCallId) {
          msg.tool_call_id = m.toolCallId;
        }
        return msg;
      })
      .filter((m) => m.content || m.tool_calls || m.role === 'tool');

    if (contextMessages.length <= maxMessages) {
      return contextMessages;
    }

    const firstMessage = contextMessages[0];
    const recentMessages = contextMessages.slice(-(maxMessages - 1));
    return [firstMessage, ...recentMessages];
  }

  pruneContextMessages(messages: ChatMessage[], maxMessages: number): void {
    if (messages.length <= maxMessages) return;

    const systemMessages = messages.filter((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');
    const firstUserMessage = nonSystemMessages.find((m) => m.role === 'user');
    const recentMessages = nonSystemMessages.slice(
      -(maxMessages - systemMessages.length - 1),
    );

    messages.length = 0;
    messages.push(...systemMessages);
    if (firstUserMessage && !recentMessages.includes(firstUserMessage)) {
      messages.push(firstUserMessage);
    }
    messages.push(...recentMessages.filter((m) => m !== firstUserMessage));
  }

  provideFinalAnswer() {
    // TODO
  }
}
