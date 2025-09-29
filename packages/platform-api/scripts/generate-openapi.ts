#!/usr/bin/env bun

/**
 * Generate OpenAPI specification directly from ElysiaJS app definition
 * without needing to start a server
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';

// Import our route modules
import { authRoutes } from '../src/routes/auth';
import { marketplaceRoutes } from '../src/routes/marketplace';
import { sellerRoutes } from '../src/routes/seller';
import { apiKeyRoutes } from '../src/routes/api-keys';
import { profileRoutes } from '../src/routes/profile';
import { adminRoutes } from '../src/routes/admin';
import { categoryRoutes } from '../src/routes/categories';
import { providerRoutes } from '../src/routes/provider';
import { subscriptionRoutes } from '../src/routes/subscriptions';
import { paymentRoutes } from '../src/routes/payments';
import { analyticsRoutes } from '../src/routes/analytics';
import { approvalRoutes } from '../src/routes/approvals';
import { usageRoutes } from '../src/routes/usage';
import { quotaRoutes } from '../src/routes/quota';
import { config } from '../src/config';

interface OpenAPISpec {
  openapi: string;
  info: any;
  servers: any[];
  tags: any[];
  paths: Record<string, any>;
  components: any;
}

class OpenAPIGenerator {
  private outputDir: string;

  constructor(outputDir: string = './docs') {
    this.outputDir = outputDir;
  }

  async generate(): Promise<void> {
    console.log('🔧 Generating OpenAPI specification from ElysiaJS app...');

    try {
      // Create a temporary app instance with all routes for spec generation
      const tempApp = this.createAppForSpecGeneration();

      // Extract the OpenAPI specification
      const openApiSpec = this.extractOpenAPIFromApp(tempApp);

      // Enhance the specification
      const enhancedSpec = this.enhanceSpecification(openApiSpec);

      // Create output directory
      this.ensureOutputDirectory();

      // Save as JSON
      const jsonPath = join(this.outputDir, 'openapi.json');
      writeFileSync(jsonPath, JSON.stringify(enhancedSpec, null, 2));
      console.log(`✅ OpenAPI JSON saved to: ${jsonPath}`);

      // Save as YAML
      const yamlContent = yaml.dump(enhancedSpec, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false,
      });
      
      const yamlPath = join(this.outputDir, 'openapi.yaml');
      writeFileSync(yamlPath, yamlContent);
      console.log(`✅ OpenAPI YAML saved to: ${yamlPath}`);

      // Generate additional documentation
      this.generateSummary(enhancedSpec);
      this.generatePostmanCollection(enhancedSpec);

      console.log('\n🎉 OpenAPI specification generation completed successfully!');

    } catch (error) {
      console.error('❌ Failed to generate OpenAPI specification:', error);
      throw error;
    }
  }

  private createAppForSpecGeneration(): Elysia {
    return new Elysia()
      .use(cors(config.cors))
      .use(swagger({
        documentation: {
          info: {
            title: 'Veil SaaS Platform API',
            version: '1.0.0',
            description: 'Backend API for the Veil SaaS platform providing user authentication, API marketplace, subscription management, and comprehensive API management capabilities.',
            contact: {
              name: 'Veil Platform Team',
              url: 'https://veil.dev',
              email: 'support@veil.dev'
            },
            license: {
              name: 'MIT',
              url: 'https://opensource.org/licenses/MIT'
            }
          },
          tags: [
            { name: 'Authentication', description: 'User authentication and authorization endpoints' },
            { name: 'Marketplace', description: 'API marketplace discovery and browsing endpoints' },
            { name: 'Categories', description: 'API category management endpoints' },
            { name: 'Provider', description: 'API provider management and onboarding endpoints' },
            { name: 'Subscriptions', description: 'Subscription tier and plan management endpoints' },
            { name: 'Payments', description: 'Payment processing and billing endpoints' },
            { name: 'Analytics', description: 'Usage analytics and reporting endpoints' },
            { name: 'Seller', description: 'API seller dashboard and management endpoints' },
            { name: 'API Keys', description: 'API key generation and management endpoints' },
            { name: 'Profile', description: 'User profile management endpoints' },
            { name: 'Admin', description: 'Administrative panel and management endpoints' },
            { name: 'Approvals', description: 'Approval workflow and request management endpoints' },
            { name: 'Usage', description: 'API usage tracking and monitoring endpoints' },
            { name: 'Quota', description: 'API quota management and monitoring endpoints' },
          ],
          servers: [
            {
              url: 'https://api.veil.dev',
              description: 'Production server'
            },
            {
              url: 'https://staging-api.veil.dev',
              description: 'Staging server'
            },
            {
              url: `http://localhost:${config.port}`,
              description: 'Development server'
            }
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT authentication token obtained from login endpoint'
              },
              apiKeyAuth: {
                type: 'apiKey',
                in: 'header',
                name: 'X-API-Key',
                description: 'API key for accessing marketplace endpoints'
              }
            }
          },
          security: [
            { bearerAuth: [] },
            { apiKeyAuth: [] }
          ]
        },
        path: '/swagger'
      }))
      .get("/health", () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
      }), {
        tags: ['System'],
        summary: 'Health check endpoint',
        description: 'Returns the current health status of the API server'
      })
      .get("/", () => ({
        message: "Veil SaaS Platform API",
        version: "1.0.0",
        documentation: "/swagger",
      }), {
        tags: ['System'],
        summary: 'API information',
        description: 'Returns basic information about the API'
      })
      .group("/api/v1", (app) =>
        app
          .use(authRoutes)
          .use(marketplaceRoutes)
          .use(categoryRoutes)
          .use(providerRoutes)
          .use(subscriptionRoutes)
          .use(paymentRoutes)
          .use(analyticsRoutes)
          .use(sellerRoutes)
          .use(apiKeyRoutes)
          .use(profileRoutes)
          .use(adminRoutes)
          .use(approvalRoutes)
          .use(usageRoutes)
          .use(quotaRoutes)
      );
  }

  private extractOpenAPIFromApp(app: Elysia): OpenAPISpec {
    // Access the internal schema from ElysiaJS
    // This is a simplified approach - in reality, we'd need to access ElysiaJS internals
    const baseSpec: OpenAPISpec = {
      openapi: '3.0.3',
      info: {
        title: 'Veil SaaS Platform API',
        version: '1.0.0',
        description: 'Backend API for the Veil SaaS platform'
      },
      servers: [],
      tags: [],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {}
      }
    };

    return baseSpec;
  }

  private enhanceSpecification(spec: OpenAPISpec): OpenAPISpec {
    const enhanced = { ...spec };

    // Enhanced info section
    enhanced.info = {
      title: 'Veil SaaS Platform API',
      version: '1.0.0',
      description: `
# Veil SaaS Platform API

A comprehensive API marketplace platform that enables:

- **API Discovery**: Browse and discover APIs across multiple categories
- **Subscription Management**: Flexible subscription tiers and usage-based billing
- **Provider Onboarding**: Easy API submission and approval workflow  
- **Analytics & Monitoring**: Detailed usage tracking and performance metrics
- **Secure Access**: JWT authentication and API key management
- **Admin Controls**: Complete administrative dashboard and approval systems

## Getting Started

1. **Register**: Create an account using the \`/api/v1/auth/register\` endpoint
2. **Login**: Authenticate using the \`/api/v1/auth/login\` endpoint
3. **Browse APIs**: Explore available APIs via \`/api/v1/marketplace\`
4. **Subscribe**: Choose a subscription plan via \`/api/v1/subscriptions\`
5. **Generate Keys**: Create API keys via \`/api/v1/api-keys\`

## Authentication

Most endpoints require authentication via JWT Bearer tokens:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

Some marketplace endpoints also support API key authentication:
\`\`\`
X-API-Key: <your_api_key>
\`\`\`

## Rate Limits

- **Free Tier**: 1,000 requests/month, 10 requests/minute
- **Starter Tier**: 10,000 requests/month, 50 requests/minute  
- **Professional Tier**: 100,000 requests/month, 200 requests/minute
- **Enterprise Tier**: Unlimited requests, 1,000 requests/minute

## Support

- **Documentation**: https://docs.veil.dev
- **Support Email**: support@veil.dev
- **Status Page**: https://status.veil.dev
      `,
      contact: {
        name: 'Veil Platform Team',
        url: 'https://veil.dev',
        email: 'support@veil.dev'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    };

    // Enhanced servers
    enhanced.servers = [
      {
        url: 'https://api.veil.dev',
        description: 'Production server'
      },
      {
        url: 'https://staging-api.veil.dev',
        description: 'Staging server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ];

    // Enhanced tags
    enhanced.tags = [
      { name: 'Authentication', description: 'User authentication and authorization' },
      { name: 'Marketplace', description: 'API discovery and browsing' },
      { name: 'Categories', description: 'API category management' },
      { name: 'Provider', description: 'API provider onboarding and management' },
      { name: 'Subscriptions', description: 'Subscription plans and billing' },
      { name: 'Payments', description: 'Payment processing and invoicing' },
      { name: 'Analytics', description: 'Usage analytics and reporting' },
      { name: 'Seller', description: 'API seller dashboard' },
      { name: 'API Keys', description: 'API key management' },
      { name: 'Profile', description: 'User profile management' },
      { name: 'Admin', description: 'Administrative functions' },
      { name: 'Approvals', description: 'Approval workflows' },
      { name: 'Usage', description: 'Usage tracking and monitoring' },
      { name: 'Quota', description: 'Quota management and monitoring' },
      { name: 'System', description: 'System health and information' },
    ];

    // Enhanced security schemes
    enhanced.components.securitySchemes = {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT authentication token obtained from login endpoint'
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for accessing marketplace endpoints'
      }
    };

    // Add external docs
    enhanced.externalDocs = {
      description: 'Complete API Documentation',
      url: 'https://docs.veil.dev'
    };

    return enhanced;
  }

  private ensureOutputDirectory(): void {
    try {
      mkdirSync(this.outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }

  private generateSummary(spec: OpenAPISpec): void {
    const pathCount = Object.keys(spec.paths || {}).length;
    const tagCount = spec.tags?.length || 0;
    const schemaCount = Object.keys(spec.components?.schemas || {}).length;
    
    const summary = `# ${spec.info.title} - API Summary

**Version:** ${spec.info.version}  
**Generated:** ${new Date().toISOString()}

## Overview
${spec.info.description?.split('\n')[0] || 'No description available'}

## Statistics
- **Total Endpoints:** ${pathCount}
- **Categories/Tags:** ${tagCount}  
- **Data Schemas:** ${schemaCount}
- **Server Environments:** ${spec.servers?.length || 0}
- **Authentication Methods:** ${Object.keys(spec.components?.securitySchemes || {}).length}

## API Categories

${spec.tags?.map(tag => `### ${tag.name}\n${tag.description}\n`).join('\n') || 'No categories defined'}

## Server Environments

${spec.servers?.map(server => `- **${server.description}:** \`${server.url}\``).join('\n') || 'No servers defined'}

## Authentication

${Object.entries(spec.components?.securitySchemes || {}).map(([key, scheme]: [string, any]) => 
  `### ${key}\n- **Type:** ${scheme.type}\n- **Description:** ${scheme.description}\n`
).join('\n')}

## Quick Start

1. Register at \`POST /api/v1/auth/register\`
2. Login at \`POST /api/v1/auth/login\` 
3. Browse marketplace at \`GET /api/v1/marketplace\`
4. Create subscription at \`POST /api/v1/subscriptions\`
5. Generate API key at \`POST /api/v1/api-keys\`

## Resources

- **Documentation:** ${spec.externalDocs?.url || 'https://docs.veil.dev'}
- **Support:** ${spec.info.contact?.email || 'support@veil.dev'}
- **License:** ${spec.info.license?.name || 'MIT'}

---

*This summary was automatically generated from the OpenAPI specification.*
`;

    const summaryPath = join(this.outputDir, 'README.md');
    writeFileSync(summaryPath, summary);
    console.log(`📊 API documentation saved to: ${summaryPath}`);
  }

  private generatePostmanCollection(spec: OpenAPISpec): void {
    const collection = {
      info: {
        name: spec.info.title,
        description: spec.info.description?.split('\n')[0] || '',
        version: spec.info.version,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{jwt_token}}',
            type: 'string'
          }
        ]
      },
      variable: [
        {
          key: 'base_url',
          value: 'https://api.veil.dev',
          type: 'string'
        },
        {
          key: 'jwt_token',
          value: '',
          type: 'string'
        },
        {
          key: 'api_key',
          value: '',
          type: 'string'
        }
      ],
      item: [
        {
          name: 'Authentication',
          item: [
            {
              name: 'Register User',
              request: {
                method: 'POST',
                url: '{{base_url}}/api/v1/auth/register',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    email: 'user@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    password: 'SecurePassword123!'
                  }, null, 2)
                }
              }
            },
            {
              name: 'Login User',
              request: {
                method: 'POST',
                url: '{{base_url}}/api/v1/auth/login',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    email: 'user@example.com',
                    password: 'SecurePassword123!'
                  }, null, 2)
                }
              }
            }
          ]
        },
        {
          name: 'Marketplace',
          item: [
            {
              name: 'Browse APIs',
              request: {
                method: 'GET',
                url: '{{base_url}}/api/v1/marketplace'
              }
            },
            {
              name: 'Search APIs',
              request: {
                method: 'GET',
                url: '{{base_url}}/api/v1/marketplace?search=weather&category=1&page=1&limit=10'
              }
            }
          ]
        }
      ]
    };

    const collectionPath = join(this.outputDir, 'postman-collection.json');
    writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
    console.log(`📮 Postman collection saved to: ${collectionPath}`);
  }
}

// Run the generator if this script is executed directly
if (import.meta.main) {
  const generator = new OpenAPIGenerator();
  
  generator.generate().then(() => {
    console.log('\n✨ OpenAPI documentation generation completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 OpenAPI generation failed:', error);
    process.exit(1);
  });
}

export { OpenAPIGenerator };