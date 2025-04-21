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

@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getCurrentUser(@Request() req) {
    const fusionAuthId = req.user.jwt.sub;
    return this.userService.findByFusionAuthId(fusionAuthId);
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  @Put('me')
  async updateCurrentUser(@Request() req, @Body() updateDto: UpdateUserDto) {
    const user = await this.userService.findByFusionAuthId(req.user.jwt.sub);
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    return this.userService.update(user.id, updateDto);
  }

  @Put(':id/attributes/:name')
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
