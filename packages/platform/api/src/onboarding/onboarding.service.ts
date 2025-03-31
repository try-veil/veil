import {
  Injectable,
  Logger,
  InternalServerErrorException,
  OnModuleInit,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OnboardingDto } from './dto/onboard.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OnboardingService implements OnModuleInit {
  private readonly logger = new Logger(OnboardingService.name);
  private internaBaselUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
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

  async onboard(
    onboardingDto: OnboardingDto,
    user: { id: string; email: string },
  ) {
    this.logger.log(`Starting onboarding process for user with ID: ${user.id}`);
    try {
      // Find the API by name and ensure it belongs to the user
      const api = await this.prismaService.api.findFirst({
        where: {
          name: onboardingDto.name,
          userId: user.id,
        },
      });

      if (!api) {
        this.logger.warn(`API with name ${onboardingDto.name} not found for user ${user.id}`);
        throw new BadRequestException(`API with name ${onboardingDto.name} not found`);
      }

      // Verify all API keys belong to the user
      for (const apiKeyData of onboardingDto.apiKeys) {
        const apiKey = await this.prismaService.apiKey.findUnique({
          where: {
            key: apiKeyData.key,
          },
        });

        if (!apiKey) {
          throw new BadRequestException(`API key ${apiKeyData.key} not found`);
        }
        
        if (apiKey.userId !== user.id) {
          throw new ForbiddenException(`API key ${apiKeyData.key} does not belong to the user`);
        }
      }

      // Process each path separately
      const results = [];

      for (const method of onboardingDto.allowedMethods) {
        for (const apiKeyData of onboardingDto.apiKeys) {
          // Check if the API path already exists
          const existingApiPath = await this.prismaService.apiPath.findFirst({
            where: {
              apiId: api.id,
              path: onboardingDto.path,
              method: method,
            },
            include: {
              apiKeys: true,
            },
          });
          
          // If API path exists, check if the API key is already linked
          if (existingApiPath) {
            const keyAlreadyLinked = existingApiPath.apiKeys.some(
              (existingKey) => existingKey.key === apiKeyData.key
            );
            
            if (keyAlreadyLinked) {
              results.push({
                method,
                key: apiKeyData.key,
                status: 'already exists',
              });
              continue;
            }
          }

          const requestBody = {
            name: onboardingDto.name,
            path: onboardingDto.path,
            upstream: onboardingDto.baseUrl,
            methods: [method],
            required_subscription: onboardingDto.tier,
            required_headers: onboardingDto.requiredHeaders,
            optional_headers: onboardingDto.optionalHeaders,
            api_keys: [apiKeyData],
          };

          this.logger.debug(
            `Request body for onboarding path ${onboardingDto.path} method ${method} by user ${user.id}: `,
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

          // Create or update the API path and link the API key
          if (!existingApiPath) {
            const newApiPath = await this.prismaService.apiPath.create({
              data: {
                apiId: api.id,
                path: onboardingDto.path,
                method: method,
                description: onboardingDto.description,
                apiKeys: {
                  connect: {
                    key: apiKeyData.key,
                  },
                },
              },
            });
            
            this.logger.log(`Created new API path with ID: ${newApiPath.id}`);
          } else {
            // Connect the API key to the existing path
            await this.prismaService.apiPath.update({
              where: {
                id: existingApiPath.id,
              },
              data: {
                apiKeys: {
                  connect: {
                    key: apiKeyData.key,
                  },
                },
              },
            });
            
            this.logger.log(`Updated existing API path with ID: ${existingApiPath.id}`);
          }

          results.push({
            method,
            key: apiKeyData.key,
            data,
            status: 'created',
          });
        }
      }

      this.logger.log(`Onboarding completed successfully for user ${user.id}`);
      return {
        success: true,
        message: 'Onboarding successful',
        data: results,
      };
    } catch (error) {
      this.logger.error(
        `Onboarding failed for user ${user.id}: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: 'Onboarding failed',
        error: error.message,
      };
    }
  }
}
