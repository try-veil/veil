import {
  IsString,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNotEmpty,
  ValidateNested,
  IsUrl,
  IsNumber,
  Max,
  Min,
} from 'class-validator';
import { ProjectStatus } from '../../../entities/project/types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {PlanConfig } from "../../hublisting/dto/hublisting.dto"
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name', example: 'My API Project' })
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  name: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'Project for managing my APIs',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Target Url',
    example: 'https://jsonplaceholder.typicode.com/posts',
  })
  @IsString()
  @IsOptional()
  target_url?: string;

  @ApiProperty({ description: 'Tenant ID', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @IsUUID()
  @IsNotEmpty({ message: 'Tenant ID is required' })
  tenantId: string;

  @ApiPropertyOptional({
    description: 'Project thumbnail URL',
    example: 'https://example.com/image.png',
  })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional({
    description: 'Mark project as favorite',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  favorite?: boolean;

  @ApiPropertyOptional({ description: 'Enable limits to APIs', default: false })
  @IsBoolean()
  @IsOptional()
  enableLimitsToAPIs?: boolean;

  @ApiPropertyOptional({
    description: 'Logo URL for the project',
    example: 'https://example.com/logo.png',
  })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional({
    description: 'Category of the project',
    example: 'Finance',
  })
  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Project name', example: 'Updated API Project' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Project description', example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Target Url', example: 'https://jsonplaceholder.typicode.com/posts' })
  @IsString()
  @IsOptional()
  target_url?: string;

  @ApiPropertyOptional({ description: 'Project thumbnail URL', example: 'https://example.com/new-image.png' })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional({ description: 'Mark project as favorite', default: false })
  @IsBoolean()
  @IsOptional()
  favorite?: boolean;

  @ApiPropertyOptional({ description: 'Enable limits to APIs', default: false })
  @IsBoolean()
  @IsOptional()
  enableLimitsToAPIs?: boolean;

  @ApiPropertyOptional({ description: 'Project status', enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  // -------- Add Hub Listing fields below --------

  @ApiPropertyOptional({ description: 'Logo URL', example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ description: 'API category', example: 'Finance' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Short description of the API', example: 'Short summary...' })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({ description: 'Long description of the API', example: 'Detailed overview of your API and how it works.' })
  @IsOptional()
  @IsString()
  longDescription?: string;

  @ApiPropertyOptional({ description: 'API provider website URL', example: 'https://provider.com' })
  @IsOptional()
  @IsString()
  website?: string | null;

  @ApiPropertyOptional({ description: 'Terms of use for this API', example: 'https://provider.com/terms' })
  @IsOptional()
  @IsString()
  termsOfUse?: string;

  @ApiPropertyOptional({ description: 'Maximum request size in MB', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  requestSizeLimitMb?: number;

  @ApiPropertyOptional({ description: 'Proxy timeout in seconds', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(180)
  proxyTimeoutSeconds?: number;


  @ApiPropertyOptional({ description: 'URL used for health checks', example: 'https://provider.com/health' })
  @IsOptional()
  @IsString()
  healthCheckUrl?: string | null;

  @ApiPropertyOptional({ description: 'URL to API documentation', example: 'https://docs.provider.com' })
  @IsOptional()
  @IsString()
  apiDocumentation?: string;

  @ApiPropertyOptional({ description: 'Proxy secret for request authentication', example: 'super-secret-key' })
  @IsOptional()
  @IsString()
  proxySecret?: string;

  @ApiPropertyOptional({ description: 'Public visibility', example: true })
  @IsOptional()
  @IsBoolean()
  visibleToPublic?: boolean;

  @ApiPropertyOptional({ description: 'Basic plan config', type: PlanConfig })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanConfig)
  basicPlan?: PlanConfig;

  @ApiPropertyOptional({ description: 'Pro plan config', type: PlanConfig })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanConfig)
  proPlan?: PlanConfig;

  @ApiPropertyOptional({ description: 'Ultra plan config', type: PlanConfig })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanConfig)
  ultraPlan?: PlanConfig;
}

export class ProjectResponseDto {
  @ApiProperty({ description: 'Project ID' })
  id: number;

  @ApiProperty({ description: 'Project name', example: 'My API Project' })
  name: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'Project for managing my APIs',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Target Url',
    example: 'https://jsonplaceholder.typicode.com/posts',
  })
  @IsString()
  @IsOptional()
  target_url?: string;
  

  @ApiPropertyOptional({
    description: 'Project thumbnail URL',
    example: 'https://example.com/image.png',
  })
  thumbnail?: string;

  @ApiProperty({ description: 'Mark project as favorite', default: false })
  favorite: boolean;

  @ApiPropertyOptional({ description: 'Mashape ID for legacy projects' })
  mashapeId?: string;

  @ApiPropertyOptional({
    description: 'X-Mashape-Key for legacy authentication',
  })
  xMashapeKey?: string;

  @ApiProperty({ description: 'Enable limits to APIs', default: false })
  enableLimitsToAPIs: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Tenant ID', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  tenantId: string;
}

export class ProjectAllowedApiDto {
  @ApiProperty({ description: 'API ID' })
  @IsUUID()
  apiId: string;

  @ApiProperty({ description: 'API version ID' })
  @IsString()
  apiVersionId: string;
}

export class ProjectWithRelationsDto extends ProjectResponseDto {
  @ApiProperty({
    description: 'APIs allowed in this project',
    type: [ProjectAllowedApiDto],
  })
  apis: ProjectAllowedApiDto[];

  @ApiPropertyOptional({ 
    description: 'API key for accessing APIs through the gateway',
    example: 'pk_proxy_weather_test'
  })
  gateway_api_key?: string;

  @ApiPropertyOptional({ description: 'Basic plan config', type: PlanConfig })
  basicPlan?: PlanConfig;

  @ApiPropertyOptional({ description: 'Pro plan config', type: PlanConfig })
  proPlan?: PlanConfig;

  @ApiPropertyOptional({ description: 'Ultra plan config', type: PlanConfig })
  ultraPlan?: PlanConfig;
}

export class HeaderParameterDto {
  @ApiProperty({ 
    description: 'Name of the header', 
    example: 'X-RapidAPI-Key'
  })
  name: string;

  @ApiProperty({ 
    description: 'Value of the header', 
    example: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'
  })
  value: string;

  @ApiProperty({
    description: 'Whether the value is a variable that users need to provide',
    example: true,
  })
  is_variable: boolean;
}

export class ParameterDto {
  @ApiProperty({ 
    description: 'Name of the parameter', 
    example: 'location'
  })
  name: string;

  @ApiProperty({ 
    description: 'Type of the parameter', 
    example: 'string',
    enum: ['string', 'number', 'boolean', 'array', 'object']
  })
  type: string;

  @ApiProperty({
    description: 'Whether the parameter is required',
    example: true,
  })
  required: boolean;
}

export class ProjectApiDetailsDto {
  @ApiProperty({
    description: 'Unique identifier for the API',
    example: 'weather-api-v2',
  })
  api_id: string;

  @ApiProperty({
    description: 'Project ID that this API belongs to',
    example: 123,
  })
  project_id: number;

  @ApiProperty({
    description: 'Display name of the API',
    example: 'Weather Forecast API',
  })
  name: string;

  @ApiProperty({
    description: 'Path for accessing the API',
    example: '/api/v2/weather',
  })
  path: string;

  @ApiProperty({
    description: 'Target URL where the request will be forwarded',
    example: 'https://weather-service.internal.com/v2/forecast',
  })
  target_url: string;

  @ApiProperty({ 
    description: 'HTTP method for the API', 
    example: 'GET',
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  })
  method: string;

  @ApiProperty({
    description: 'Version of the API',
    example: '2.0.0',
  })
  version: string;

  @ApiPropertyOptional({
    description: 'Description of the API',
    example: 'Get current weather conditions and forecasts for any location worldwide',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Required subscription level',
    example: 'basic',
  })
  required_subscription?: string;

  @ApiPropertyOptional({
    description: 'URL to the API documentation',
    example: 'https://docs.weather-api.com/v2/forecast',
  })
  documentation_url?: string;

  @ApiProperty({
    description: 'Required headers for the API',
    type: [HeaderParameterDto],
  })
  required_headers: HeaderParameterDto[];

  @ApiProperty({
    description: 'Status of the API',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'DEPRECATED']
  })
  status: string;

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
}
