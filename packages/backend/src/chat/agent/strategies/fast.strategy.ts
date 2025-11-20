import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BaseAgentStrategy, AgentRunOptions } from './base.strategy';
import { PrismaService } from 'src/prisma/prisma.service';
import { LLMService } from 'src/ai/llm.service';
import { ToolService } from 'src/chat/tools';
import { MessageService } from 'src/chat/message.service';

interface ConversationMetadata {
  agenticMode?: boolean;
  webSearchEnabled?: boolean;
}

@Injectable()
export class FastAgentStrategy extends BaseAgentStrategy {
  private readonly logger = new Logger(FastAgentStrategy.name);

  constructor(
    llmService: LLMService,
    toolService: ToolService,
    messageService: MessageService,
    private readonly prisma: PrismaService,
  ) {
    super(llmService, toolService, messageService);
  }

  async run(options: AgentRunOptions): Promise<void> {
    const { userMessage, conversation, server } = options;

    const fullConversation = await this.prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: {
        sources: {
          select: {
            id: true,
            library: { select: { defaultEmbeddingModel: true } },
          },
        },
        user: { select: { id: true, role: true } },
      },
    });

    if (!fullConversation) {
      throw new NotFoundException(
        `Conversation with ID "${conversation.id}" not found.`,
      );
    }

    const hasSources = fullConversation.sources.length > 0;
    const userMetadata = userMessage.metadata as ConversationMetadata;
    const conversationMetadata =
      fullConversation.metadata as ConversationMetadata;
    const webSearchEnabled =
      userMetadata?.webSearchEnabled === true ||
      conversationMetadata?.webSearchEnabled === true;

    const availableTools = this.getAvailableTools(hasSources, webSearchEnabled);

    if (availableTools.length === 0) {
      this.logger.log(
        `No tools available for conversation ${conversation.id}, cannot run agentic fast strategy`,
      );
      throw new Error(
        'No tools available for agentic mode. Please add sources or enable web search.',
      );
    }

    const contextMessages = await this.getContextMessages(conversation.id, 20);

    const toolsDescription = availableTools
      .map((tool) => {
        return `- ${tool.function.name}: ${tool.function.description}`;
      })
      .join('\n');

    const historyText = contextMessages
      .map((msg) => {
        if (msg.role === 'user') return `User: ${msg.content}`;
        if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
        return '';
      })
      .filter(Boolean)
      .join('\n');

    const response = await this.llmService.generate({
      prompt_type: 'agentic_fast',
      prompt_vars: {
        tools: toolsDescription,
        history: historyText || 'No previous conversation history.',
        userQuestion: userMessage.content || '',
      },
    });

    this.logger.log(
      `Generated agentic fast script for conversation ${conversation.id}`,
    );
    this.logger.debug(`Response: ${response}`);

    const actionPlan = JSON.parse(response) as {
      actions: { tool: string; args: Record<string, unknown> }[];
    };
    const results: { tool: string; result: unknown }[] = [];
    for (const action of actionPlan.actions) {
      const result = await this.toolService.executeTool(
        action.tool,
        action.args,
        {
          conversationId: conversation.id,
          userId: conversation.userId,
          embeddingModel:
            fullConversation.sources[0]?.library.defaultEmbeddingModel ??
            undefined,
        },
      );
      results.push({ tool: action.tool, result });
    }

    // TODO: Parse and execute the generated Python script
    // TODO: Call synthesize and stream with results
  }
}
