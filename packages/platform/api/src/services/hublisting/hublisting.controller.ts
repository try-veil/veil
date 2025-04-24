import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    Req,
    Res,
    UseGuards,
    HttpStatus,
  } from '@nestjs/common';
  import { Response } from 'express';
  import { HubListingService } from './hublisting.service';
  import { HubListingDto } from './dto/hublisting-dto';
  import { AuthGuard } from '../auth/auth.guard';
  import { RoleGuard } from '../../services/auth/role.guard';
  import { Roles } from '../../services/auth/roles.decorator';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody,
    ApiBearerAuth,
  } from '@nestjs/swagger';
  
  @ApiTags('hublistings')
  @ApiBearerAuth()
  @Controller('hublistings')
  @UseGuards(AuthGuard, RoleGuard)
  export class HubListingController {
    constructor(private readonly service: HubListingService) {}
  
    @Post()
    @Roles('provider')
    @ApiOperation({ summary: 'Register a new API in Hub Listing' })
    @ApiBody({ type: HubListingDto })
    @ApiResponse({
      status: 201,
      description: 'API registered successfully',
      type: HubListingDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({
      status: 403,
      description: 'Forbidden - requires provider role',
    })
    async create(
      @Body() dto: HubListingDto,
      @Req() req: any,
      @Res() res: Response,
    ): Promise<void> {
      const result = await this.service.create(dto);
      res.status(HttpStatus.CREATED).json(result);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all hub listings' })
    @ApiResponse({ status: 200, description: 'List of all hub listings' })
    findAll() {
      return this.service.findAll();
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a single hub listing by ID' })
    @ApiParam({ name: 'id', required: true })
    @ApiResponse({ status: 200, description: 'Hub listing found' })
    @ApiResponse({ status: 404, description: 'Hub listing not found' })
    findOne(@Param('id') id: string) {
      return this.service.findOne(id);
    }
  
    @Patch(':id')
    @Roles('provider')
    @ApiOperation({ summary: 'Update a hub listing' })
    @ApiParam({ name: 'id', required: true })
    @ApiBody({ type: HubListingDto })
    @ApiResponse({ status: 200, description: 'Hub listing updated' })
    @ApiResponse({ status: 404, description: 'Hub listing not found' })
    update(@Param('id') id: string, @Body() dto: HubListingDto) {
      return this.service.update(id, dto);
    }
  
    @Delete(':id')
    @Roles('provider')
    @ApiOperation({ summary: 'Delete a hub listing' })
    @ApiParam({ name: 'id', required: true })
    @ApiResponse({ status: 200, description: 'Hub listing deleted' })
    @ApiResponse({ status: 404, description: 'Hub listing not found' })
    remove(@Param('id') id: string) {
      return this.service.remove(id);
    }
  }
  