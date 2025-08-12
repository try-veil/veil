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
  @ApiProperty({ description: 'Name of the header', example: 'X-Subscription-Key' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Value of the header', example: 'test-key-95714b01-c8c7-4fb1-9779-8de3ed66d9bf' })
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
  @ApiProperty({ description: 'Name of the parameter', example: 'location' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Type of the parameter', example: 'string' })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Whether the parameter is required',
    example: false,
  })
  @IsBoolean()
  required: boolean;
}

export class ApiKeyDto {
  @ApiProperty({ description: 'API key', example: 'test-key-95714b01-c8c7-4fb1-9779-8de3ed66d9bf' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Name of the API key', example: 'Weather API Test Key' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Whether the API key is active', example: true })
  @IsBoolean()
  is_active: boolean;
}

export class QueryParameterDto {
  @ApiProperty({ description: 'Query parameter name', example: 'page' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Query parameter type', example: 'string' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Whether the query parameter is required', example: false })
  @IsBoolean()
  required: boolean;
}

export class MultipartFieldDto {
  @ApiProperty({ description: 'Field name', example: 'username' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Field value or example', example: 'john_doe' })
  @IsString()
  value: string;

  @ApiProperty({
    description: 'Field type',
    enum: ['text', 'file'],
    example: 'text'
  })
  @IsString()
  type: 'text' | 'file';

  @ApiProperty({ description: 'Whether the field is required', example: true })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ description: 'Human readable description of the field', example: 'User\'s username for login' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Content type for file fields', example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  content_type?: string;
}

export class BodyDto {
  @ApiProperty({
    description: 'Body type',
    enum: ['text', 'json', 'form-urlencoded', 'multipart', 'graphql'],
    example: 'json'
  })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Raw content for text/graphql' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'JSON data object' })
  @IsOptional()
  json_data?: any;

  @ApiPropertyOptional({
    description: 'Form data array for form-urlencoded (key-value pairs)',
    example: [{ key: 'username', value: 'john_doe' }]
  })
  @IsOptional()
  @IsArray()
  form_data?: { key: string; value: string }[];

  @ApiPropertyOptional({
    description: 'Multipart form fields',
    type: [MultipartFieldDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultipartFieldDto)
  multipart_data?: MultipartFieldDto[];
}

export class ApiRegistrationRequestDto {
  @ApiProperty({
    description: 'Unique identifier for the API',
    example: '95714b01-c8c7-4fb1-9779-8de3ed66d9bf',
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
    example: 'Weather Service API',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Path for accessing the API',
    example: '/95714b01-c8c7-4fb1-9779-8de3ed66d9bf/w2',
  })
  @IsString()
  path: string;

  @ApiProperty({
    description: 'Target URL where the request will be forwarded',
    example: 'http://localhost:8083',
  })
  @IsString()
  target_url: string;

  @ApiProperty({ description: 'HTTP method for the API', example: 'GET' })
  @IsString()
  method: string;

  @ApiPropertyOptional({
    description: 'Description of the API',
    example: 'Weather service providing current conditions and forecasts',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL to the API documentation',
    example: 'https://docs.weatherapi.com',
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
    example: 'free',
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

  @ApiPropertyOptional({
    description: 'Query parameters',
    type: [QueryParameterDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueryParameterDto)
  @IsOptional()
  query_params?: QueryParameterDto[];

  @ApiPropertyOptional({
    description: 'Request body configuration',
    type: BodyDto,
  })
  @ValidateNested()
  @Type(() => BodyDto)
  @IsOptional()
  body?: BodyDto;
}

// Added DTO for specific fields needed by GatewayService.onboardApi
export class CaddyOnboardingRequestDto {
  @ApiProperty({
    description: 'Path for accessing the API',
    example: '/95714b01-c8c7-4fb1-9779-8de3ed66d9bf/w2',
  })
  @IsString()
  path: string;

  @ApiProperty({
    description: 'Target URL where the request will be forwarded',
    example: 'http://localhost:8083',
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

  @ApiPropertyOptional({
    description: 'Provider ID who owns this API',
    example: 'user-123',
  })
  @IsString()
  @IsOptional()
  provider_id?: string;

  @ApiPropertyOptional({
    description: 'Project ID this API belongs to',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  project_id?: number;

  @ApiPropertyOptional({
    description: 'API ID for reference',
    example: '95714b01-c8c7-4fb1-9779-8de3ed66d9bf',
  })
  @IsString()
  @IsOptional()
  api_id?: string;

  @ApiPropertyOptional({
    description: 'Query parameters',
    type: [QueryParameterDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueryParameterDto)
  @IsOptional()
  query_params?: QueryParameterDto[];

  @ApiPropertyOptional({
    description: 'Request body configuration',
    type: BodyDto,
  })
  @ValidateNested()
  @Type(() => BodyDto)
  @IsOptional()
  body?: BodyDto;
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
    description: 'Project ID that this API belongs to',
    example: 1,
  })
  project_id: number;

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

  @ApiProperty({
    description: 'Target URL where the request will be forwarded',
    example: 'https://api.example.com/payments',
  })
  target_url: string;

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
    description: 'Required subscription level',
    example: 'basic',
  })
  required_subscription?: string;

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

  @ApiPropertyOptional({
    description: 'API key for accessing through gateway',
    example: 'pk_proxy_weather_test',
  })
  api_key?: string;

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

  @ApiPropertyOptional({
    description: 'Parameters for the API',
    type: [ParameterDto],
  })
  parameters?: ParameterDto[];

  @ApiPropertyOptional({
    description: 'Query parameters',
    type: [QueryParameterDto],
  })
  query_params?: QueryParameterDto[];

  @ApiPropertyOptional({
    description: 'Request body configuration',
    type: BodyDto,
  })
  body?: BodyDto;
}
