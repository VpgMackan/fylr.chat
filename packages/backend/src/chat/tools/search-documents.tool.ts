import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseTool, ToolDefinition, ToolExecutionContext } from './base.tool';
import { AiVectorService } from 'src/ai/vector.service';
import { RerankingService } from 'src/ai/reranking.service';
import { SourceService } from 'src/source/source.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SearchDocumentsTool extends BaseTool {
  private readonly VECTOR_SEARCH_LIMIT = 25;
  private readonly RERANK_TOP_N = 5;

  constructor(
    private readonly vectorService: AiVectorService,
    private readonly rerankingService: RerankingService,
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
        description:
          'Searches for relevant text chunks within the library documents using semantic search with advanced re-ranking. Use this when the user asks about information that might be in their documents, or when they explicitly mention a library (e.g., @LibraryName). Always prefer searching documents over relying on general knowledge when documents are available.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'The natural language query for the vector search. Make this specific to find the most relevant chunks.',
            },
            source_ids: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Optional list of source IDs to restrict search to specific documents.',
            },
            use_reranking: {
              type: 'boolean',
              description:
                'Whether to use advanced re-ranking for better relevance (default: true). Re-ranking uses a cross-encoder model to improve result quality.',
            },
          },
          required: ['query'],
        },
      },
    };
  }

  async execute(args: any, context: ToolExecutionContext): Promise<any> {
    try {
      if (!args.query || typeof args.query !== 'string') {
        throw new Error('Invalid query: must be a non-empty string');
      }

      const useReranking = args.use_reranking !== false;

      const embedding = await this.vectorService.search(
        args.query,
        context.embeddingModel,
      );
      if (!embedding || embedding.length === 0) {
        throw new Error('Failed to generate embeddings for query');
      }

      let sourceIdsToSearch = args.source_ids;

      if (!sourceIdsToSearch || sourceIdsToSearch.length === 0) {
        const conversation = await this.prisma.conversation.findUnique({
          where: { id: context.conversationId },
          include: { sources: { select: { id: true } } },
        });
        if (!conversation) {
          throw new NotFoundException(
            `Conversation not found: ${context.conversationId}`,
          );
        }
        sourceIdsToSearch = conversation.sources.map((s) => s.id);

        if (sourceIdsToSearch.length === 0) {
          return {
            results: [],
            message:
              'No sources are associated with this conversation. Please add sources to search.',
          };
        }
      }

      const fetchLimit = useReranking
        ? this.VECTOR_SEARCH_LIMIT
        : this.RERANK_TOP_N;

      const vectorResults = await this.sourceService.findByVector(
        embedding,
        sourceIdsToSearch,
        fetchLimit,
      );

      if (!useReranking || vectorResults.length === 0) {
        return {
          results: vectorResults,
          count: vectorResults.length,
          query: args.query,
          reranked: false,
        };
      }

      try {
        const rerankedResults = await this.rerankingService.rerankVectorResults(
          args.query,
          vectorResults,
          this.RERANK_TOP_N,
        );

        console.log(
          `[SearchDocumentsTool] Reranked ${vectorResults.length} results to top ${rerankedResults.length}`,
        );

        return {
          results: rerankedResults,
          count: rerankedResults.length,
          query: args.query,
          reranked: true,
          originalCount: vectorResults.length,
        };
      } catch (rerankError) {
        console.error(
          '[SearchDocumentsTool] Reranking failed, falling back to vector results:',
          rerankError,
        );
        return {
          results: vectorResults.slice(0, this.RERANK_TOP_N),
          count: Math.min(vectorResults.length, this.RERANK_TOP_N),
          query: args.query,
          reranked: false,
          rerankError: 'Reranking failed, using vector search results',
        };
      }
    } catch (error) {
      console.error('[SearchDocumentsTool] Error:', error);
      throw error;
    }
  }
}
