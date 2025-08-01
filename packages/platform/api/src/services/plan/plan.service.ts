import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto, PlanResponseDto } from './dto/plan.dto';

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreatePlanDto): Promise<PlanResponseDto> {
    // Check if plan with same name already exists
    const existingPlan = await this.prisma.plan.findFirst({
      where: { name: createDto.name },
    });

    if (existingPlan) {
      throw new ConflictException(`Plan with name '${createDto.name}' already exists`);
    }

    const plan = await this.prisma.plan.create({
      data: {
        name: createDto.name,
        description: createDto.description,
      },
    });

    return this.mapToResponseDto(plan);
  }

  async findAll(): Promise<PlanResponseDto[]> {
    const plans = await this.prisma.plan.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return plans.map(plan => this.mapToResponseDto(plan));
  }

  async findById(id: string): Promise<PlanResponseDto> {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    return this.mapToResponseDto(plan);
  }

  async update(id: string, updateDto: UpdatePlanDto): Promise<PlanResponseDto> {
    // Check if plan exists
    const existingPlan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    // Check if name is being updated and if it conflicts
    if (updateDto.name && updateDto.name !== existingPlan.name) {
      const nameConflict = await this.prisma.plan.findFirst({
        where: { 
          name: updateDto.name,
          id: { not: id },
        },
      });

      if (nameConflict) {
        throw new ConflictException(`Plan with name '${updateDto.name}' already exists`);
      }
    }

    const plan = await this.prisma.plan.update({
      where: { id },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.description !== undefined && { description: updateDto.description }),
      },
    });

    return this.mapToResponseDto(plan);
  }

  async delete(id: string): Promise<void> {
    // Check if plan exists
    const existingPlan = await this.prisma.plan.findUnique({
      where: { id },
      include: { subscriptions: true },
    });

    if (!existingPlan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    // Check if plan has active subscriptions
    if (existingPlan.subscriptions.length > 0) {
      throw new ConflictException(
        `Cannot delete plan '${existingPlan.name}' because it has ${existingPlan.subscriptions.length} active subscription(s)`
      );
    }

    await this.prisma.plan.delete({
      where: { id },
    });
  }

  private mapToResponseDto(plan: any): PlanResponseDto {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}