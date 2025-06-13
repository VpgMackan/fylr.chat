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

  async generate(prompt: string): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'OpenAI API key is not configured',
      );
    }

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          'https://litellm.katt.gdn/v1/chat/completions',
          {
            model: 'groq/llama3-70b-8192',
            messages: [{ role: 'user', content: prompt }],
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const choice = response.data.choices?.[0]?.message?.content;
      if (!choice) {
        throw new InternalServerErrorException('OpenAI returned no content');
      }
      return choice;
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const data = error.response?.data;
        throw new InternalServerErrorException(
          `OpenAI API error (${status}): ${JSON.stringify(data)}`,
        );
      }
      throw new InternalServerErrorException('Failed to generate AI response');
    }
  }

  async *generateStream(prompt: string): AsyncGenerator<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'OpenAI API key is not configured',
      );
    }

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          'https://litellm.katt.gdn/v1/chat/completions',
          {
            model: 'groq/llama3-70b-8192',
            messages: [{ role: 'user', content: prompt }],
            stream: true,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            responseType: 'stream',
          },
        ),
      );

      const stream = response.data as NodeJS.ReadableStream;

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
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        this.logger.error(
          `OpenAI API stream error (${status})`,
          error.response?.data,
        );
        throw new InternalServerErrorException(
          `OpenAI API stream error (${status})`,
        );
      }
      this.logger.error('Failed to generate AI stream', error);
      throw new InternalServerErrorException(
        'Failed to generate AI response stream',
      );
    }
  }
}
