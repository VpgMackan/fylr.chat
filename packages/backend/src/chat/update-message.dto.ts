import { Transform } from 'class-transformer';
import { IsString, IsObject, IsOptional } from 'class-validator';

export class UpdateMessageDto {
  @IsString()
  @IsOptional()
  role: string;

  @IsString()
  @IsOptional()
  content: string;

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
  metadata: object;
}
