import { Injectable, Logger } from '@nestjs/common';
import { ContentHandler } from './content-handler.interface';
import { VectorSaver } from './vector-saver';

export type ChunkStrategy = 'fixed' | 'sentence';

export interface ChunkOptions {
  strategy?: ChunkStrategy;
  chunkSize?: number;
  chunkOverlap?: number;
}

@Injectable()
export class MarkdownHandler implements ContentHandler {
  readonly supportedMimeTypes = [
    'text/plain',
    'text/markdown',
    'application/octet-stream',
  ];
  private readonly logger = new Logger(MarkdownHandler.name);

  constructor(private readonly vectorSaver: VectorSaver) {}

  segmentText(text: string, opts: ChunkOptions = {}): string[] {
    const { strategy = 'fixed', chunkSize = 1000, chunkOverlap = 0 } = opts;

    if (strategy === 'fixed') {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
        chunks.push(text.slice(i, i + chunkSize));
      }
      return chunks;
    }

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
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

  async handle(buffer: Buffer, jobKey: string, fileId: string): Promise<void> {
    this.logger.log(`Chunking & vectorizing markdown for job ${jobKey}`);

    const text = buffer.toString('utf-8');
    const chunks: string[] = this.segmentText(text);
    this.logger.log(`Split markdown into ${chunks.length} chunks`);
    await this.vectorSaver.saveTextChunksAsVectors(chunks, fileId, jobKey);
  }
}
