import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class AiVectorService {
  private readonly logger = new Logger(AiVectorService.name);
  private cachedDefaultFullModel?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private async _fetchEmbeddingsFromAiGateway(
    text: string,
    fullModel?: string,
    options: Record<string, unknown> = {},
    task?: string,
  ): Promise<number[]> {
    const requestPayload: Record<string, unknown> = {
      input: [text],
      options,
    };

    if (task) {
      requestPayload.options = { ...options, task };
    }

    requestPayload.fullModel = await this._resolveFullModel(fullModel);

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

  async fetchModels(): Promise<
    {
      provider: string;
      model: string;
      version: string;
      timestamp: string;
      dimensions: number;
      isDefault: boolean;
      isDeprecated: boolean;
      deprecationDate?: string;
      fullModel: string;
    }[]
  > {
    const aiGatewayUrl =
      this.configService.getOrThrow<string>('AI_GATEWAY_URL');

    try {
      const response = await lastValueFrom(
        this.httpService.get(`${aiGatewayUrl}/v1/embeddings/models`, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      if (response.status < 200 || response.status >= 300) {
        this.logger.error(
          `Error fetching models (unexpected status): ${response.status} ${response.statusText}`,
          response.data,
        );
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const responseData = response.data as {
        models: Array<{
          provider: string;
          model: string;
          version: string;
          timestamp: string;
          dimensions: number;
          isDefault: boolean;
          isDeprecated: boolean;
          deprecationDate?: string;
          fullModel: string;
        }>;
        default: string;
      };

      if (responseData?.models) {
        return responseData.models;
      } else {
        this.logger.error('Unexpected response structure:', responseData);
        throw new Error('Failed to extract models from response');
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
          : new Error('An unexpected error occurred while fetching models.');
      }
    }
  }

  async getDefaultEmbeddingModel(): Promise<string> {
    const aiGatewayUrl =
      this.configService.getOrThrow<string>('AI_GATEWAY_URL');

    try {
      const response = await lastValueFrom(
        this.httpService.get(`${aiGatewayUrl}/v1/embeddings/models`, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      if (response.status < 200 || response.status >= 300) {
        this.logger.error(
          `Error fetching default model (unexpected status): ${response.status} ${response.statusText}`,
          response.data,
        );
        throw new Error(
          `Failed to fetch default model: ${response.statusText}`,
        );
      }

      const responseData = response.data as { default: string };

      if (responseData?.default) {
        this.cachedDefaultFullModel = responseData.default;
        return responseData.default;
      } else {
        this.logger.error('Unexpected response structure:', responseData);
        throw new Error('Failed to extract default model from response');
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
              'An unexpected error occurred while fetching default model.',
            );
      }
    }
  }

  private async _resolveFullModel(fullModel?: string): Promise<string> {
    if (fullModel) {
      return fullModel;
    }

    if (this.cachedDefaultFullModel) {
      return this.cachedDefaultFullModel;
    }

    return this.getDefaultEmbeddingModel();
  }

  async generate(
    text: string,
    model?: string,
    options: Record<string, unknown> = {},
  ): Promise<number[]> {
    return this._fetchEmbeddingsFromAiGateway(text, model, options);
  }

  async search(
    text: string,
    model?: string,
    options: Record<string, unknown> = {},
  ): Promise<number[]> {
    return this._fetchEmbeddingsFromAiGateway(
      text,
      model,
      options,
      'retrieval.query',
    );
  }
}
