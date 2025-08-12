import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class MarketplaceApiQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'ai',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Search term for API name or description',
    example: 'weather',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'popularity',
    enum: ['popularity', 'name', 'created_at', 'updated_at'],
  })
  @IsOptional()
  @IsEnum(['popularity', 'name', 'created_at', 'updated_at'])
  sort?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class MarketplaceSearchQueryDto {
  @ApiProperty({
    description: 'Search query',
    example: 'weather',
  })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'data',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class MarketplaceProviderDto {
  @ApiProperty({
    description: 'Provider ID',
    example: 'provider-123',
  })
  id: string;

  @ApiProperty({
    description: 'Provider name',
    example: 'Weather Corp',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Provider logo URL',
    example: 'https://example.com/logo.png',
  })
  logo?: string;
}

export class MarketplaceApiDto {
  @ApiProperty({
    description: 'API ID',
    example: 'weather-api-v1',
  })
  api_id: string;

  @ApiProperty({
    description: 'API name',
    example: 'Weather Forecast API',
  })
  name: string;

  @ApiProperty({
    description: 'API description',
    example: 'Get current weather conditions and forecasts',
  })
  description: string;

  @ApiProperty({
    description: 'API category',
    example: 'data',
  })
  category: string;

  @ApiProperty({
    description: 'API provider information',
    type: MarketplaceProviderDto,
  })
  provider: MarketplaceProviderDto;

  @ApiProperty({
    description: 'API path',
    example: '/api/v1/weather',
  })
  path: string;

  @ApiProperty({
    description: 'HTTP method',
    example: 'GET',
  })
  method: string;

  @ApiProperty({
    description: 'API version',
    example: '1.0.0',
  })
  version: string;

  @ApiPropertyOptional({
    description: 'Documentation URL',
    example: 'https://docs.weather-api.com',
  })
  documentation_url?: string;

  @ApiProperty({
    description: 'API status',
    example: 'ACTIVE',
  })
  status: string;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-01-01T00:00:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-01-01T00:00:00Z',
  })
  updated_at: Date;
}

export class MarketplaceApiDetailsDto extends MarketplaceApiDto {
  @ApiProperty({
    description: 'Required subscription level',
    example: 'basic',
  })
  required_subscription: string;

  @ApiProperty({
    description: 'Required headers',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        value: { type: 'string' },
        is_variable: { type: 'boolean' },
      },
    },
  })
  required_headers: Array<{
    name: string;
    value: string;
    is_variable: boolean;
  }>;

  @ApiProperty({
    description: 'API parameters',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string' },
        required: { type: 'boolean' },
      },
    },
  })
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
}

export class MarketplaceCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'ai',
  })
  name: string;

  @ApiProperty({
    description: 'Category display name',
    example: 'Artificial Intelligence',
  })
  display_name: string;

  @ApiProperty({
    description: 'Number of APIs in this category',
    example: 15,
  })
  api_count: number;
}

export class MarketplaceApiListResponseDto {
  @ApiProperty({
    description: 'List of APIs',
    type: [MarketplaceApiDto],
  })
  apis: MarketplaceApiDto[];

  @ApiProperty({
    description: 'Total number of APIs',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  total_pages: number;
}
