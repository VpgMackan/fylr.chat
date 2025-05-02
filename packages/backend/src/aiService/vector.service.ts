import { Injectable } from '@nestjs/common';

@Injectable()
export class AiVectorService {
  async generate(
    text: string,
    model: string,
    options: Record<string, any>,
  ): Promise<number[]> {
    // call your embedding API and return the numeric vector
    // e.g. const response = await openai.createEmbedding({ model, input: text })
    // return response.data[0].embedding
    return []; // stub
  }
}
