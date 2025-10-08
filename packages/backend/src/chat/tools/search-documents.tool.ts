import { Injectable } from '@nestjs/common';
import { BaseTool, ToolDefinition, ToolExecutionContext } from './base.tool';
import { AiVectorService } from 'src/ai/vector.service';
import { SourceService } from 'src/source/source.service';

@Injectable()
export class SearchDocumentsTool extends BaseTool {
  constructor(
    private readonly vectorService: AiVectorService,
    private readonly sourceService: SourceService,
  ) {
    super();
  }

  getDefinition(): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: 'search_documents',
        description: 'Searches for relevant text chunks within the pocket.',
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
    const sourceIds =
      args.source_ids ||
      (
        await this.sourceService.getSourcesByPocketId(
          context.pocketId,
          context.userId || '',
        )
      ).map((s) => s.id);
    return this.sourceService.findByVector(embedding, sourceIds);
  }
}
