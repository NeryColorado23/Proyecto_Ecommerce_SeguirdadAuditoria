import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateListingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  asin!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  bullet_1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  bullet_2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  bullet_3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  bullet_4?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  bullet_5?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
