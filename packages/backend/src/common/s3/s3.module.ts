import { Global, Module, DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { S3_TOKEN } from './s3.decorator';
import { S3Service } from './s3.service';

@Global()
@Module({})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class S3Module {
  static registerAsync(): DynamicModule {
    return {
      module: S3Module,
      providers: [
        {
          provide: S3_TOKEN,
          inject: [ConfigService],
          useFactory: (cs: ConfigService): S3Client => {
            const endpoint = cs.getOrThrow('S3_ENDPOINT');
            const port = cs.getOrThrow('S3_PORT');

            return new S3Client({
              endpoint: `http://${endpoint}:${port}`,
              region: 'garage',
              credentials: {
                accessKeyId: cs.getOrThrow('S3_KEY_ID'),
                secretAccessKey: cs.getOrThrow('S3_SECRET_KEY'),
              },
              forcePathStyle: true,
            });
          },
        },
        S3Service,
      ],
      exports: [S3_TOKEN, S3Service],
    };
  }
}
