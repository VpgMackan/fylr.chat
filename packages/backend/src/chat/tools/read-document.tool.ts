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

  async execute(args: { source_id: string; chunk_index: number }): Promise<{
    id: string;
    source_id: string;
    source_name?: string;
    chunk_index: number;
    content: string;
  }> {
    try {
      if (!args.source_id || typeof args.source_id !== 'string') {
        throw new Error('Invalid source_id: must be a non-empty string');
      }

      if (
        args.chunk_index === undefined ||
        args.chunk_index === null ||
        typeof args.chunk_index !== 'number'
      ) {
        throw new Error('Invalid chunk_index: must be a number');
      }

      const vector = await this.prisma.vector.findFirst({
        where: {
          chunkIndex: args.chunk_index,
          fileId: args.source_id,
        },
        include: {
          source: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!vector) {
        throw new NotFoundException(
          `Chunk ${args.chunk_index} not found for source ${args.source_id}. The chunk may not exist or the source ID may be incorrect.`,
        );
      }

      return {
        id: vector.id,
        source_id: args.source_id,
        source_name: vector.source?.name,
        chunk_index: vector.chunkIndex,
        content: vector.content,
      };
    } catch (error) {
      console.error('[ReadDocumentTool] Error:', error);
      throw error;
    }
  }
}
