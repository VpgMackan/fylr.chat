import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class LLMService {
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
}
