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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HeaderParameterDto {
  @ApiProperty({ description: 'Name of the header', example: 'X-API-Key' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Value of the header', example: 'your-api-key' })
  @IsString()
  value: string;

  @ApiProperty({
    description: 'Whether the value is a variable',
    example: false,
  })
  @IsBoolean()
  is_variable: boolean;
}

export class ParameterDto {
  @ApiProperty({ description: 'Name of the parameter', example: 'userId' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Type of the parameter', example: 'string' })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Whether the parameter is required',
    example: true,
  })
  @IsBoolean()
  required: boolean;
}

export class ApiKeyDto {
  @ApiProperty({ description: 'API key', example: 'pk_test_123456789' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Name of the API key', example: 'Test Key' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Whether the API key is active', example: true })
  @IsBoolean()
  is_active: boolean;
}

export class ApiRegistrationRequestDto {
  @ApiProperty({
    description: 'Unique identifier for the API',
    example: 'payment-api-v1',
  })
  @IsString()
  api_id: string;

  @ApiProperty({
    description: 'Project ID that this API belongs to',
    example: 1,
  })
  @IsNumber()
  project_id: number;

  @ApiProperty({
    description: 'Display name of the API',
    example: 'Payment Processing API',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Path for accessing the API',
    example: '/api/payments',
  })
  @IsString()
  path: string;

  @ApiProperty({
    description: 'Target URL where the request will be forwarded',
    example: 'https://api.example.com/payments',
  })
  @IsString()
  target_url: string;

  @ApiProperty({ description: 'HTTP method for the API', example: 'POST' })
  @IsString()
  method: string;

  @ApiPropertyOptional({
    description: 'Description of the API',
    example: 'Process payment transactions',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL to the API documentation',
    example: 'https://docs.example.com/api/payments',
  })
  @IsOptional()
  documentation_url?: string;

  @ApiPropertyOptional({
    description: 'Required headers for the API',
    type: [HeaderParameterDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeaderParameterDto)
  @IsOptional()
  required_headers?: HeaderParameterDto[];

  @ApiPropertyOptional({
    description: 'API specification (OpenAPI/Swagger)',
    type: Object,
  })
  @IsOptional()
  specification?: any;

  @ApiProperty({ description: 'Version of the API', example: '1.0.0' })
  @IsString()
  version: string;

  @ApiPropertyOptional({
    description: 'Required subscription level',
    example: 'premium',
  })
  @IsString()
  @IsOptional()
  required_subscription?: string;

  @ApiPropertyOptional({
    description: 'Parameters for the API',
    type: [ParameterDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParameterDto)
  @IsOptional()
  parameters?: ParameterDto[];

  @ApiPropertyOptional({
    description: 'API keys that can access this API',
    type: [ApiKeyDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApiKeyDto)
  @IsOptional()
  api_keys?: ApiKeyDto[];
}

// Added DTO for specific fields needed by GatewayService.onboardApi
export class CaddyOnboardingRequestDto {
  @ApiProperty({
    description: 'Path for accessing the API',
    example: '/api/payments',
  })
  @IsString()
  path: string;

  @ApiProperty({
    description: 'Target URL where the request will be forwarded',
    example: 'https://api.example.com/payments',
  })
  @IsString()
  target_url: string;

  @ApiProperty({ description: 'HTTP method for the API', example: 'POST' })
  @IsString()
  method: string;

  @ApiPropertyOptional({
    description: 'Required subscription level',
    example: 'premium',
  })
  @IsString()
  @IsOptional()
  required_subscription?: string;

  @ApiPropertyOptional({
    description: 'Required headers for the API',
    type: [HeaderParameterDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeaderParameterDto)
  @IsOptional()
  required_headers?: HeaderParameterDto[];

  @ApiPropertyOptional({
    description: 'Parameters for the API',
    type: [ParameterDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParameterDto)
  @IsOptional()
  parameters?: ParameterDto[];

  @ApiPropertyOptional({
    description: 'API keys that can access this API',
    type: [ApiKeyDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApiKeyDto)
  @IsOptional()
  api_keys?: ApiKeyDto[];
}

export class ApiRegistrationResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the API',
    example: 'payment-api-v1',
  })
  api_id: string;

  @ApiProperty({
    description: 'Status of the API registration',
    example: 'ACTIVE',
  })
  status: string;

  @ApiProperty({
    description: 'When the API was created',
    example: '2023-01-01T00:00:00Z',
  })
  created_at: Date;
}

export class ApiDetailsResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the API',
    example: 'payment-api-v1',
  })
  api_id: string;

  @ApiProperty({
    description: 'Display name of the API',
    example: 'Payment Processing API',
  })
  name: string;

  @ApiProperty({
    description: 'Path for accessing the API',
    example: '/api/payments',
  })
  path: string;

  @ApiProperty({ description: 'HTTP method for the API', example: 'POST' })
  method: string;

  @ApiProperty({
    description: 'Version of the API',
    example: '1.0.0',
  })
  version: string;


  @ApiPropertyOptional({
    description: 'Description of the API',
    example: 'Process payment transactions',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'URL to the API documentation',
    example: 'https://docs.example.com/api/payments',
  })
  documentation_url?: string;

  @ApiProperty({
    description: 'Required headers for the API',
    type: [HeaderParameterDto],
  })
  required_headers: HeaderParameterDto[];

  @ApiProperty({
    description: 'Status of the API',
    enum: ApiStatus,
    example: 'ACTIVE',
  })
  status: ApiStatus;

  @ApiProperty({
    description: 'When the API was created',
    example: '2023-01-01T00:00:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'When the API was last updated',
    example: '2023-01-01T00:00:00Z',
  })
  updated_at: Date;
}
