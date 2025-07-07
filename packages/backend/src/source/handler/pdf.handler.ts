import { Injectable, Logger } from '@nestjs/common';
import * as pdf from 'pdf-parse';
import { ContentHandler } from './content-handler.interface';
import { VectorSaver } from './vector-saver';

export type ChunkStrategy = 'fixed' | 'sentence';

export interface ChunkOptions {
  strategy?: ChunkStrategy;
  chunkSize?: number;
  chunkOverlap?: number;
}

@Injectable()
export class PdfHandler implements ContentHandler {
  readonly supportedMimeTypes = ['application/pdf'];
  private readonly logger = new Logger(PdfHandler.name);

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
    this.logger.log(`Parsing and vectorizing PDF for job ${jobKey}`);

    try {
      const data = await pdf(buffer);
      const text = data.text;

      if (!text || text.trim().length === 0) {
        this.logger.warn(`No text extracted from PDF for job ${jobKey}`);
        return;
      }

      const chunks: string[] = this.segmentText(text);
      this.logger.log(`Split PDF into ${chunks.length} chunks`);
      await this.vectorSaver.saveTextChunksAsVectors(chunks, fileId, jobKey);
    } catch (error) {
      this.logger.error(`Failed to parse PDF for job ${jobKey}:`, error);
      throw error;
    }
  }
}
