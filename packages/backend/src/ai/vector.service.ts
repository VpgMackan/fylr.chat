import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class AiVectorService {
  private readonly logger = new Logger(AiVectorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private async _fetchEmbeddingsFromAiGateway(
    text: string,
    model: string,
    options: Record<string, unknown>,
    task?: string,
  ): Promise<number[]> {
    const requestPayload: Record<string, unknown> = {
      provider: 'jina',
      model,
      input: [text],
      options,
    };

    if (task) {
      requestPayload.options = { ...options, task };
    }

    const aiGatewayUrl =
      this.configService.getOrThrow<string>('AI_GATEWAY_URL');

    try {
      const response = await lastValueFrom(
        this.httpService.post(`${aiGatewayUrl}/v1/embeddings`, requestPayload, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      if (response.status < 200 || response.status >= 300) {
        this.logger.error(
          `Error fetching embeddings (unexpected status): ${response.status} ${response.statusText}`,
          response.data,
        );
        throw new Error(`Failed to fetch embeddings: ${response.statusText}`);
      }

      const responseData = response.data as {
        data: { embedding: number[] }[];
      };

      if (responseData?.data?.[0]?.embedding) {
        return responseData.data[0].embedding;
      } else {
        this.logger.error('Unexpected response structure:', responseData);
        throw new Error('Failed to extract embeddings from response');
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `AI Gateway Error: ${error.response?.status} ${error.response?.statusText}`,
          error.response?.data || error.message,
        );
        throw new Error(
          `AI Gateway request failed: ${error.response?.statusText || error.message}`,
        );
      } else {
        this.logger.error('Unexpected error during AI Gateway call:', error);
        throw error instanceof Error
          ? error
          : new Error(
              'An unexpected error occurred while fetching embeddings.',
            );
      }
    }
  }

  async generate(
    text: string,
    model: string,
    options: Record<string, unknown>,
  ): Promise<number[]> {
    return this._fetchEmbeddingsFromAiGateway(text, model, options);
  }

  async search(
    text: string,
    model: string,
    options: Record<string, unknown>,
  ): Promise<number[]> {
    return this._fetchEmbeddingsFromAiGateway(
      text,
      model,
      options,
      'retrieval.query',
    );
  }
}
