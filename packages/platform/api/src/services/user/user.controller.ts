import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { UserService } from './user.service';
import { UpdateUserDto } from './user.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current user',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req) {
    const fusionAuthId = req.user.jwt.sub;
    return this.userService.findByFusionAuthId(fusionAuthId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUser(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  @Put('me')
  @ApiOperation({ summary: 'Update the current authenticated user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', description: 'First name' },
        lastName: { type: 'string', description: 'Last name' },
        email: { type: 'string', description: 'Email address' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCurrentUser(@Request() req, @Body() updateDto: UpdateUserDto) {
    const user = await this.userService.findByFusionAuthId(req.user.jwt.sub);
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    return this.userService.update(user.id, updateDto);
  }

  @Put(':id/attributes/:name')
  @ApiOperation({ summary: 'Update a user attribute' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'name', description: 'Attribute name' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        value: { type: 'string', description: 'Attribute value' },
      },
      required: ['value'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Attribute updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUserAttribute(
    @Param('id') id: string,
    @Param('name') attributeName: string,
    @Body('value') attributeValue: any,
    @Request() req,
  ) {
    // Verify the user is updating their own attributes
    const currentUser = await this.userService.findByFusionAuthId(
      req.user.jwt.sub,
    );
    if (!currentUser || currentUser.id !== id) {
      throw new ForbiddenException('Cannot update attributes of other users');
    }

    await this.userService.updateUserAttribute(
      id,
      attributeName,
      attributeValue,
    );
    return { message: 'Attribute updated successfully' };
  }

  @Put(':id/metadata/:name')
  @ApiOperation({ summary: 'Update a user metadata attribute' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'name', description: 'Metadata attribute name' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        value: { type: 'string', description: 'Metadata attribute value' },
      },
      required: ['value'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Metadata updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMetadataAttribute(
    @Param('id') id: string,
    @Param('name') attributeName: string,
    @Body('value') attributeValue: string,
    @Request() req,
  ) {
    // Verify the user is updating their own metadata
    const currentUser = await this.userService.findByFusionAuthId(
      req.user.jwt.sub,
    );
    if (!currentUser || currentUser.id !== id) {
      throw new ForbiddenException('Cannot update metadata of other users');
    }

    await this.userService.updateMetadataAttribute(
      id,
      attributeName,
      attributeValue,
    );
    return { message: 'Metadata updated successfully' };
  }
}
