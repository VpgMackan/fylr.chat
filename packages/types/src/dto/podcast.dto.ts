import {
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';



export class CreatePodcastDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}
