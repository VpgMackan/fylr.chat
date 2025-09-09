import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosError, RawAxiosRequestHeaders } from 'axios';

interface ChatCompletionChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string | null;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface StreamingChoice {
  index: number;
  delta: {
    content?: string;
  };
  finish_reason: string | null;
}

interface StreamingChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamingChoice[];
}

type TemplatePayload = {
  prompt_type: string;
  prompt_vars: Record<string, unknown>;
  prompt_version?: string;
};

type MessagePayload = {
  messages: { role: string; content: string }[];
};

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private async _fetchChatCompletionFromAiGateway(
    payload: TemplatePayload | MessagePayload,
    stream: boolean,
  ): Promise<ChatCompletionResponse | NodeJS.ReadableStream> {
    const requestPayload = {
      provider: 'openai',
      model: 'or/deephermes-3-llama-3-8b',
      ...payload,
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
            headers: {
              'Content-Type': 'application/json',
            } as RawAxiosRequestHeaders,
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

  async generate(promptOrOptions: string | TemplatePayload): Promise<string> {
    const payload =
      typeof promptOrOptions === 'string'
        ? { messages: [{ role: 'user', content: promptOrOptions }] }
        : promptOrOptions;
    const response = (await this._fetchChatCompletionFromAiGateway(
      payload,
      false,
    )) as ChatCompletionResponse;
    return response.choices[0]?.message?.content || '';
  }

  async *generateStream(
    promptOrOptions: string | TemplatePayload,
  ): AsyncGenerator<string> {
    const payload =
      typeof promptOrOptions === 'string'
        ? { messages: [{ role: 'user', content: promptOrOptions }] }
        : promptOrOptions;

    const response = await this._fetchChatCompletionFromAiGateway(
      payload,
      true,
    );
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
          const parsed: StreamingChunk = JSON.parse(message);
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
