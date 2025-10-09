import {
  IsArray,
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreatePodcastDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  libraryIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  sourceIds?: string[];
}
