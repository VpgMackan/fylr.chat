import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseTool, ToolDefinition, ToolExecutionContext } from './base.tool';
import { AiVectorService } from 'src/ai/vector.service';
import { RerankingService } from 'src/ai/reranking.service';
import { SourceService } from 'src/source/source.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LLMService } from 'src/ai/llm.service';

@Injectable()
export class SearchDocumentsTool extends BaseTool {
  private readonly VECTOR_SEARCH_LIMIT = 25;
  private readonly RERANK_TOP_N = 5;

  constructor(
    private readonly vectorService: AiVectorService,
    private readonly rerankingService: RerankingService,
    private readonly sourceService: SourceService,
    private readonly prisma: PrismaService,
    private readonly llmService: LLMService,
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
            use_multi_query: {
              type: 'boolean',
              description:
                'Whether to use multi-query expansion (default: false). When enabled, generates multiple query variations and combines results for better coverage. Useful when initial search returns few or no results.',
            },
          },
          required: ['query'],
        },
      },
    };
  }

  /**
   * Generates multiple query variations using the multi_query prompt
   */
  private async generateQueryVariations(
    originalQuery: string,
  ): Promise<string[]> {
    try {
      const response = await this.llmService.generate({
        prompt_type: 'multi_query',
        prompt_vars: { query: originalQuery },
      });

      // Parse the response - expect one query per line
      const variations = response
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.match(/^[0-9]+\.|^[-*•]/)) // Remove numbering/bullets
        .slice(0, 5); // Max 5 variations

      return variations.length > 0 ? variations : [originalQuery];
    } catch (error) {
      console.error(
        '[SearchDocumentsTool] Failed to generate query variations:',
        error,
      );
      // Fallback to original query on error
      return [originalQuery];
    }
  }

  /**
   * Performs search with a single query
   */
  private async searchWithQuery(
    query: string,
    sourceIds: string[],
    embeddingModel: string,
    limit: number,
  ): Promise<any[]> {
    const embedding = await this.vectorService.search(query, embeddingModel);
    if (!embedding || embedding.length === 0) {
      return [];
    }
    return this.sourceService.findByVector(embedding, sourceIds, limit);
  }

  async execute(args: any, context: ToolExecutionContext): Promise<any> {
    try {
      if (!args.query || typeof args.query !== 'string') {
        throw new Error('Invalid query: must be a non-empty string');
      }

      const useReranking = args.use_reranking !== false;
      const useMultiQuery = args.use_multi_query === true;

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

      let vectorResults: any[];

      // Multi-query retrieval: generate variations and combine results
      if (useMultiQuery) {
        console.log(
          `[SearchDocumentsTool] Using multi-query expansion for: "${args.query}"`,
        );

        const queryVariations = await this.generateQueryVariations(args.query);
        console.log(
          `[SearchDocumentsTool] Generated ${queryVariations.length} query variations`,
        );

        // Search with each query variation
        const allResults = await Promise.all(
          queryVariations.map((query) =>
            this.searchWithQuery(
              query,
              sourceIdsToSearch,
              context.embeddingModel || '',
              Math.ceil(fetchLimit / queryVariations.length), // Distribute limit across queries
            ),
          ),
        );

        // Combine and deduplicate results
        const resultsMap = new Map();
        allResults.flat().forEach((result) => {
          if (!resultsMap.has(result.id)) {
            resultsMap.set(result.id, result);
          }
        });

        vectorResults = Array.from(resultsMap.values()).slice(0, fetchLimit);
        console.log(
          `[SearchDocumentsTool] Multi-query retrieved ${vectorResults.length} unique results`,
        );
      } else {
        // Standard single-query search
        vectorResults = await this.searchWithQuery(
          args.query,
          sourceIdsToSearch,
          context.embeddingModel || '',
          fetchLimit,
        );
      }

      if (!useReranking || vectorResults.length === 0) {
        return {
          results: vectorResults,
          count: vectorResults.length,
          query: args.query,
          reranked: false,
          multi_query: useMultiQuery,
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
          multi_query: useMultiQuery,
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
          multi_query: useMultiQuery,
          rerankError: 'Reranking failed, using vector search results',
        };
      }
    } catch (error) {
      console.error('[SearchDocumentsTool] Error:', error);
      throw error;
    }
  }
}
