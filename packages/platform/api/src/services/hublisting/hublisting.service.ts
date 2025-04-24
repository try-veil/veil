import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HubListingDto } from './dto/hublisting.dto';

@Injectable()
export class HubListingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: HubListingDto) {
    const { basicPlan, proPlan, ultraPlan, ...rest } = data;

    const createData: any = {
      ...rest,
    };

    if (basicPlan) {
      const createdBasic = await this.prisma.planConfig.create({ data: basicPlan });
      createData.basicPlanId = createdBasic.id;
    }

    if (proPlan) {
      const createdPro = await this.prisma.planConfig.create({ data: proPlan });
      createData.proPlanId = createdPro.id;
    }

    if (ultraPlan) {
      const createdUltra = await this.prisma.planConfig.create({ data: ultraPlan });
      createData.ultraPlanId = createdUltra.id;
    }

    return this.prisma.hubListing.create({ data: createData });
  }

  async findAll() {
    return this.prisma.hubListing.findMany({
      include: {
        basicPlan: true,
        proPlan: true,
        ultraPlan: true,
        project: true,
      },
    });
  }

  async findOne(id: string) {
    const hub = await this.prisma.hubListing.findUnique({
      where: { id },
      include: {
        basicPlan: true,
        proPlan: true,
        ultraPlan: true,
        project: true,
      },
    });

    if (!hub) throw new NotFoundException('HubListing not found');

    return hub;
  }

  async update(id: string, data: HubListingDto) {
    const { basicPlan, proPlan, ultraPlan, ...rest } = data;

    const updateData: any = {
      ...rest,
    };

    const hub = await this.prisma.hubListing.findUnique({ where: { id } });
    if (!hub) throw new NotFoundException('HubListing not found');

    if (basicPlan) {
      if (hub.basicPlanId) {
        await this.prisma.planConfig.update({
          where: { id: hub.basicPlanId },
          data: basicPlan,
        });
      } else {
        const created = await this.prisma.planConfig.create({ data: basicPlan });
        updateData.basicPlanId = created.id;
      }
    }

    if (proPlan) {
      if (hub.proPlanId) {
        await this.prisma.planConfig.update({
          where: { id: hub.proPlanId },
          data: proPlan,
        });
      } else {
        const created = await this.prisma.planConfig.create({ data: proPlan });
        updateData.proPlanId = created.id;
      }
    }

    if (ultraPlan) {
      if (hub.ultraPlanId) {
        await this.prisma.planConfig.update({
          where: { id: hub.ultraPlanId },
          data: ultraPlan,
        });
      } else {
        const created = await this.prisma.planConfig.create({ data: ultraPlan });
        updateData.ultraPlanId = created.id;
      }
    }

    return this.prisma.hubListing.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    // First, find the hubListing to get the associated planIds
    const hubListing = await this.prisma.hubListing.findUnique({
      where: { id },
      select: {
        basicPlanId: true,
        proPlanId: true,
        ultraPlanId: true,
      },
    });
  
    // If associated plans exist, delete them
    if (hubListing) {
      const { basicPlanId, proPlanId, ultraPlanId } = hubListing;
  
      // Delete associated plans (if they exist)
      if (basicPlanId) {
        await this.prisma.planConfig.delete({ where: { id: basicPlanId } });
      }
  
      if (proPlanId) {
        await this.prisma.planConfig.delete({ where: { id: proPlanId } });
      }
  
      if (ultraPlanId) {
        await this.prisma.planConfig.delete({ where: { id: ultraPlanId } });
      }
  
      // Finally, delete the hubListing
      return this.prisma.hubListing.delete({ where: { id } });
    }
  
    throw new Error('HubListing not found');
  }
  
}
