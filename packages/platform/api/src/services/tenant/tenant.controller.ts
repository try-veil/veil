import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request as Req,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard } from '../auth/role.guard';
import { Roles } from '../auth/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  TenantService,
  CreateTenantDto,
  UpdateTenantDto,
  TenantResponseDto,
} from './tenant.service';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(AuthGuard, RoleGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @Roles('provider')
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
    @Req() req: any,
  ): Promise<TenantResponseDto> {
    return this.tenantService.createTenant(createTenantDto, req.user.id);
  }

  @Get()
  @Roles('provider')
  @ApiOperation({ summary: 'Get all tenants' })
  @ApiResponse({
    status: 200,
    description: 'Returns all tenants',
    type: [TenantResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getAllTenants(): Promise<TenantResponseDto[]> {
    return this.tenantService.getAllTenants();
  }

  @Get(':id')
  @Roles('provider')
  @ApiOperation({ summary: 'Get a tenant by ID' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the tenant',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getTenantById(@Param('id') id: string): Promise<TenantResponseDto> {
    return this.tenantService.getTenantById(id);
  }

  @Get('by-domain/:domain')
  @Roles('provider')
  @ApiOperation({ summary: 'Get a tenant by domain' })
  @ApiParam({ name: 'domain', description: 'Tenant domain' })
  @ApiResponse({
    status: 200,
    description: 'Returns the tenant',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getTenantByDomain(
    @Param('domain') domain: string,
  ): Promise<TenantResponseDto> {
    return this.tenantService.getTenantByDomain(domain);
  }

  @Put(':id')
  @Roles('provider')
  @ApiOperation({ summary: 'Update a tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async updateTenant(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantService.updateTenant(id, updateTenantDto);
  }

  @Delete(':id')
  @Roles('provider')
  @ApiOperation({ summary: 'Delete a tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 204, description: 'Tenant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTenant(@Param('id') id: string): Promise<void> {
    await this.tenantService.deleteTenant(id);
  }
}
