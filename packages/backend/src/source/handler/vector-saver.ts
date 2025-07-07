import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as pgvector from 'pgvector';

import { Vector } from './vector.entity';
import { AiService } from 'src/aiService/ai.service';

@Injectable()
export class VectorSaver {
  private readonly logger = new Logger(VectorSaver.name);

  constructor(
    @InjectRepository(Vector)
    private vectorRepository: Repository<Vector>,
    private readonly aiService: AiService,
  ) {}

  async saveTextChunksAsVectors(
    chunks: string[],
    fileId: string,
    jobKey: string,
  ): Promise<void> {
    this.logger.log(
      `Vectorizing and saving ${chunks.length} chunks for job ${jobKey}`,
    );
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
            content,
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
}
