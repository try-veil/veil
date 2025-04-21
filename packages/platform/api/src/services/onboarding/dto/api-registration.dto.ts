import {
  IsString,
  IsArray,
  IsOptional,
  IsUrl,
  ValidateNested,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiStatus } from '@prisma/client';

export class HeaderParameterDto {
  name: string;
  value: string;
  is_variable: boolean;
}

export class ParameterDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsBoolean()
  required: boolean;
}

export class ApiKeyDto {
  @IsString()
  key: string;

  @IsString()
  name: string;

  @IsBoolean()
  is_active: boolean;
}

export class ApiRegistrationRequestDto {
  @IsString()
  api_id: string;

  @IsNumber()
  project_id: number;

  @IsString()
  name: string;

  @IsString()
  path: string;

  @IsString()
  target_url: string;

  @IsString()
  method: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  documentation_url?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeaderParameterDto)
  @IsOptional()
  required_headers?: HeaderParameterDto[];

  @IsOptional()
  specification?: any;

  @IsString()
  version: string;

  @IsString()
  @IsOptional()
  required_subscription?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParameterDto)
  @IsOptional()
  parameters?: ParameterDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApiKeyDto)
  @IsOptional()
  api_keys?: ApiKeyDto[];
}

// Added DTO for specific fields needed by GatewayService.onboardApi
export class CaddyOnboardingRequestDto {
  @IsString()
  path: string;

  @IsString()
  target_url: string;

  @IsString()
  method: string;

  @IsString()
  @IsOptional()
  required_subscription?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeaderParameterDto)
  @IsOptional()
  required_headers?: HeaderParameterDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParameterDto)
  @IsOptional()
  parameters?: ParameterDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApiKeyDto)
  @IsOptional()
  api_keys?: ApiKeyDto[];
}

export class ApiRegistrationResponseDto {
  api_id: string;
  status: string;
  created_at: Date;
}

export class ApiDetailsResponseDto {
  api_id: string;
  name: string;
  path: string;
  method: string;
  description?: string;
  documentation_url?: string;
  required_headers: HeaderParameterDto[];
  status: ApiStatus;
  created_at: Date;
  updated_at: Date;
}
