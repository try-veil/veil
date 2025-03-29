import {
  Injectable,
  Logger,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { OnboardingDto } from './dto/onboard.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class OnboardingService implements OnModuleInit {
  private readonly logger = new Logger(OnboardingService.name);
  private internaBaselUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.internaBaselUrl = this.configService.get<string>('VEIL_INTERNAL_URL');
    if (!this.internaBaselUrl) {
      this.logger.error(
        'VEIL_INTERNAL_URL is not configured. The onboarding service will not function correctly.',
      );
    } else {
      this.logger.log(`VEIL_INTERNAL_URL is configured:`);
    }
  }

  async onboard(onboardingDto: OnboardingDto) {
    this.logger.log('Starting onboarding process');

    try {
      const requestBody = {
        path: onboardingDto.path,
        upstream: onboardingDto.baseUrl,
        methods: onboardingDto.allowedMethods,
        required_subscription: onboardingDto.tier,
        required_headers: onboardingDto.requiredHeaders,
        optional_headers: onboardingDto.optionalHeaders,
        api_keys: onboardingDto.apiKeys,
      };

      this.logger.debug(
        'Request body for onboarding: ',
        JSON.stringify(requestBody, null, 2),
      );

      const internalUrl = `${this.internaBaselUrl}/veil/api/onboard`;

      const { data } = await firstValueFrom(
        this.httpService.post(internalUrl, requestBody).pipe(
          catchError((error) => {
            this.logger.error(
              `Error calling internal API: ${error.message}`,
              error.stack,
            );
            throw new InternalServerErrorException(
              'Failed to process onboarding request',
            );
          }),
        ),
      );

      return {
        success: true,
        message: 'Onboarding successful',
        data,
      };
    } catch (error) {
      this.logger.error(`Onboarding failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Onboarding failed',
        error: error.message,
      };
    }
  }
}
