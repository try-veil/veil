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
} from '@nestjs/common';
import { Response } from 'express';
import { OnboardingService } from './onboarding.service';
import {
  ApiRegistrationRequestDto,
  ApiDetailsResponseDto,
} from './dto/api-registration.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard } from '../../services/auth/role.guard';
import { Roles } from '../../services/auth/roles.decorator';

@Controller('onboard')
@UseGuards(AuthGuard, RoleGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Put()
  @Roles('provider')
  async registerApi(
    @Body() request: ApiRegistrationRequestDto,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.onboardingService.registerApi(
      request,
      req.user.id,
    );
    res.status(HttpStatus.CREATED).json(result);
  }

  @Get('api/:apiId')
  @Roles('provider')
  async getApiDetails(
    @Param('apiId') apiId: string,
  ): Promise<ApiDetailsResponseDto> {
    return this.onboardingService.getApiDetails(apiId);
  }

  @Patch('api/:apiId')
  @Roles('provider')
  async updateApi(
    @Param('apiId') apiId: string,
    @Body() request: Partial<ApiRegistrationRequestDto>,
    @Req() req: any,
  ): Promise<ApiDetailsResponseDto> {
    return this.onboardingService.updateApi(apiId, request, req.user.id);
  }

  @Delete('api/:apiId')
  @Roles('provider')
  async deleteApi(
    @Param('apiId') apiId: string,
    @Req() req: any,
  ): Promise<void> {
    return this.onboardingService.deleteApi(apiId, req.user.id);
  }
}
