import { Module } from '@nestjs/common';

import { MinioModule } from './minio/minio.module';

import { SourceController } from './source.controller';
import { SourceService } from './source.service';

@Module({
  imports: [MinioModule.registerAsync()],
  controllers: [SourceController],
  providers: [SourceService],
})
export class SourceModule {}
