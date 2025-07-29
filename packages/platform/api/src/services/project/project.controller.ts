import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
  ProjectWithRelationsDto,
  ProjectAllowedApiDto,
  ProjectApiDetailsDto,
} from './dto/project.dto';
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

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @UseGuards(RoleGuard)
  @Roles('provider') // Only providers can create projects
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(
    @Body() createProjectDto: CreateProjectDto,
    @Req() req: any,
  ): Promise<ProjectResponseDto> {
    return this.projectService.create(createProjectDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all projects',
    type: [ProjectResponseDto],
  })
  findAll(@Req() req: any): Promise<ProjectResponseDto[]> {
    return this.projectService.findAll(req.user.id);
  }

  @Get('marketplace')
  // @Roles('consumer')
  @ApiOperation({ summary: 'Get all available projects for marketplace' })
  @ApiResponse({
    status: 200,
    description: 'Returns all available projects',
    type: [ProjectResponseDto],
  })
  findAllForConsumer(): Promise<ProjectResponseDto[]> {
    return this.projectService.findAllForConsumer();
  }

  @Get('marketplace/:id')
  @ApiOperation({ summary: 'Get a specific project for marketplace' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the project',
    type: ProjectWithRelationsDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findOneForConsumer(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProjectWithRelationsDto> {
    return this.projectService.findOneForConsumer(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the project',
    type: ProjectWithRelationsDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<ProjectWithRelationsDto> {
    return this.projectService.findOne(id, req.user.id);
  }

  @Get(':id/apis')
  @ApiOperation({ summary: 'Get all APIs under a project with full details' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns all APIs in the project with full details',
    type: [ProjectApiDetailsDto],
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied to project' })
  getProjectApis(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<ProjectApiDetailsDto[]> {
    return this.projectService.getProjectApis(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(RoleGuard)
  @Roles('provider') // Only providers can update projects
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @Req() req: any,
  ): Promise<ProjectResponseDto> {
    return this.projectService.update(id, updateProjectDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RoleGuard)
  @Roles('provider') // Only providers can delete projects
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<void> {
    return this.projectService.remove(id, req.user.id);
  }

  @Post(':id/apis')
  @UseGuards(RoleGuard)
  @Roles('provider') // Only providers can add APIs to projects
  @ApiOperation({ summary: 'Add an API to a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 201,
    description: 'API added to project successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Project or API not found' })
  addApiToProject(
    @Param('id', ParseIntPipe) id: number,
    @Body() apiDto: ProjectAllowedApiDto,
    @Req() req: any,
  ): Promise<void> {
    return this.projectService.addApiToProject(
      id,
      apiDto.apiId,
      apiDto.apiVersionId,
      req.user.id,
    );
  }

  @Delete(':id/apis/:apiId')
  @UseGuards(RoleGuard)
  @Roles('provider') // Only providers can remove APIs from projects
  @ApiOperation({ summary: 'Remove an API from a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiParam({ name: 'apiId', description: 'API ID' })
  @ApiResponse({
    status: 204,
    description: 'API removed from project successfully',
  })
  @ApiResponse({ status: 404, description: 'Project or API not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeApiFromProject(
    @Param('id', ParseIntPipe) id: number,
    @Param('apiId') apiId: string,
    @Req() req: any,
  ): Promise<void> {
    return this.projectService.removeApiFromProject(id, apiId, req.user.id);
  }
}
