// filepath: d:\Programming\fylr.chat\packages\backend\src\config\config.ts
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  S3_ENDPOINT: string;

  @IsNumber()
  S3_PORT: number;

  @IsString()
  S3_KEY_ID: string;

  @IsString()
  S3_SECRET_KEY: string;

  @IsString()
  S3_REGION: string;

  @IsString()
  S3_BUCKET_USER_FILE: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRY: string;

  @IsString()
  TEMP_FILE_DIR: string;

  @IsNumber()
  PORT: number;

  @IsString()
  AI_GATEWAY_URL: string;

  @IsString()
  RABBITMQ_URL: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }
  return validatedConfig;
}
