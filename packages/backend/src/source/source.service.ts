import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MinioService } from './minio/minio.service';

import { Source } from './source.entity';
import { toSql } from 'pgvector';
import { Vector } from './handler/vector.entity';

@Injectable()
export class SourceService {
  constructor(
    @InjectRepository(Source)
    private sourceRepository: Repository<Source>,
    @InjectRepository(Vector)
    private vectorRepository: Repository<Vector>,
    private readonly minioService: MinioService,
  ) {}

  async createSourceDatabaseEntry(data) {
    const newSoruce = this.sourceRepository.create(data);
    await this.sourceRepository.save(newSoruce);
    return newSoruce;
  }

  async findByVector(vector, pocketId) {
    return await this.vectorRepository
      .createQueryBuilder('vector')
      .innerJoinAndSelect('vector.source', 'source')
      .where('source.pocketId = :pocketId', { pocketId })
      .orderBy('vector.embedding <-> :embedding')
      .setParameters({ embedding: toSql(vector) })
      .limit(5)
      .select([
        'vector.id',
        'vector.fileId',
        'vector.content',
        'source.id',
        'source.pocketId',
      ])
      .getMany();
  }
}
