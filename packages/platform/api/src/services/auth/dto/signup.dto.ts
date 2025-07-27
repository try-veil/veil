import { IsEmail, IsNotEmpty, IsString, MinLength, IsIn } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(7)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn(['provider', 'consumer'])
  role: string;
} 