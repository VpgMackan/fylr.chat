import { Transform } from 'class-transformer';
import { IsString, IsObject, IsNotEmpty } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsNotEmpty()
  content: string;

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
  metadata: object;
}
