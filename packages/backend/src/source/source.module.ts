import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MinioModule } from './minio/minio.module';
import { MinioService } from './minio/minio.service';

import { SourceController } from './source.controller';
import { SourceService } from './source.service';
import { Source } from './source.entity';

@Module({
  imports: [MinioModule.registerAsync(), TypeOrmModule.forFeature([Source])],
  controllers: [SourceController],
  providers: [SourceService, MinioService],
})
export class SourceModule {}
