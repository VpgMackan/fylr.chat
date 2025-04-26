import { Injectable } from '@nestjs/common';
import { MinioService } from './minio/minio.service';

@Injectable()
export class SourceService {
  constructor(private readonly minioService: MinioService) {}
}
