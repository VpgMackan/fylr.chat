import { IsUUID, IsString, IsArray, IsOptional } from "class-validator";

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

  @IsOptional()
  @IsString()
  title?: string;
}

export class CreatePocketDtoApiRequest {
  @IsString()
  icon!: string;

  @IsString()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsString()
  title!: string;
}

export class CreatePocketDto {
  @IsUUID()
  userId!: string;

  @IsString()
  icon!: string;

  @IsString()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsString()
  title!: string;
}
