import { Injectable, Logger } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as pgvector from 'pgvector';

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

  async handle(buffer: Buffer, jobKey: string, fileId: string): Promise<void> {
    this.logger.log(`Chunking & vectorizing markdown for job ${jobKey}`);

    const text = buffer.toString('utf-8');
    const chunks: string[] = this.segmentText(text);

    this.logger.log(`Split markdown into ${chunks.length} chunks`);

    const vectors: Vector[] = [];
    for (const content of chunks) {
      const embedding = await this.aiService.vector.generate(
        content,
        'your-model-name',
        {},
      );

      if (embedding) {
        this.logger.log(embedding);
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

  // ...existing code...
  private segmentText(text: string, maxChunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/(\r?\n\r?\n)/).filter(Boolean);

    let currentChunk = '';
    let currentSize = 0;

    for (const part of paragraphs) {
      const partLength = part.length;

      if (partLength > maxChunkSize) {
        if (currentSize > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
          currentSize = 0;
        }

        const sentences = part
          .split(/((?<=[.?!])\s+|(?<=\r?\n))/g)
          .filter(Boolean);
        for (const sentence of sentences) {
          const sentenceLength = sentence.length;
          if (sentenceLength > maxChunkSize) {
            if (currentSize > 0) {
              chunks.push(currentChunk.trim());
            }
            chunks.push(sentence.trim());
            currentChunk = '';
            currentSize = 0;
          } else if (currentSize + sentenceLength <= maxChunkSize) {
            currentChunk += sentence;
            currentSize += sentenceLength;
          } else {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
            currentSize = sentenceLength;
          }
        }
        continue;
      }
      if (currentSize + partLength <= maxChunkSize) {
        currentChunk += part;
        currentSize += partLength;
      } else {
        if (currentSize > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = part;
        currentSize = partLength;
      }
    }

    if (currentSize > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }
}
