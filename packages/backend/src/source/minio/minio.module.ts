import { Global, Module, DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { MINIO_TOKEN } from './minio.decorator';
import { MinioService } from './minio.service';

@Global()
@Module({})
export class MinioModule {
  static registerAsync(): DynamicModule {
    return {
      module: MinioModule,
      providers: [
        {
          provide: MINIO_TOKEN,
          inject: [ConfigService],
          useFactory: (cs: ConfigService): Minio.Client => {
            return new Minio.Client({
              endPoint: cs.getOrThrow('MINIO_ENDPOINT'),
              port: parseInt(cs.getOrThrow('MINIO_PORT'), 10),
              useSSL: cs.getOrThrow('MINIO_USE_SSL') === 'true',
              accessKey: cs.getOrThrow('MINIO_ACCESS_KEY'),
              secretKey: cs.getOrThrow('MINIO_SECRET_KEY'),
            });
          },
        },
        MinioService,
      ],
      exports: [MINIO_TOKEN, MinioService],
    };
  }
}
