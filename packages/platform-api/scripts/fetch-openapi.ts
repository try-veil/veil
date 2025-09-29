#!/usr/bin/env bun

/**
 * Fetch OpenAPI specification from running ElysiaJS server
 * and save as YAML and JSON files
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { spawn } from 'child_process';

interface OpenAPISpec {
  openapi: string;
  info: any;
  servers: any[];
  tags: any[];
  paths: Record<string, any>;
  components: any;
}

class OpenAPIFetcher {
  private serverUrl: string;
  private outputDir: string;
  private serverProcess: any;

  constructor(serverUrl: string = 'http://localhost:3002', outputDir: string = './docs') {
    this.serverUrl = serverUrl;
    this.outputDir = outputDir;
  }

  async fetch(): Promise<void> {
    console.log('🚀 Starting server to fetch OpenAPI specification...');

    try {
      // Start the server temporarily
      await this.startServer();
      
      // Wait for server to be ready
      await this.waitForServer();

      // Fetch the OpenAPI specification
      console.log('📡 Fetching OpenAPI specification from server...');
      const response = await fetch(`${this.serverUrl}/swagger/json`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
      }

      const openApiSpec: OpenAPISpec = await response.json();
      
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

      console.log('\n🎉 OpenAPI specification extraction completed successfully!');

    } catch (error) {
      console.error('❌ Failed to fetch OpenAPI specification:', error);
      throw error;
    } finally {
      await this.stopServer();
    }
  }

  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🌐 Starting temporary server on port 3002...');
      
      this.serverProcess = spawn('bun', ['run', 'dev'], {
        env: { 
          ...process.env, 
          PORT: '3002',
          NODE_ENV: 'development'
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let hasStarted = false;

      this.serverProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        if (output.includes('Server is running') && !hasStarted) {
          hasStarted = true;
          console.log('✅ Server started successfully');
          resolve(undefined);
        }
      });

      this.serverProcess.stderr?.on('data', (data: Buffer) => {
        console.error('Server error:', data.toString());
      });

      this.serverProcess.on('error', (error) => {
        if (!hasStarted) {
          reject(error);
        }
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!hasStarted) {
          reject(new Error('Server startup timeout'));
        }
      }, 15000);
    });
  }

  private async waitForServer(): Promise<void> {
    const maxRetries = 10;
    const retryDelay = 1000; // 1 second

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🔄 Checking server health (attempt ${i + 1}/${maxRetries})...`);
        const response = await fetch(`${this.serverUrl}/health`);
        
        if (response.ok) {
          console.log('✅ Server is healthy and ready');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await this.sleep(retryDelay);
    }
    
    throw new Error('Server failed to become ready');
  }

  private async stopServer(): Promise<void> {
    if (this.serverProcess) {
      console.log('🛑 Stopping temporary server...');
      this.serverProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.serverProcess.kill('SIGKILL');
          resolve(undefined);
        }, 5000);

        this.serverProcess.on('exit', () => {
          clearTimeout(timeout);
          resolve(undefined);
        });
      });
      
      console.log('✅ Server stopped');
    }
  }

  private enhanceSpecification(spec: OpenAPISpec): OpenAPISpec {
    const enhanced = { ...spec };

    // Ensure security schemes are present
    if (!enhanced.components.securitySchemes) {
      enhanced.components.securitySchemes = {};
    }

    if (!enhanced.components.securitySchemes.bearerAuth) {
      enhanced.components.securitySchemes.bearerAuth = {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT authentication token obtained from login endpoint'
      };
    }

    if (!enhanced.components.securitySchemes.apiKeyAuth) {
      enhanced.components.securitySchemes.apiKeyAuth = {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for accessing marketplace endpoints'
      };
    }

    // Add enhanced info
    enhanced.info.contact = enhanced.info.contact || {
      name: 'Veil Platform Team',
      url: 'https://veil.dev',
      email: 'support@veil.dev'
    };

    enhanced.info.license = enhanced.info.license || {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    };

    // Add external docs
    enhanced.externalDocs = enhanced.externalDocs || {
      description: 'Complete API Documentation',
      url: 'https://docs.veil.dev'
    };

    // Enhance servers with production URLs if not present
    const hasProductionServer = enhanced.servers?.some(s => 
      s.url.includes('api.veil.dev') || s.description.includes('Production')
    );

    if (!hasProductionServer) {
      enhanced.servers = [
        {
          url: 'https://api.veil.dev',
          description: 'Production server'
        },
        {
          url: 'https://staging-api.veil.dev',
          description: 'Staging server'
        },
        ...(enhanced.servers || [])
      ];
    }

    return enhanced;
  }

  private ensureOutputDirectory(): void {
    try {
      mkdirSync(this.outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private generateSummary(spec: OpenAPISpec): void {
    const pathCount = Object.keys(spec.paths || {}).length;
    const tagCount = spec.tags?.length || 0;
    const schemaCount = Object.keys(spec.components?.schemas || {}).length;
    
    const endpointsByTag = this.groupEndpointsByTag(spec);
    
    const summary = `# ${spec.info.title} - API Documentation

**Version:** ${spec.info.version}  
**Generated:** ${new Date().toISOString()}

## Overview
${spec.info.description?.split('\n')[0] || 'Comprehensive API marketplace platform'}

## Statistics
- **Total Endpoints:** ${pathCount}
- **Categories/Tags:** ${tagCount}  
- **Data Schemas:** ${schemaCount}
- **Server Environments:** ${spec.servers?.length || 0}
- **Authentication Methods:** ${Object.keys(spec.components?.securitySchemes || {}).length}

## Endpoints by Category

${endpointsByTag.map(category => `### ${category.tag}
${category.description}

${category.endpoints.map(endpoint => `- \`${endpoint.method.toUpperCase()} ${endpoint.path}\` - ${endpoint.summary || 'No description'}`).join('\n')}

`).join('\n')}

## Server Environments

${spec.servers?.map(server => `- **${server.description}:** \`${server.url}\``).join('\n') || 'No servers defined'}

## Authentication

${Object.entries(spec.components?.securitySchemes || {}).map(([key, scheme]: [string, any]) => 
  `### ${key}
- **Type:** ${scheme.type}
- **Description:** ${scheme.description}
${scheme.scheme ? `- **Scheme:** ${scheme.scheme}` : ''}
${scheme.bearerFormat ? `- **Format:** ${scheme.bearerFormat}` : ''}
${scheme.name ? `- **Header:** ${scheme.name}` : ''}
`).join('\n')}

## Quick Start

1. **Register:** \`POST /api/v1/auth/register\`
2. **Login:** \`POST /api/v1/auth/login\` 
3. **Browse APIs:** \`GET /api/v1/marketplace\`
4. **Subscribe:** \`POST /api/v1/subscriptions\`
5. **Generate API Key:** \`POST /api/v1/api-keys\`

## Resources

- **Documentation:** ${spec.externalDocs?.url || 'https://docs.veil.dev'}
- **Support:** ${spec.info.contact?.email || 'support@veil.dev'}
- **License:** ${spec.info.license?.name || 'MIT'}

---

*This documentation was automatically generated from the OpenAPI specification.*
`;

    const summaryPath = join(this.outputDir, 'README.md');
    writeFileSync(summaryPath, summary);
    console.log(`📊 API documentation saved to: ${summaryPath}`);
  }

  private groupEndpointsByTag(spec: OpenAPISpec): Array<{
    tag: string;
    description: string;
    endpoints: Array<{ method: string; path: string; summary?: string }>
  }> {
    const groups: Record<string, { description: string; endpoints: Array<{ method: string; path: string; summary?: string }> }> = {};
    
    // Initialize groups from tags
    spec.tags?.forEach(tag => {
      groups[tag.name] = {
        description: tag.description || '',
        endpoints: []
      };
    });

    // Group endpoints by their tags
    Object.entries(spec.paths || {}).forEach(([path, pathItem]) => {
      Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
        if (method === 'parameters') return; // Skip parameters
        
        const tags = operation.tags || ['Untagged'];
        const summary = operation.summary || operation.description || '';
        
        tags.forEach((tag: string) => {
          if (!groups[tag]) {
            groups[tag] = { description: '', endpoints: [] };
          }
          groups[tag].endpoints.push({ method, path, summary });
        });
      });
    });

    return Object.entries(groups).map(([tag, data]) => ({
      tag,
      description: data.description,
      endpoints: data.endpoints
    }));
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
          value: spec.servers?.[0]?.url || 'https://api.veil.dev',
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
      item: this.generatePostmanItems(spec)
    };

    const collectionPath = join(this.outputDir, 'postman-collection.json');
    writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
    console.log(`📮 Postman collection saved to: ${collectionPath}`);
  }

  private generatePostmanItems(spec: OpenAPISpec): any[] {
    const items: any[] = [];
    const endpointsByTag = this.groupEndpointsByTag(spec);

    endpointsByTag.forEach(category => {
      if (category.endpoints.length === 0) return;

      const categoryItem = {
        name: category.tag,
        description: category.description,
        item: category.endpoints.map(endpoint => ({
          name: endpoint.summary || `${endpoint.method.toUpperCase()} ${endpoint.path}`,
          request: {
            method: endpoint.method.toUpperCase(),
            url: `{{base_url}}${endpoint.path}`,
            header: [
              {
                key: 'Content-Type',
                value: 'application/json'
              }
            ]
          }
        }))
      };

      items.push(categoryItem);
    });

    return items;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if executed directly
if (import.meta.main) {
  const fetcher = new OpenAPIFetcher();
  
  fetcher.fetch().then(() => {
    console.log('\n✨ OpenAPI specification fetching completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 OpenAPI fetching failed:', error);
    process.exit(1);
  });
}

export { OpenAPIFetcher };