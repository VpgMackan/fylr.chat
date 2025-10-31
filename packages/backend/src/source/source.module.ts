import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

import { RabbitMQService } from '../utils/rabbitmq.service';

import { S3Module } from 'src/common/s3/s3.module';
import { S3Service } from 'src/common/s3/s3.service';

import { SourceController } from './source.controller';
import { SourceService } from './source.service';

import { AuthModule } from 'src/auth/auth.module';
import { EventsModule } from 'src/events/events.module';
import { PermissionsService } from 'src/auth/permissions.service';

@Module({
  imports: [
    S3Module.registerAsync(),
    MulterModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        storage: diskStorage({
          destination: configService.get<string>('TEMP_FILE_DIR'),
          filename: (_req, file, cb) => {
            const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
            cb(null, uniqueName);
          },
        }),
        limits: {
          fileSize: 100 * 1024 * 1024, // 100MB
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    EventsModule,
  ],
  controllers: [SourceController],
  providers: [SourceService, S3Service, RabbitMQService, PermissionsService],
  exports: [SourceService],
})
export class SourceModule {}
