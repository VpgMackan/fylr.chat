import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

import { MinioModule } from './minio/minio.module';
import { MinioService } from './minio/minio.service';

import { SourceController } from './source.controller';
import { SourceService } from './source.service';
import { Source } from './source.entity';

import { AuthModule } from 'src/auth/auth.module';

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
    AuthModule,
  ],
  controllers: [SourceController],
  providers: [SourceService, MinioService],
})
export class SourceModule {}
