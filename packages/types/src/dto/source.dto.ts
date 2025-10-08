import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateSourceDto {
  @IsNotEmpty()
  @IsUUID()
  libraryId!: string;
}
