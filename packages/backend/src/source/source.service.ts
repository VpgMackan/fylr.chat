import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Source } from './source.entity';
import { toSql } from 'pgvector';
import { Vector } from './handler/vector.entity';
import { S3Service } from './s3/s3.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SourceService {
  constructor(
    @InjectRepository(Source)
    private sourceRepository: Repository<Source>,
    @InjectRepository(Vector)
    private vectorRepository: Repository<Vector>,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  async createSourceDatabaseEntry(data) {
    const newSource = this.sourceRepository.create(data);
    await this.sourceRepository.save(newSource);
    return newSource;
  }

  async getSourcesByPocketId(pocketId: string) {
    return await this.sourceRepository.find({
      where: { pocketId },
      order: { uploadTime: 'DESC' },
    });
  }

  async findByVector(vector: number[], sourceIds: string[]) {
    if (sourceIds.length === 0) {
      return [];
    }
    return await this.vectorRepository
      .createQueryBuilder('vector')
      .innerJoinAndSelect('vector.source', 'source')
      .where('source.id IN (:...sourceIds)', { sourceIds })
      .orderBy('vector.embedding <-> :embedding')
      .setParameters({ embedding: toSql(vector) })
      .limit(5)
      .select([
        'vector.id',
        'vector.fileId',
        'vector.content',
        'source.id',
        'source.pocketId',
        'source.name',
      ])
      .getMany();
  }

  async getSourceURL(sourceId: string) {
    return this.sourceRepository.findOneBy({
      id: sourceId,
    });
  }

  async getFileStreamById(fileId: string) {
    // Find the source entry to get metadata
    const source = await this.sourceRepository.findOneBy({ id: fileId });
    if (!source) return null;
    const bucket = this.configService.get<string>('S3_BUCKET_USER_FILE');
    if (!bucket) throw new Error('S3_BUCKET_USER_FILE is not set in config');
    const stream = await this.s3Service.getObject(bucket, fileId);
    return {
      stream,
      contentType: source.type,
      filename: source.name,
    };
  }
}
