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
  
  export enum LoadBalancerStrategy {
    ROUND_ROBIN = 'RoundRobin',
    GEOLOCATION = 'Geolocation',
  }
  
  export class PlanConfig {
    @IsBoolean()
    enabled: boolean;
  
    @IsNumber()
    @Min(0)
    pricePerMonth: number;
  
    @IsNumber()
    @Min(0)
    requestQuotaPerMonth: number;
  
    @IsNumber()
    @Min(0)
    hardLimitQuota: number;
  }
  
  export class HubListingDto {
    // General Tab
    @IsOptional()
    @IsString()
    logo?: string;
  
    @IsString()
    category: string;
  
    @IsOptional()
    @IsString()
    shortDescription?: string;
  
    @IsOptional()
    @IsString()
    longDescription?: string;
  
    @IsOptional()
    @IsUrl()
    website?: string;
  
    @IsOptional()
    @IsString()
    termsOfUse?: string;
  
    @IsBoolean()
    visibleToPublic: boolean;
  
    @IsUrl()
    baseUrl: string;
  
    @IsEnum(LoadBalancerStrategy)
    loadBalancer: LoadBalancerStrategy;
  
    @IsOptional()
    @IsUrl()
    healthCheckUrl?: string;
  
    @IsOptional()
    @IsString()
    apiDocumentation?: string;
  
    @IsOptional()
    @IsString()
    proxySecret?: string;
  
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(50)
    requestSizeLimitMb?: number;
  
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(180)
    proxyTimeoutSeconds?: number;
  
    // Monetize Tab
    @IsOptional()
    @IsUUID()
    basicPlanId?: string;
  
    @IsOptional()
    @ValidateNested()
    @Type(() => PlanConfig)
    basicPlan?: PlanConfig;
  
    @IsOptional()
    @IsUUID()
    proPlanId?: string;
  
    @IsOptional()
    @ValidateNested()
    @Type(() => PlanConfig)
    proPlan?: PlanConfig;
  
    @IsOptional()
    @IsUUID()
    ultraPlanId?: string;
  
    @IsOptional()
    @ValidateNested()
    @Type(() => PlanConfig)
    ultraPlan?: PlanConfig;
  
    @IsNumber()
    projectId: number;
  }
  