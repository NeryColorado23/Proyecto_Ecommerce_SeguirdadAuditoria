import { IsEmail } from 'class-validator';

export class CheckLoginLockDto {
  @IsEmail()
  email!: string;
}
