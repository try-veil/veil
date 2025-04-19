import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import {
  TenantService,
  CreateTenantDto,
  UpdateTenantDto,
} from './tenant.service';

@Controller('tenants')
@UseGuards(AuthGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  private ensureIsProvider(roles: string[]) {
    if (!roles.includes('provider')) {
      throw new ForbiddenException('Only providers can manage tenants');
    }
  }

  @Post()
  async createTenant(@Body() createTenantDto: CreateTenantDto, @Request() req) {
    this.ensureIsProvider(req.user.roles);
    return this.tenantService.createTenant(createTenantDto);
  }

  @Get()
  async getAllTenants(@Request() req) {
    this.ensureIsProvider(req.user.roles);
    return this.tenantService.getAllTenants();
  }

  @Get(':id')
  async getTenantById(@Param('id') id: string, @Request() req) {
    this.ensureIsProvider(req.user.roles);
    return this.tenantService.getTenantById(id);
  }

  @Get('by-domain/:domain')
  async getTenantByDomain(@Param('domain') domain: string, @Request() req) {
    this.ensureIsProvider(req.user.roles);
    return this.tenantService.getTenantByDomain(domain);
  }

  @Put(':id')
  async updateTenant(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @Request() req,
  ) {
    this.ensureIsProvider(req.user.roles);
    return this.tenantService.updateTenant(id, updateTenantDto);
  }

  @Delete(':id')
  async deleteTenant(@Param('id') id: string, @Request() req) {
    this.ensureIsProvider(req.user.roles);
    await this.tenantService.deleteTenant(id);
    return { message: 'Tenant deleted successfully' };
  }
}
