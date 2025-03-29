import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsUrl,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ApiKey {
  @IsString()
  key: string;

  @IsString()
  name: string;
}

export class OnboardingDto {
  @IsString()
  path: string;

  // TODO :: explore more options
  @IsUrl({ require_tld: false }) // allows localhost
  baseUrl: string;

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => value.map((method: string) => method.toUpperCase()))
  @IsIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], { each: true })
  allowedMethods: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.toLowerCase())
  @IsIn(['free', 'pro'])
  tier: string;

  @IsOptional()
  @IsArray()
  @IsIn(['string'], { each: true })
  requiredHeaders: string[];

  @IsOptional()
  @IsArray()
  @IsIn(['string'], { each: true })
  optionalHeaders: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApiKey)
  apiKeys: ApiKey[];
}
