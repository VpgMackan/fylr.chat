import { Inject } from '@nestjs/common';
export const MINIO_TOKEN = 'MINIO_INJECT_TOKEN';
export const InjectMinio = () => Inject(MINIO_TOKEN);
