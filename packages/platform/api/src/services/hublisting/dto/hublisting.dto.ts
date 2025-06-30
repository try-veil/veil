import {
    IsString,
    IsOptional,
    IsUrl,
    IsBoolean,
    IsEnum,
    IsNumber,
    Max,
    Min,
    ValidateNested,
    IsUUID,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  import { ApiProperty,ApiPropertyOptional } from '@nestjs/swagger';
  
  export class PlanConfig {
    @ApiProperty({ description: 'Whether the plan is enabled', example: true })
    @IsBoolean()
    enabled: boolean;
  
    @ApiProperty({ description: 'Monthly price in USD', example: 29.99 })
    @IsNumber()
    @Min(0)
    pricePerMonth: number;
  
    @ApiProperty({ description: 'Monthly request quota', example: 100000 })
    @IsNumber()
    @Min(0)
    requestQuotaPerMonth: number;
  
    @ApiProperty({ description: 'Hard limit of requests per month', example: 150000 })
    @IsNumber()
    @Min(0)
    hardLimitQuota: number;
  }
  
  
  export class HubListingDto {
    @ApiPropertyOptional({ description: 'URL of the logo image', example: 'https://example.com/logo.png' })
    @IsOptional()
    @IsString()
    logo?: string;
  
    @ApiProperty({ description: 'Category of the API', example: 'Finance' })
    @IsString()
    category: string;
  
    @ApiPropertyOptional({ description: 'Short description of the API', example: 'Short summary about your API' })
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
  
    @ApiProperty({ description: 'Whether this API is visible to the public', example: true })
    @IsBoolean()
    visibleToPublic: boolean;
  
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
  

  
    @ApiPropertyOptional({ description: 'Configuration for basic plan', type: PlanConfig })
    @IsOptional()
    @ValidateNested()
    @Type(() => PlanConfig)
    basicPlan?: PlanConfig;
  

  
    @ApiPropertyOptional({ description: 'Configuration for pro plan', type: PlanConfig })
    @IsOptional()
    @ValidateNested()
    @Type(() => PlanConfig)
    proPlan?: PlanConfig;
  

  
    @ApiPropertyOptional({ description: 'Configuration for ultra plan', type: PlanConfig })
    @IsOptional()
    @ValidateNested()
    @Type(() => PlanConfig)
    ultraPlan?: PlanConfig;
  
    @ApiProperty({ description: 'Associated project ID', example: 123 })
    @IsNumber()
    projectId: number;
  }
  