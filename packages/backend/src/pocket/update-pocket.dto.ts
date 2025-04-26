import { IsString, IsArray, IsOptional } from 'class-validator';

export class UpdatePocketDto {
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
}
