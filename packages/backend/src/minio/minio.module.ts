import { Global, Module, DynamicModule } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import * as Minio from 'minio';
import { MINIO_TOKEN } from './minio.decorator';

@Global()
@Module({})
export class MinioModule {
  static registerAsync(): DynamicModule {
    return {
      module: MinioModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: MINIO_TOKEN,
          inject: [ConfigService],
          useFactory: (cs: ConfigService): Minio.Client => {
            return new Minio.Client({
              endPoint: cs.get('MINIO_ENDPOINT') || 'localhost',
              port: cs.get('MINIO_PORT') || 9000,
              useSSL: cs.get('MINIO_USE_SSL') === 'true',
              accessKey: cs.get('MINIO_ACCESS_KEY') || '',
              secretKey: cs.get('MINIO_SECRET_KEY') || '',
            });
          },
        },
      ],
      exports: [MINIO_TOKEN],
    };
  }
}
