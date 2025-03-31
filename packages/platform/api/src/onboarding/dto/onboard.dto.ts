import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsUrl,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { HttpMethod } from '@prisma/client';

export class ApiKey {
  @IsString()
  key: string;

  @IsString()
  name: string;
}

export class OnboardingDto {
  @IsString()
  name: string;

  @IsString()
  path: string;

  @IsString()
  @IsOptional()
  description?: string;

  // TODO :: explore more options
  @IsUrl({ require_tld: false }) // allows localhost
  baseUrl: string;

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => value.map((method: string) => method.toUpperCase()))
  @IsEnum(HttpMethod, { each: true })
  allowedMethods: HttpMethod[];

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
