import { IsUUID, IsString, IsArray, IsOptional } from 'class-validator';

export class UpdateLibraryDto {
  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  title?: string;
}

export class CreateLibraryDtoApiRequest {
  @IsString()
  icon!: string;

  @IsString()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsString()
  title!: string;

  @IsString()
  defaultEmbeddingModel!: string;
}

export class CreateLibraryDto {
  @IsUUID()
  userId!: string;

  @IsString()
  icon!: string;

  @IsString()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsString()
  title!: string;

  @IsString()
  defaultEmbeddingModel!: string;
}
