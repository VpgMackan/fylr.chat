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
    tool_calls?: ToolCall[];
    reasoning?: string;
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

interface ReasoningConfig {
  enabled?: boolean;
  effort?: 'low' | 'medium' | 'high';
  max_tokens?: number;
  exclude?: boolean;
}

type FunctionDefinition = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
};

type ToolDefinition = {
  type?: 'function' | string;
  function: FunctionDefinition;
};

export type ToolCall = {
  id: string;
  type?: string;
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
};

export type ChatMessage = {
  role: string;
  content?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

type TemplatePayload = {
  prompt_type: string;
  prompt_vars: Record<string, unknown>;
  prompt_version?: string;
  messages?: ChatMessage[];
  tools?: ToolDefinition[];
  reasoning?: ReasoningConfig | boolean;
};

type MessagePayload = {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  reasoning?: ReasoningConfig | boolean;
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
      provider: 'auto',
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

  async generateWithTools(
    messages: ChatMessage[],
    tools: ToolDefinition[],
  ): Promise<ChatCompletionResponse> {
    const payload = {
      provider: 'auto',

      prompt_type: 'agentic_system',

      messages: messages,

      tools,
      stream: false,
    };
    const response = (await this._fetchChatCompletionFromAiGateway(
      payload,
      false,
    )) as ChatCompletionResponse;
    return response;
  }

  async *generateStream(
    promptOrOptions: string | TemplatePayload,
  ): AsyncGenerator<string> {
    const payload: TemplatePayload | MessagePayload =
      typeof promptOrOptions === 'string'
        ? ({
            messages: [{ role: 'user', content: promptOrOptions }],
          } as MessagePayload)
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

          // Check if this is an error response
          if ('error' in parsed) {
            this.logger.error('Stream error from AI gateway:', parsed.error);
            throw new Error(`AI Gateway error: ${parsed.error}`);
          }

          // Safely access the content
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch (error) {
          this.logger.error('Error parsing stream chunk:', message, error);
          throw error;
        }
      }
    }
  }
}
