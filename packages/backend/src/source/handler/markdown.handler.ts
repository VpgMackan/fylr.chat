import { Injectable, Logger } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ContentHandler } from './content-handler.interface';
import { Vector } from './vector.entity';

@Injectable()
export class MarkdownHandler implements ContentHandler {
  readonly supportedMimeTypes = ['text/plain', 'text/markdown'];
  private readonly logger = new Logger(MarkdownHandler.name);
  @InjectRepository(Vector)
  private vectorRepository: Repository<Vector>;

  async handle(buffer: Buffer, jobKey: string): Promise<void> {
    this.logger.log(`Chunking & vectorizing markdown for job ${jobKey}`);

    const text = buffer.toString('utf-8');
    const maxChunkSize = 1000;
    const chunks: string[] = [];

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + maxChunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end;
    }

    this.logger.log(`Split markdown into ${chunks.length} chunks`);
    // TODO: Convert chunks to vectors and persist
  }
}
