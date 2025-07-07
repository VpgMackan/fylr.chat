import { Transform } from 'class-transformer';
import {
  IsString,
  IsObject,
  IsOptional,
  IsNotEmpty,
  IsArray,
  IsUUID,
} from 'class-validator';

export class UpdateMessageDto {
  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsObject()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        throw new Error('Invalid JSON format for metadata');
      }
    }
    return value;
  })
  metadata?: object;
}

export class UpdateConversationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsObject()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        throw new Error('Invalid JSON format for metadata');
      }
    }
    return value;
  })
  metadata?: object;
}

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsObject()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        throw new Error('Invalid JSON format for metadata');
      }
    }
    return value;
  })
  metadata!: object;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  sourceIds?: string[];
}

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsObject()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        throw new Error('Invalid JSON format for metadata');
      }
    }
    return value;
  })
  metadata!: object;
}
