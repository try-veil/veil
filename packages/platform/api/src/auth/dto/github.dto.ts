import { IsNotEmpty, IsString } from 'class-validator';
export class GithubLoginDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
