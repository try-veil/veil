import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import {
  MarketplaceApiQueryDto,
  MarketplaceSearchQueryDto,
  MarketplaceApiDto,
  MarketplaceApiDetailsDto,
  MarketplaceCategoryDto,
  MarketplaceApiListResponseDto,
} from './dto/marketplace.dto';
import { AuthGuard } from '../auth/auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('marketplace')
@ApiBearerAuth()
@Controller('marketplace')
@UseGuards(AuthGuard)
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) { }

  @Get('apis')
  @ApiOperation({
    summary: 'Get all marketplace APIs',
    description: 'Retrieve all publicly available APIs with filtering, search, and pagination support'
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
    example: 'ai',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for API name or description',
    example: 'weather',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort order',
    enum: ['popularity', 'name', 'created_at', 'updated_at'],
    example: 'popularity',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page (max 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of marketplace APIs',
    type: MarketplaceApiListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  async getMarketplaceApis(
    @Query() query: MarketplaceApiQueryDto,
  ): Promise<MarketplaceApiListResponseDto> {
    return this.marketplaceService.getMarketplaceApis(query);
  }

  @Get('apis/:apiId')
  @ApiOperation({
    summary: 'Get API details for marketplace',
    description: 'Retrieve detailed information about a specific API including headers, parameters, and pricing'
  })
  @ApiParam({
    name: 'apiId',
    description: 'API identifier',
    example: 'weather-api-v1',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns detailed API information',
    type: MarketplaceApiDetailsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'API not found or not publicly available',
  })
  async getMarketplaceApiDetails(
    @Param('apiId') apiId: string,
  ): Promise<MarketplaceApiDetailsDto> {
    return this.marketplaceService.getMarketplaceApiDetails(apiId);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get API categories',
    description: 'Retrieve all available API categories with API counts'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of available categories',
    type: [MarketplaceCategoryDto],
  })
  async getCategories(): Promise<MarketplaceCategoryDto[]> {
    return this.marketplaceService.getCategories();
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search APIs',
    description: 'Search for APIs by name, description, or other criteria'
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query',
    example: 'weather',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
    example: 'data',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page (max 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns search results',
    type: MarketplaceApiListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing or invalid search query',
  })
  async searchApis(
    @Query() query: MarketplaceSearchQueryDto,
  ): Promise<MarketplaceApiListResponseDto> {
    return this.marketplaceService.searchApis(query);
  }
}