import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { MinioModule } from './minio/minio.module';
import { MinioService } from './minio/minio.service';

import { SourceController } from './source.controller';
import { SourceService } from './source.service';
import { SourceProcessor } from './source.processor';
import { Source } from './source.entity';

import { AuthModule } from 'src/auth/auth.module';
import { EventsModule } from 'src/events/events.module';
import { ContentModule } from './handler/handler.module';

import { AiModule } from 'src/aiService/aiService.module';
@Module({
  imports: [
    MinioModule.registerAsync(),
    TypeOrmModule.forFeature([Source]),
    MulterModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        dest: configService.get<string>('TEMP_FILE_DIR'),
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'file-processing',
    }),
    AuthModule,
    EventsModule,
    ContentModule,
    AiModule,
  ],
  controllers: [SourceController],
  providers: [SourceService, SourceProcessor, MinioService],
})
export class SourceModule {}
