import {
  IsString,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { ProjectStatus } from '../../../entities/project/types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}

export class UpdateProjectDto {
  @ApiPropertyOptional({
    description: 'Project name',
    example: 'Updated API Project',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'Updated description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Project thumbnail URL',
    example: 'https://example.com/new-image.png',
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

  @ApiPropertyOptional({ description: 'Project status', enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;
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
}
