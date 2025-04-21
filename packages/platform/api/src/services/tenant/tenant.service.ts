import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  PrismaClient,
  Gateway,
  GatewayStatus,
  GatewayType,
  ServiceStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { ApiProperty } from '@nestjs/swagger';

export interface CreateTenantDto {
  name: string;
  domain: string;
}

export interface UpdateTenantDto {
  name?: string;
  domain?: string;
}

// Convert TenantResponseDto interface to a class
export class TenantResponseDto {
  @ApiProperty({ description: 'Tenant ID' })
  id: string;

  @ApiProperty({ description: 'Tenant name' })
  name: string;

  @ApiProperty({ description: 'Tenant domain' })
  domain: string;

  @ApiProperty({ description: 'Slugified key for the tenant' })
  slugifiedKey: string;

  // Removed createdAt and updatedAt as they are not on the Tenant model
  // @ApiProperty({ description: 'Creation timestamp' })
  // createdAt: Date;
  // @ApiProperty({ description: 'Last update timestamp' })
  // updatedAt: Date;

  // Optionally include related fields if needed, e.g.:
  // @ApiProperty({ type: () => [GatewayDto] }) // Example if GatewayDto exists
  // gateways?: Gateway[];
  // @ApiProperty({ type: () => [SubscriptionDto] }) // Example if SubscriptionDto exists
  // Subscription?: Subscription[];
}

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaClient,
    private configService: ConfigService,
  ) {}

  private async createDefaultGateway(tenantId: string): Promise<Gateway> {
    const defaultGatewayUrl = this.configService.get<string>(
      'DEFAULT_GATEWAY_URL',
    );
    if (!defaultGatewayUrl) {
      throw new Error('DEFAULT_GATEWAY_URL is not configured');
    }

    // First get or create a default gateway template
    const defaultTemplate =
      (await this.prisma.gatewayTemplate.findFirst({
        where: { name: 'Default Template' },
      })) ||
      (await this.prisma.gatewayTemplate.create({
        data: {
          name: 'Default Template',
          urlPattern: defaultGatewayUrl,
        },
      }));

    return this.prisma.gateway.create({
      data: {
        dns: defaultGatewayUrl,
        tenantId,
        type: GatewayType.VEIL,
        status: GatewayStatus.ACTIVE,
        serviceStatus: ServiceStatus.ACTIVE,
        isDefault: true,
        templateId: defaultTemplate.id,
      },
    });
  }

  async createTenant(data: CreateTenantDto): Promise<TenantResponseDto> {
    const { name, domain } = data;

    // Generate slugified key from name
    const slugifiedKey = this.slugify(name);

    try {
      // Use transaction to create tenant and default gateway
      const result = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name,
            domain,
            slugifiedKey,
          },
          // Select fields matching TenantResponseDto
          select: {
            id: true,
            name: true,
            domain: true,
            slugifiedKey: true,
          },
        });

        // Get or create default gateway template within transaction
        const defaultGatewayUrl = this.configService.get<string>(
          'DEFAULT_GATEWAY_URL',
        );
        if (!defaultGatewayUrl) {
          throw new Error('DEFAULT_GATEWAY_URL is not configured');
        }

        const defaultTemplate =
          (await tx.gatewayTemplate.findFirst({
            where: { name: 'Default Template' },
          })) ||
          (await tx.gatewayTemplate.create({
            data: {
              name: 'Default Template',
              urlPattern: defaultGatewayUrl,
            },
          }));

        // Create gateway within transaction
        await tx.gateway.create({
          data: {
            dns: defaultGatewayUrl,
            tenantId: tenant.id,
            type: GatewayType.VEIL,
            status: GatewayStatus.ACTIVE,
            serviceStatus: ServiceStatus.ACTIVE,
            isDefault: true,
            templateId: defaultTemplate.id,
          },
        });

        return tenant;
      });

      return result;
    } catch (error) {
      if (error.code === 'P2002') {
        const field = error.meta?.target[0];
        throw new BadRequestException(
          `Tenant with this ${field} already exists`,
        );
      }
      throw error;
    }
  }

  async getAllTenants(): Promise<TenantResponseDto[]> {
    return this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        slugifiedKey: true,
      },
    });
  }

  async getTenantById(id: string): Promise<TenantResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        domain: true,
        slugifiedKey: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async getTenantByDomain(domain: string): Promise<TenantResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { domain },
      select: {
        id: true,
        name: true,
        domain: true,
        slugifiedKey: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with domain ${domain} not found`);
    }

    return tenant;
  }

  async updateTenant(
    id: string,
    data: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    // Check existence first, but getTenantById now returns TenantResponseDto
    // We only need to know it exists, so a quick findUnique is fine.
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existingTenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    const updateData: any = { ...data };
    if (data.name) {
      updateData.slugifiedKey = this.slugify(data.name);
    }

    try {
      return await this.prisma.tenant.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          domain: true,
          slugifiedKey: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        const field = error.meta?.target[0];
        throw new BadRequestException(
          `Tenant with this ${field} already exists`,
        );
      }
      throw error;
    }
  }

  async deleteTenant(id: string): Promise<void> {
    // Check existence first
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existingTenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    // Check if tenant has active subscriptions
    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        tenantId: id,
        status: 'ACTIVE',
      },
    });

    if (activeSubscriptions > 0) {
      throw new ForbiddenException(
        'Cannot delete tenant with active subscriptions',
      );
    }

    // Delete related records first
    await this.prisma.$transaction([
      this.prisma.gateway.deleteMany({ where: { tenantId: id } }),
      this.prisma.subscription.deleteMany({ where: { tenantId: id } }),
      this.prisma.wallet.deleteMany({ where: { tenantId: id } }),
      this.prisma.payment.deleteMany({ where: { tenantId: id } }),
      this.prisma.tenant.delete({ where: { id } }),
    ]);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
}
