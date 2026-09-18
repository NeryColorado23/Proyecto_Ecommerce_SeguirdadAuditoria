import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

const IMAGE_URL_OPTIONS = { protocols: ['http', 'https'], require_protocol: true };

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
  @ArrayMaxSize(10)
  @IsUrl(IMAGE_URL_OPTIONS, { each: true })
  images?: string[];
}
