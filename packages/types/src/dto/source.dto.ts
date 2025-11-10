import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSourceDto {
  @IsNotEmpty()
  @IsUUID()
  libraryId!: string;
}

export class UpdateSourceDto {
  @IsOptional()
  @IsString()
  name?: string;
}
