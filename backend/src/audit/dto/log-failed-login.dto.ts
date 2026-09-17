import { IsEmail } from 'class-validator';

export class LogFailedLoginDto {
  @IsEmail()
  email!: string;
}
