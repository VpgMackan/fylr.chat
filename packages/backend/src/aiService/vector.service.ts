import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class AiVectorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private async _fetchEmbeddingsFromJina(
    text: string,
    model: string,
    jinaApiOptions: Record<string, any>,
    task?: string,
  ): Promise<number[]> {
    const requestPayload: Record<string, any> = {
      model,
      input: [{ text }],
      ...jinaApiOptions,
    };

    if (task) {
      requestPayload.task = task;
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configService.getOrThrow<string>('JINA_API_KEY')}`,
    };
    const jinaApiUrl = this.configService.getOrThrow<string>('JINA_API_URL');

    try {
      const response = await lastValueFrom(
        this.httpService.post(`${jinaApiUrl}/embeddings`, requestPayload, {
          headers,
        }),
      );

      if (response.status < 200 || response.status >= 300) {
        console.error(
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
        console.error('Unexpected response structure:', responseData);
        throw new Error('Failed to extract embeddings from response');
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(
          `Jina API Error: ${error.response?.status} ${error.response?.statusText}`,
          error.response?.data || error.message,
        );
        throw new Error(
          `Jina API request failed: ${error.response?.statusText || error.message}`,
        );
      } else {
        console.error('Unexpected error during Jina API call:', error);
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
    options: Record<string, any>,
  ): Promise<number[]> {
    return this._fetchEmbeddingsFromJina(text, model, options);
  }

  async search(
    text: string,
    model: string,
    options: Record<string, any>,
  ): Promise<number[]> {
    return this._fetchEmbeddingsFromJina(
      text,
      model,
      options,
      'retrieval.query',
    );
  }
}
