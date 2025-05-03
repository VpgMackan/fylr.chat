import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';

@Injectable()
export class AiVectorService {
  constructor(private readonly configService: ConfigService) {}

  async generate(
    text: string,
    model: string,
    options: Record<string, any>,
  ): Promise<number[]> {
    const data = {
      model: 'jina-clip-v2',
      input: [{ text }],
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configService.getOrThrow<string>('JINA_API_KEY')}`,
    };

    try {
      const response = await fetch(
        `${this.configService.getOrThrow<string>('JINA_API_URL')}/embeddings`,
        {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `Error fetching embeddings: ${response.status} ${response.statusText}`,
          errorBody,
        );
        throw new Error(`Failed to fetch embeddings: ${response.statusText}`);
      }

      const responseData = (await response.json()) as {
        data: { embedding: number[] }[];
      };

      if (responseData?.data?.[0]?.embedding) {
        return responseData.data[0].embedding;
      } else {
        console.error('Unexpected response structure:', responseData);
        throw new Error('Failed to extract embeddings from response');
      }
    } catch (error) {
      console.error('Error calling Jina API:', error);
      throw error;
    }
  }

  async search(
    text: string,
    model: string,
    options: Record<string, any>,
  ): Promise<number[]> {
    const data = {
      model: 'jina-clip-v2',
      task: 'retrieval.query',
      input: [{ text }],
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configService.getOrThrow<string>('JINA_API_KEY')}`,
    };

    try {
      const response = await fetch(
        `${this.configService.getOrThrow<string>('JINA_API_URL')}/embeddings`,
        {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `Error fetching embeddings: ${response.status} ${response.statusText}`,
          errorBody,
        );
        throw new Error(`Failed to fetch embeddings: ${response.statusText}`);
      }

      const responseData = (await response.json()) as {
        data: { embedding: number[] }[];
      };

      if (responseData?.data?.[0]?.embedding) {
        return responseData.data[0].embedding;
      } else {
        console.error('Unexpected response structure:', responseData);
        throw new Error('Failed to extract embeddings from response');
      }
    } catch (error) {
      console.error('Error calling Jina API:', error);
      throw error;
    }
  }
}
