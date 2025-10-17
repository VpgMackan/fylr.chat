import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseTool, ToolDefinition, ToolExecutionContext } from './base.tool';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReadDocumentTool extends BaseTool {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  getDefinition(): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: 'read_document_chunk',
        description:
          'Reads a specific chunk from a source document by its ID and chunk index.',
        parameters: {
          type: 'object',
          properties: {
            source_id: {
              type: 'string',
              description: 'The ID of the source document to read.',
            },
            chunk_index: {
              type: 'number',
              description:
                'The index of the chunk to read from the source document.',
            },
          },
          required: ['source_id', 'chunk_index'],
        },
      },
    };
  }

  async execute(args: any, context: ToolExecutionContext): Promise<any> {
    const vector = await this.prisma.vector.findFirst({
      where: {
        chunkIndex: args.chunk_index,
        fileId: args.source_id,
      },
    });

    if (!vector) {
      throw new NotFoundException(
        `Chunk index ${args.chunk_index} not found for source ID ${args.source_id}.`,
      );
    }
    return {
      id: vector.id,
      chunk_index: vector.chunkIndex,
      content: vector.content,
    };
  }
}
