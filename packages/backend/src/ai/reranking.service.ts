import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface RerankDocument {
  text: string;
  metadata?: any;
}

export interface RerankResult {
  index: number;
  relevance_score: number;
  document: RerankDocument;
}

export interface RerankResponse {
  model: string;
  results: RerankResult[];
}

@Injectable()
export class RerankingService {
  private readonly logger = new Logger(RerankingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Reranks documents based on their semantic relevance to a query.
   * Uses cross-encoder models via the AI Gateway for more accurate
   * relevance scoring compared to vector similarity alone.
   *
   * @param query - The search query
   * @param documents - Array of documents with text and optional metadata
   * @param model - The reranking model to use (default: jina-reranker-v2-base-multilingual)
   * @param topN - Optional: Return only the top N results
   * @returns Reranked documents with relevance scores
   */
  async rerank(
    query: string,
    documents: RerankDocument[],
    model = 'jina-reranker-v2-base-multilingual',
    topN?: number,
  ): Promise<RerankResponse> {
    if (!documents || documents.length === 0) {
      this.logger.warn('Rerank called with no documents');
      return { model, results: [] };
    }

    const aiGatewayUrl =
      this.configService.getOrThrow<string>('AI_GATEWAY_URL');

    const requestPayload: any = {
      query,
      documents,
      model,
    };

    if (topN !== undefined && topN > 0) {
      requestPayload.top_n = topN;
    }

    try {
      this.logger.debug(
        `Reranking ${documents.length} documents with model: ${model}`,
      );
      const startTime = Date.now();

      const response = await lastValueFrom(
        this.httpService.post<RerankResponse>(
          `${aiGatewayUrl}/v1/rerank`,
          requestPayload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 45000, // 45 second timeout for reranking (Jina API can be slow)
          },
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.debug(`Reranking completed in ${duration}ms`);

      if (response.status < 200 || response.status >= 300) {
        this.logger.error(
          `Error reranking documents (unexpected status): ${response.status} ${response.statusText}`,
          response.data,
        );
        throw new Error(`Failed to rerank documents: ${response.statusText}`);
      }

      const rerankResponse = response.data;

      if (!rerankResponse.results || !Array.isArray(rerankResponse.results)) {
        this.logger.error(
          'Unexpected rerank response structure:',
          rerankResponse,
        );
        throw new Error('Failed to extract rerank results from response');
      }

      this.logger.log(
        `Successfully reranked ${rerankResponse.results.length} documents. Top score: ${
          rerankResponse.results[0]?.relevance_score?.toFixed(4) ?? 'N/A'
        }`,
      );

      return rerankResponse;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `AI Gateway Rerank Error: ${error.response?.status} ${error.response?.statusText}`,
          error.response?.data || error.message,
        );
        throw new Error(
          `AI Gateway rerank request failed: ${error.response?.statusText || error.message}`,
        );
      } else {
        this.logger.error('Unexpected error during reranking:', error);
        throw error instanceof Error
          ? error
          : new Error(
              'An unexpected error occurred while reranking documents.',
            );
      }
    }
  }

  /**
   * Convenience method to rerank vector search results.
   * Takes the raw vector search results and reranks them based on the query.
   *
   * @param query - The search query
   * @param vectorResults - Results from vector search with content and metadata
   * @param topN - Number of top results to return after reranking
   * @returns Reranked results in the same format as input
   */
  async rerankVectorResults(
    query: string,
    vectorResults: any[],
    topN = 5,
  ): Promise<any[]> {
    if (!vectorResults || vectorResults.length === 0) {
      return [];
    }

    // Convert vector results to rerank documents
    const documents: RerankDocument[] = vectorResults.map((result) => ({
      text: result.content,
      metadata: {
        id: result.id,
        fileId: result.fileId,
        chunkIndex: result.chunkIndex,
        source: result.source,
      },
    }));

    // Perform reranking
    const rerankResponse = await this.rerank(query, documents, undefined, topN);

    // Map reranked results back to original format
    return rerankResponse.results.map((result) => {
      const metadata = result.document.metadata;
      return {
        id: metadata.id,
        fileId: metadata.fileId,
        content: result.document.text,
        chunkIndex: metadata.chunkIndex,
        source: metadata.source,
        relevanceScore: result.relevance_score, // Add relevance score from reranking
      };
    });
  }
}
