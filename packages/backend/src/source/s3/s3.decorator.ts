import { Inject } from '@nestjs/common';
export const S3_TOKEN = 'S3_INJECT_TOKEN';
export const InjectS3 = () => Inject(S3_TOKEN);
