import { Injectable, Logger } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as pgvector from 'pgvector';

import { ContentHandler } from './content-handler.interface';
import { Vector } from './vector.entity';

import { AiService } from 'src/aiService/ai.service';

type ChunkStrategy = 'fixed' | 'sentence';

interface ChunkOptions {
  strategy?: ChunkStrategy;
  chunkSize?: number; // in characters
  chunkOverlap?: number; // in characters
}

@Injectable()
export class MarkdownHandler implements ContentHandler {
  readonly supportedMimeTypes = ['text/plain', 'text/markdown'];
  private readonly logger = new Logger(MarkdownHandler.name);

  constructor(
    @InjectRepository(Vector)
    private vectorRepository: Repository<Vector>,
    private readonly aiService: AiService,
  ) {}

  async handle(buffer: Buffer, jobKey: string, fileId: string): Promise<void> {
    this.logger.log(`Chunking & vectorizing markdown for job ${jobKey}`);

    const text = buffer.toString('utf-8');
    const chunks: string[] = this.segmentText(text);

    this.logger.log(`Split markdown into ${chunks.length} chunks`);

    const vectors: Vector[] = [];
    for (const content of chunks) {
      const embedding = await this.aiService.vector.generate(
        content,
        'jina-clip-v2',
        {},
      );

      if (embedding) {
        vectors.push(
          this.vectorRepository.create({
            fileId,
            embedding: pgvector.toSql(embedding),
            content: content,
          }),
        );
      } else {
        this.logger.warn(
          `Failed to generate embedding for chunk in job ${jobKey}, file ${fileId}. Skipping chunk.`,
        );
      }
    }

    if (vectors.length > 0) {
      await this.vectorRepository.save(vectors);
    } else {
      this.logger.warn(
        `No vectors were generated for job ${jobKey}, file ${fileId}.`,
      );
    }
  }

  private segmentText(text: string, opts: ChunkOptions = {}): string[] {
    const { strategy = 'fixed', chunkSize = 1000, chunkOverlap = 0 } = opts;

    if (strategy === 'fixed') {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
        chunks.push(text.slice(i, i + chunkSize));
      }
      return chunks;
    }

    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      if ((current + sentence).length > chunkSize && current.length > 0) {
        chunks.push(current.trim());
        current = current.slice(-chunkOverlap);
      }
      current += sentence;
    }
    if (current.trim()) {
      chunks.push(current.trim());
    }
    return chunks;
  }
}
