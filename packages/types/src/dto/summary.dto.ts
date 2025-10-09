import { Type } from 'class-transformer';
import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class CreateSummaryEpisodeDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  focus?: string;
}

export class CreateSummaryDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSummaryEpisodeDto)
  episodes!: CreateSummaryEpisodeDto[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  libraryIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  sourceIds?: string[];
}
