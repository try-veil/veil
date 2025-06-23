import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiRouteHeaderDto {
  @ApiProperty({ description: 'Name of the header', example: 'X-API-Key' })
  name: string;

  @ApiProperty({ description: 'Value of the header', example: 'your-api-key' })
  value: string;

  @ApiProperty({
    description: 'Whether the value is static or dynamic',
    example: true,
  })
  is_static: boolean;
}

export class ApiRouteDto {
  @ApiProperty({
    description: 'Unique identifier for the API',
    example: 'payment-api-v1',
  })
  api_id: string;

  @ApiProperty({
    description: 'Base path for the API',
    example: '/api/payments',
  })
  base_path: string;

  @ApiProperty({
    description: 'Target URL where requests will be forwarded',
    example: 'https://api.example.com/payments',
  })
  target_url: string;

  @ApiProperty({
    description: 'Allowed HTTP methods',
    example: ['GET', 'POST'],
  })
  methods: string[];

  @ApiPropertyOptional({
    description: 'Required headers for the API',
    type: [ApiRouteHeaderDto],
  })
  required_headers?: ApiRouteHeaderDto[];

  @ApiPropertyOptional({
    description: 'Whether to strip the path prefix when forwarding requests',
    example: true,
  })
  strip_path_prefix?: boolean;

  @ApiPropertyOptional({
    description: 'Logging level for the API',
    example: 'INFO',
  })
  log_level?: string;
}
