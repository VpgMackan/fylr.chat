import { Inject, Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MinioService } from './minio/minio.service';

import { Source } from './source.entity';

@Injectable()
export class SourceService {
  constructor(
    @InjectRepository(Source)
    private sourceRepository: Repository<Source>,
    private readonly minioService: MinioService,
  ) {}

  /**
   * Add handeling to create source
   * Add handeling to show file from bucket
   * Add handeling to remove source
   */
}
