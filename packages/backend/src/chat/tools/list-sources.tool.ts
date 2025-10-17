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
    try {
      if (!context.conversationId) {
        throw new Error('conversationId is required in execution context');
      }

      const conversation = await this.prisma.conversation.findUnique({
        where: { id: context.conversationId },
        include: { sources: true },
      });

      if (!conversation) {
        throw new NotFoundException(
          `Conversation not found: ${context.conversationId}`,
        );
      }

      const sources = conversation.sources || [];

      if (sources.length === 0) {
        return {
          sources: [],
          count: 0,
          message: 'No sources are associated with this conversation.',
        };
      }

      return {
        sources: sources.map((s) => ({
          id: s.id,
          name: s.name,
          libraryId: s.libraryId,
        })),
        count: sources.length,
      };
    } catch (error) {
      console.error('[ListSourcesTool] Error:', error);
      throw error;
    }
  }
}
