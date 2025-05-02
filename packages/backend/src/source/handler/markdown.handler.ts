import { Injectable, Logger } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import pgvector from 'pgvector';

import { ContentHandler } from './content-handler.interface';
import { Vector } from './vector.entity';

import { AiService } from 'src/aiService/ai.service';

@Injectable()
export class MarkdownHandler implements ContentHandler {
  readonly supportedMimeTypes = ['text/plain', 'text/markdown'];
  private readonly logger = new Logger(MarkdownHandler.name);

  constructor(
    @InjectRepository(Vector)
    private vectorRepository: Repository<Vector>,
    private readonly aiService: AiService,
  ) {}

  async handle(buffer: Buffer, jobKey: string): Promise<void> {
    this.logger.log(`Chunking & vectorizing markdown for job ${jobKey}`);

    const text = buffer.toString('utf-8');
    const maxChunkSize = 1000;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += maxChunkSize) {
      chunks.push(text.slice(i, i + maxChunkSize));
    }
    this.logger.log(`Split markdown into ${chunks.length} chunks`);

    const vectors: Vector[] = [];
    for (const content of chunks) {
      const embedding = await this.aiService.vector.generate(
        content,
        'your-model-name',
        {},
      );
      vectors.push(
        this.vectorRepository.create({
          fileId: '',
          embedding: pgvector.toSql([]),
          content: content,
        }),
      );
    }

    await this.vectorRepository.save(vectors);
  }
}
