import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { MinioModule } from './minio/minio.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PocketsController } from './pockets/pockets.controller';
import { PocketsService } from './pockets/pockets.service';
import { FileService } from './file.service';

@Module({
  imports: [ConfigModule.forRoot(), MinioModule.registerAsync()],
  controllers: [AppController, PocketsController],
  providers: [AppService, PocketsService, FileService],
})
export class AppModule {}
