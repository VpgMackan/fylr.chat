import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BaseTool, ToolDefinition, ToolExecutionContext } from './base.tool';
import { firstValueFrom } from 'rxjs';

interface WebSearchArgs {
  query: string;
  num_results?: number;
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  query: string;
  results: TavilySearchResult[];
  response_time?: number;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevance_score?: number;
  published_date?: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  total_results: number;
  timestamp: string;
}

@Injectable()
export class WebSearchTool extends BaseTool {
  private readonly logger = new Logger(WebSearchTool.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  getDefinition(): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: 'web_search',
        description:
          'Search the web for current information, news, or general knowledge. Use this when you need up-to-date information not available in the local documents. Returns relevant web pages with titles, URLs, and content snippets.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'The search query to perform on the web. Be specific and clear to get the best results. Include relevant keywords and context.',
            },
            num_results: {
              type: 'number',
              description:
                'Maximum number of results to return (default: 5, max: 10).',
              default: 5,
            },
          },
          required: ['query'],
        },
      },
    };
  }

  async execute(
    args: WebSearchArgs,
    context: ToolExecutionContext,
  ): Promise<SearchResponse> {
    // Validate input
    if (!args.query || typeof args.query !== 'string') {
      throw new Error('Invalid search query: query must be a non-empty string');
    }

    const query = args.query.trim();
    if (query.length === 0) {
      throw new Error('Search query cannot be empty');
    }

    // Validate and clamp num_results
    let numResults = args.num_results || 5;
    if (typeof numResults !== 'number' || numResults < 1) {
      numResults = 5;
    }
    numResults = Math.min(numResults, 10); // Cap at 10 results

    this.logger.log(
      `Performing web search for query: "${query}" (${numResults} results)`,
    );

    return this.performWebSearch(query, numResults);
  }

  private async performWebSearch(
    query: string,
    numResults = 5,
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      const tavilyApiKey =
        this.configService.getOrThrow<string>('TAVILY_API_KEY');
      const searchUrl = 'https://api.tavily.com/search';

      this.logger.debug(
        `Calling Tavily API with query: "${query}", max_results: ${numResults}`,
      );

      const apiResponse = await firstValueFrom(
        this.httpService.post<TavilyResponse>(searchUrl, {
          api_key: tavilyApiKey,
          query,
          search_depth: 'basic',
          include_images: false,
          include_answer: false,
          include_raw_content: false,
          max_results: numResults,
        }),
      );

      if (!apiResponse || !apiResponse.data) {
        throw new Error('No response from Tavily API');
      }

      const data = apiResponse.data;
      const results: SearchResult[] = [];

      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((result: TavilySearchResult) => {
          // Validate that the result has required fields
          if (result.title && result.url && result.content) {
            results.push({
              title: result.title,
              url: result.url,
              snippet: result.content,
              source: 'Tavily',
              relevance_score: result.score,
              published_date: result.published_date,
            });
          }
        });
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Web search completed in ${duration}ms - found ${results.length} results`,
      );

      // Add a hint if no results found
      if (results.length === 0) {
        this.logger.warn(
          `Web search returned no results for query: "${query}"`,
        );
      }

      return {
        query,
        results,
        total_results: results.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Web search failed after ${duration}ms for query: "${query}"`,
        error instanceof Error ? error.stack : error,
      );

      // Check for specific error types
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;

        if (status === 401 || status === 403) {
          throw new Error(
            'Web search authentication failed. Please check TAVILY_API_KEY configuration.',
          );
        } else if (status === 429) {
          throw new Error(
            'Web search rate limit exceeded. Please try again later.',
          );
        } else if (status >= 500) {
          throw new Error(
            `Web search service temporarily unavailable (${status} ${statusText})`,
          );
        } else {
          throw new Error(
            `Web search failed with status ${status}: ${statusText}`,
          );
        }
      }

      // Generic error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to perform web search: ${errorMessage}`);
    }
  }
}
