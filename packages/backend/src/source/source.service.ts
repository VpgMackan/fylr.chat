import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { S3Service } from './s3/s3.service';

import { Source } from './source.entity';
import { toSql } from 'pgvector';
import { Vector } from './handler/vector.entity';
import { S3 } from '@aws-sdk/client-s3';

@Injectable()
export class SourceService {
  constructor(
    @InjectRepository(Source)
    private sourceRepository: Repository<Source>,
    @InjectRepository(Vector)
    private vectorRepository: Repository<Vector>,
    private readonly S3Service: S3Service,
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
