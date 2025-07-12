import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private async _fetchChatCompletionFromAiGateway(
    prompt: string,
    stream: boolean,
  ): Promise<any> {
    const requestPayload = {
      provider: 'openai',
      model: 'groq/llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
      stream,
    };

    const aiGatewayUrl =
      this.configService.getOrThrow<string>('AI_GATEWAY_URL');

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${aiGatewayUrl}/v1/chat/completions`,
          requestPayload,
          {
            headers: { 'Content-Type': 'application/json' },
            ...(stream && { responseType: 'stream' as const }),
          },
        ),
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        this.logger.error(
          `AI Gateway Error (${status}):`,
          error.response?.data || error.message,
        );
        throw new InternalServerErrorException(
          `AI Gateway request failed (${status}): ${error.response?.statusText || error.message}`,
        );
      }
      this.logger.error(
        'Failed to fetch chat completion from AI Gateway',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to fetch chat completion from AI Gateway',
      );
    }
  }

  async generate(prompt: string): Promise<string> {
    const response = await this._fetchChatCompletionFromAiGateway(
      prompt,
      false,
    );
    return response.choices[0]?.message?.content || '';
  }

  async *generateStream(prompt: string): AsyncGenerator<string> {
    const response = await this._fetchChatCompletionFromAiGateway(prompt, true);
    const stream = response as NodeJS.ReadableStream;

    for await (const chunk of stream) {
      const lines = chunk
        .toString('utf8')
        .split('\n')
        .filter((line: string) => line.trim().startsWith('data: '));

      for (const line of lines) {
        const message = line.replace(/^data: /, '');
        if (message === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(message);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch (error) {
          this.logger.error('Error parsing stream chunk:', message, error);
        }
      }
    }
  }
}
