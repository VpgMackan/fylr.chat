import { IsString, IsArray, IsUUID } from 'class-validator';

export class CreatePocketDto {
  @IsUUID()
  userId: string;

  @IsString()
  icon: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsString()
  title: string;
}
