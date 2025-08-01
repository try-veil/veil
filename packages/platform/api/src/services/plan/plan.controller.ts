import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PlanService } from './plan.service';
import { CreatePlanDto, UpdatePlanDto, PlanResponseDto } from './dto/plan.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard } from '../auth/role.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('plans')
@ApiBearerAuth()
@Controller('plans')
@UseGuards(AuthGuard, RoleGuard)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  @Roles('admin', 'provider') // Only admins and providers can create plans
  @ApiOperation({ summary: 'Create a new plan' })
  @ApiBody({ type: CreatePlanDto })
  @ApiResponse({
    status: 201,
    description: 'Plan created successfully',
    type: PlanResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Plan name already exists' })
  async create(@Body() createDto: CreatePlanDto): Promise<PlanResponseDto> {
    return this.planService.create(createDto);
  }

  @Get()
  @Roles('admin', 'provider', 'consumer') // All authenticated users can view plans
  @ApiOperation({ summary: 'Get all plans' })
  @ApiResponse({
    status: 200,
    description: 'List of all plans',
    type: [PlanResponseDto],
  })
  async findAll(): Promise<PlanResponseDto[]> {
    return this.planService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'provider', 'consumer')
  @ApiOperation({ summary: 'Get a plan by ID' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Plan details',
    type: PlanResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async findById(@Param('id') id: string): Promise<PlanResponseDto> {
    return this.planService.findById(id);
  }

  @Put(':id')
  @Roles('admin', 'provider')
  @ApiOperation({ summary: 'Update a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiBody({ type: UpdatePlanDto })
  @ApiResponse({
    status: 200,
    description: 'Plan updated successfully',
    type: PlanResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ status: 409, description: 'Plan name already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePlanDto,
  ): Promise<PlanResponseDto> {
    return this.planService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: 204, description: 'Plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ 
    status: 409, 
    description: 'Cannot delete plan with active subscriptions' 
  })
  async delete(@Param('id') id: string): Promise<void> {
    return this.planService.delete(id);
  }
}