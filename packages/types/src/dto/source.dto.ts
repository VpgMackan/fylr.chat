import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateSourceDto {
  @IsNotEmpty()
  @IsUUID()
  pocketId!: string;
}
