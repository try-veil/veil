import {
  Controller,
  Put,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpStatus,
  Res,
  Post,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { OnboardingService } from './onboarding.service';
import {
  ApiRegistrationRequestDto,
  ApiDetailsResponseDto,
  ApiRegistrationResponseDto,
} from './dto/api-registration.dto';
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

@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('onboard')
// @Controller('routes')
@UseGuards(AuthGuard, RoleGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Put()
  @Roles('provider')
  @ApiOperation({ summary: 'Register a new API' })
  @ApiBody({ type: ApiRegistrationRequestDto })
  @ApiResponse({
    status: 201,
    description: 'API registered successfully',
    type: ApiRegistrationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires provider role',
  })
  async registerApi(
    @Body() request: ApiRegistrationRequestDto,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.onboardingService.registerApi(
      request,
      req.user.id,
      request.project_id,
    );
    res.status(HttpStatus.CREATED).json(result);
  }

  @Get('api/:apiId')
  @Roles('provider')
  @ApiOperation({ summary: 'Get API details' })
  @ApiParam({ name: 'apiId', description: 'API ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns API details',
    type: ApiDetailsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'API not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires provider role',
  })
  async getApiDetails(
    @Param('apiId') apiId: string,
  ): Promise<ApiDetailsResponseDto> {
    return this.onboardingService.getApiDetails(apiId);
  }

  @Patch('api/:apiId')
  @Roles('provider')
  @ApiOperation({ summary: 'Update an API' })
  @ApiParam({ name: 'apiId', description: 'API ID' })
  @ApiBody({ type: ApiRegistrationRequestDto })
  @ApiResponse({
    status: 200,
    description: 'API updated successfully',
    type: ApiDetailsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'API not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires provider role',
  })
  async updateApi(
    @Param('apiId') apiId: string,
    @Body() request: Partial<ApiRegistrationRequestDto>,
    @Req() req: any,
  ): Promise<ApiDetailsResponseDto> {
    return this.onboardingService.updateApi(apiId, request, req.user.id);
  }

  @Delete('api/:apiId')
  @Roles('provider')
  @ApiOperation({ summary: 'Delete an API' })
  @ApiParam({ name: 'apiId', description: 'API ID' })
  @ApiResponse({ status: 200, description: 'API deleted successfully' })
  @ApiResponse({ status: 404, description: 'API not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires provider role',
  })
  async deleteApi(
    @Param('apiId') apiId: string,
    @Req() req: any,
  ): Promise<void> {
    return this.onboardingService.deleteApi(apiId, req.user.id);
  }

  @Post('test')
  @Roles('provider', 'consumer')
  @ApiOperation({ summary: 'Test an API endpoint before buying subscription' })
  @ApiBody({ type: ApiRegistrationRequestDto })
  @ApiResponse({ status: 200, description: 'API test response' })
  @ApiResponse({ status: 403, description: 'Rate limit exceeded' })
  async testApi(@Body() body: ApiRegistrationRequestDto, @Req() req: any) {
    const authenticatedUserId = req.user.id;

    if (!body.api_id || !body.path || !body.target_url) {
      throw new BadRequestException(
        'api_id, path, and target_url are required',
      );
    }

    return this.onboardingService.testApiCall(body, authenticatedUserId);
  }
}
