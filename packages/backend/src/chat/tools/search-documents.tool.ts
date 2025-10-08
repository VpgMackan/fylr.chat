import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseTool, ToolDefinition, ToolExecutionContext } from './base.tool';
import { AiVectorService } from 'src/ai/vector.service';
import { SourceService } from 'src/source/source.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SearchDocumentsTool extends BaseTool {
  constructor(
    private readonly vectorService: AiVectorService,
    private readonly sourceService: SourceService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  getDefinition(): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: 'search_documents',
        description: 'Searches for relevant text chunks within the library.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The natural language query for the vector search.',
            },
            source_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional list of source IDs to restrict search.',
            },
          },
          required: ['query'],
        },
      },
    };
  }

  async execute(args: any, context: ToolExecutionContext): Promise<any> {
    const embedding = await this.vectorService.search(args.query);

    let sourceIdsToSearch = args.source_ids;

    if (!sourceIdsToSearch || sourceIdsToSearch.length === 0) {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: context.conversationId },
        include: { sources: { select: { id: true } } },
      });
      if (!conversation) throw new NotFoundException('Conversation not found.');
      sourceIdsToSearch = conversation.sources.map((s) => s.id);
    }

    return this.sourceService.findByVector(embedding, sourceIdsToSearch);
  }
}
