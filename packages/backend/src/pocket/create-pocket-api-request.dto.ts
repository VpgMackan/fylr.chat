import { IsString, IsArray } from 'class-validator';

export class CreatePocketDtoApiRequest {
  @IsString()
  icon: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
