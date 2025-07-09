import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

import { RabbitMQService } from '../utils/rabbitmq.service';

import { S3Module } from './s3/s3.module';
import { S3Service } from './s3/s3.service';

import { SourceController } from './source.controller';
import { SourceService } from './source.service';
import { SourceProcessor } from './source.processor';
import { Source } from './source.entity';
import { Vector } from './handler/vector.entity';

import { AuthModule } from 'src/auth/auth.module';
import { EventsModule } from 'src/events/events.module';
import { ContentModule } from './handler/handler.module';

import { AiModule } from 'src/aiService/aiService.module';
@Module({
  imports: [
    S3Module.registerAsync(),
    TypeOrmModule.forFeature([Source, Vector]),
    MulterModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        dest: configService.get<string>('TEMP_FILE_DIR'),
      }),
      inject: [ConfigService],
    }),
    // BullModule removed, using RabbitMQService instead
    AuthModule,
    EventsModule,
    ContentModule,
    AiModule,
  ],
  controllers: [SourceController],
  providers: [SourceService, SourceProcessor, S3Service, RabbitMQService],
  exports: [SourceService],
})
export class SourceModule {}
