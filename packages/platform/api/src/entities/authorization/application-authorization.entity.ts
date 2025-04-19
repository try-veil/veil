import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  AuthorizationType,
  GrantType,
  AuthorizationStatus,
} from '@prisma/client';

/**
 * Entity representing an application's authorization details
 */
export class ApplicationAuthorization {
  @ApiProperty({ description: 'Unique identifier for the authorization' })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'API key or access token' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'Name of the authorization' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Associated application ID' })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({
    description: 'Current status of the authorization',
    enum: AuthorizationStatus,
  })
  @IsEnum(AuthorizationStatus)
  @IsNotEmpty()
  status: AuthorizationStatus;

  @ApiProperty({
    description: 'Type of authorization',
    enum: AuthorizationType,
  })
  @IsEnum(AuthorizationType)
  @IsNotEmpty()
  authorizationType: AuthorizationType;

  @ApiProperty({
    description: 'Grant type for OAuth2',
    enum: GrantType,
    required: false,
  })
  @IsEnum(GrantType)
  @IsOptional()
  grantType?: GrantType;

  @ApiProperty({
    description: 'Additional authorization values',
    required: false,
  })
  @IsOptional()
  authorizationValues?: Record<string, any>;

  @ApiProperty({ description: 'Associated gateways', type: [String] })
  @IsOptional()
  gateways: string[];

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDateString()
  @IsNotEmpty()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  @IsNotEmpty()
  updatedAt: Date;
}
