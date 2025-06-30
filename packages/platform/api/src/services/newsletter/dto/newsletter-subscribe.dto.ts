import { IsEmail, IsNotEmpty } from 'class-validator';

export class NewsletterSubscribeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
