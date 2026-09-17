import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConsumeRecoveryCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code!: string;
}
