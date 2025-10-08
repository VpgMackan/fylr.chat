import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BaseTool, ToolDefinition, ToolExecutionContext } from './base.tool';

@Injectable()
export class WebSearchTool extends BaseTool {
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
          'Search the web for current information, news, or general knowledge. Use this when you need up-to-date information not available in the local documents.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'The search query to perform on the web. This needs to be specific and clear to get the best results.',
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

  async execute(args: any, context: ToolExecutionContext): Promise<any> {
    return this.performWebSearch(args.query, args.num_results || 5);
  }

  private async performWebSearch(
    query: string,
    numResults: number = 5,
  ): Promise<any> {
    try {
      const tavilyApiKey =
        this.configService.getOrThrow<string>('TAVILY_API_KEY');
      const searchUrl = 'https://api.tavily.com/search';

      const response = await this.httpService
        .post(searchUrl, {
          api_key: tavilyApiKey,
          query,
          search_depth: 'basic',
          include_images: false,
          include_answer: false,
          include_raw_content: false,
          max_results: numResults,
        })
        .toPromise();

      if (!response) {
        throw new Error('No response from Tavily API');
      }

      const data = response.data;

      const results: Array<{
        title: string;
        url: string;
        snippet: string;
        source: string;
      }> = [];

      if (data.results && data.results.length > 0) {
        data.results.forEach((result) => {
          results.push({
            title: result.title,
            url: result.url,
            snippet: result.content,
            source: 'Tavily',
          });
        });
      }

      return {
        query,
        results,
        total_results: results.length,
      };
    } catch (error) {
      console.error('Web search error:', error);
      return {
        query,
        error: 'Failed to perform web search',
        results: [],
      };
    }
  }
}
