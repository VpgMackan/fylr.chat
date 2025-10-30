import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseTool, ToolDefinition, ToolExecutionContext } from './base.tool';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';

interface FetchWebpageArgs {
  url: string;
  extract_markdown?: boolean;
}

interface WebpageContent {
  url: string;
  title: string;
  content: string;
  meta_description?: string;
  author?: string;
  published_date?: string;
  word_count: number;
  timestamp: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class FetchWebpageTool extends BaseTool {
  private readonly logger = new Logger(FetchWebpageTool.name);
  private readonly MAX_CONTENT_LENGTH = 50000; // Maximum characters to extract
  private readonly TIMEOUT_MS = 15000; // 15 second timeout for fetching

  constructor(private readonly httpService: HttpService) {
    super();
  }

  getDefinition(): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: 'fetch_webpage',
        description:
          'Fetches and extracts the main readable content from a webpage. Use this to get detailed information from a specific URL, such as articles, blog posts, documentation pages, or any web content. The tool extracts the title, main content, and metadata. This is different from web_search which finds URLs - use this tool once you have a specific URL to read.',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description:
                'The full URL of the webpage to fetch. Must include the protocol (http:// or https://).',
            },
            extract_markdown: {
              type: 'boolean',
              description:
                'Whether to convert HTML content to markdown format for better readability (default: true).',
              default: true,
            },
          },
          required: ['url'],
        },
      },
    };
  }

  async execute(
    args: FetchWebpageArgs,
    context: ToolExecutionContext,
  ): Promise<WebpageContent> {
    // Validate URL
    if (!args.url || typeof args.url !== 'string') {
      throw new Error('Invalid URL: url must be a non-empty string');
    }

    const url = args.url.trim();
    if (!url.match(/^https?:\/\//i)) {
      throw new Error('Invalid URL: must start with http:// or https://');
    }

    const extractMarkdown = args.extract_markdown !== false;

    this.logger.log(`Fetching webpage: ${url}`);

    return this.fetchAndExtractContent(url, extractMarkdown);
  }

  private async fetchAndExtractContent(
    url: string,
    extractMarkdown: boolean,
  ): Promise<WebpageContent> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Requesting URL: ${url}`);

      // Fetch the webpage with timeout
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: this.TIMEOUT_MS,
          maxRedirects: 5,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; FylrBot/1.0; +https://fylr.chat)',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          validateStatus: (status) => status >= 200 && status < 400,
        }),
      );

      const html = response.data;
      const contentType = response.headers['content-type'] || '';

      // Check if the response is HTML
      if (!contentType.includes('text/html')) {
        this.logger.warn(`Non-HTML content type received: ${contentType}`);
        return {
          url,
          title: '',
          content: `Content type is ${contentType}, not HTML. Cannot extract readable content.`,
          word_count: 0,
          timestamp: new Date().toISOString(),
          success: false,
          error: `Non-HTML content type: ${contentType}`,
        };
      }

      // Parse HTML with cheerio
      const $ = cheerio.load(html);

      // Extract metadata
      const title = this.sanitizeText(this.extractTitle($));
      const metaDescription = this.extractMetaDescription($);
      const author = this.extractAuthor($);
      const publishedDate = this.extractPublishedDate($);

      // Remove unwanted elements
      this.removeUnwantedElements($);

      // Extract main content
      const mainContent = this.extractMainContent($);

      // Convert to markdown if requested
      let content = extractMarkdown
        ? this.htmlToMarkdown($, mainContent)
        : mainContent;

      // Sanitize the content to remove problematic Unicode characters
      content = this.sanitizeText(content);

      // Truncate if too long
      const truncatedContent =
        content.length > this.MAX_CONTENT_LENGTH
          ? content.substring(0, this.MAX_CONTENT_LENGTH) +
            '\n\n[Content truncated due to length...]'
          : content;

      const wordCount = truncatedContent.split(/\s+/).length;
      const duration = Date.now() - startTime;

      this.logger.log(
        `Successfully fetched webpage in ${duration}ms: ${title} (${wordCount} words)`,
      );

      return {
        url,
        title,
        content: truncatedContent,
        meta_description: metaDescription
          ? this.sanitizeText(metaDescription)
          : undefined,
        author: author ? this.sanitizeText(author) : undefined,
        published_date: publishedDate,
        word_count: wordCount,
        timestamp: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to fetch webpage after ${duration}ms: ${url}`,
        error instanceof Error ? error.stack : error,
      );

      // Handle specific error types
      if (error.code === 'ENOTFOUND') {
        throw new Error(`Failed to fetch webpage: Domain not found (${url})`);
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new Error(
          `Failed to fetch webpage: Request timeout after ${this.TIMEOUT_MS}ms`,
        );
      } else if (error.response) {
        const status = error.response.status;
        throw new Error(
          `Failed to fetch webpage: HTTP ${status} ${error.response.statusText}`,
        );
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to fetch webpage: ${errorMessage}`);
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    // Try multiple selectors in order of preference
    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      $('h1').first().text() ||
      '';

    return title.trim();
  }

  private extractMetaDescription($: cheerio.CheerioAPI): string | undefined {
    const description =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content');

    return description?.trim();
  }

  private extractAuthor($: cheerio.CheerioAPI): string | undefined {
    const author =
      $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      $('[rel="author"]').text();

    return author?.trim();
  }

  private extractPublishedDate($: cheerio.CheerioAPI): string | undefined {
    const date =
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="publish_date"]').attr('content') ||
      $('time[datetime]').attr('datetime');

    return date?.trim();
  }

  private removeUnwantedElements($: cheerio.CheerioAPI): void {
    // Remove scripts, styles, and other non-content elements
    $(
      'script, style, noscript, iframe, nav, header, footer, aside, .advertisement, .ads, .social-share, .comments, #comments, .comment, .sidebar, .cookie-notice, .popup, .modal',
    ).remove();
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    // Try to find the main content container
    const contentSelectors = [
      'article',
      '[role="main"]',
      'main',
      '#content',
      '.content',
      '#main',
      '.main',
      '.post-content',
      '.entry-content',
      '.article-content',
      'body',
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text();
        if (text.trim().length > 100) {
          // Ensure there's substantial content
          return text;
        }
      }
    }

    // Fallback: get all body text
    return $('body').text();
  }

  private htmlToMarkdown($: cheerio.CheerioAPI, html: string): string {
    // Simple HTML to Markdown conversion
    // This is a basic implementation - for production, consider using a library like turndown

    let markdown = html;

    // Normalize whitespace
    markdown = markdown.replace(/\s+/g, ' ').trim();

    // Convert common patterns
    markdown = markdown.replace(/\n{3,}/g, '\n\n'); // Multiple newlines to double

    return markdown;
  }

  private sanitizeText(text: string): string {
    if (!text) return '';

    // Remove UTF-16 surrogate pairs and other problematic characters
    // This prevents "surrogates not allowed" errors when encoding to UTF-8
    let sanitized = text
      // Remove unpaired surrogate characters (U+D800 to U+DFFF)
      .replace(/[\uD800-\uDFFF]/g, '')
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove other control characters except newline, tab, and carriage return
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      // Normalize various Unicode spaces to regular space
      .replace(/[\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // Trim and normalize multiple spaces
    sanitized = sanitized.replace(/  +/g, ' ').trim();

    return sanitized;
  }
}
