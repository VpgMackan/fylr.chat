import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseTool, ToolDefinition, ToolExecutionContext } from './base.tool';
import { PrismaService } from 'src/prisma/prisma.service';
import { SourceService } from 'src/source/source.service';

@Injectable()
export class ListSourcesTool extends BaseTool {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sourceService: SourceService,
  ) {
    super();
  }

  getDefinition(): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: 'list_associated_sources',
        description:
          'Lists all source documents associated with the current conversation.',
        parameters: { type: 'object', properties: {} },
      },
    };
  }

  async execute(args: any, context: ToolExecutionContext): Promise<any> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: context.conversationId },
      include: { sources: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found.');
    return conversation.sources;
  }
}
