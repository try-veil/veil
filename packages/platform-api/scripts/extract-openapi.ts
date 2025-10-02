#!/usr/bin/env bun

/**
 * Script to extract OpenAPI specification from ElysiaJS application
 * and save it as YAML and JSON files
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

// Import the main app
import '../src/index';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  tags: Array<{
    name: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
}

class OpenAPIExtractor {
  private baseUrl: string;
  private outputDir: string;

  constructor(baseUrl: string = 'http://localhost:3000', outputDir: string = './docs') {
    this.baseUrl = baseUrl;
    this.outputDir = outputDir;
  }

  async extract(): Promise<void> {
    console.log('🔍 Extracting OpenAPI specification from ElysiaJS...');

    try {
      // Start the server briefly to get the OpenAPI spec
      console.log('🌐 Starting server to extract specification...');
      
      // Give the server a moment to initialize
      await this.sleep(2000);

      // Fetch the OpenAPI JSON from the swagger endpoint
      const response = await fetch(`${this.baseUrl}/swagger/json`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
      }

      const openApiSpec: OpenAPISpec = await response.json();
      
      // Enhance the specification with additional metadata
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
      });
      
      const yamlPath = join(this.outputDir, 'openapi.yaml');
      writeFileSync(yamlPath, yamlContent);
      console.log(`✅ OpenAPI YAML saved to: ${yamlPath}`);

      // Generate a summary
      this.generateSummary(enhancedSpec);

      console.log('\n🎉 OpenAPI specification extraction completed successfully!');

    } catch (error) {
      console.error('❌ Failed to extract OpenAPI specification:', error);
      throw error;
    }
  }

  private enhanceSpecification(spec: OpenAPISpec): OpenAPISpec {
    const enhanced = { ...spec };

    // Add security schemes if not present
    if (!enhanced.components) {
      enhanced.components = { schemas: {}, securitySchemes: {} };
    }

    if (!enhanced.components.securitySchemes) {
      enhanced.components.securitySchemes = {};
    }

    // Add Bearer token authentication
    enhanced.components.securitySchemes.bearerAuth = {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT authentication token'
    };

    // Add API Key authentication
    enhanced.components.securitySchemes.apiKeyAuth = {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
      description: 'API key for accessing endpoints'
    };

    // Add contact information
    if (!enhanced.info.contact) {
      enhanced.info.contact = {
        name: 'Veil Platform Team',
        url: 'https://veil.dev',
        email: 'support@veil.dev'
      };
    }

    // Add license information
    if (!enhanced.info.license) {
      enhanced.info.license = {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      };
    }

    // Add external documentation
    if (!enhanced.externalDocs) {
      enhanced.externalDocs = {
        description: 'Veil Platform Documentation',
        url: 'https://docs.veil.dev'
      };
    }

    // Add production server if not present
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
      // Directory might already exist, ignore error
    }
  }

  private generateSummary(spec: OpenAPISpec): void {
    const pathCount = Object.keys(spec.paths || {}).length;
    const tagCount = spec.tags?.length || 0;
    const schemaCount = Object.keys(spec.components?.schemas || {}).length;
    
    const summary = `
# OpenAPI Specification Summary

**API Title:** ${spec.info.title}
**Version:** ${spec.info.version}
**Description:** ${spec.info.description}

## Statistics
- **Endpoints:** ${pathCount}
- **Tags/Categories:** ${tagCount}  
- **Schemas:** ${schemaCount}
- **Servers:** ${spec.servers?.length || 0}

## Tags
${spec.tags?.map(tag => `- **${tag.name}:** ${tag.description}`).join('\n') || 'None'}

## Servers
${spec.servers?.map(server => `- **${server.description}:** ${server.url}`).join('\n') || 'None'}

## Security Schemes
${Object.keys(spec.components?.securitySchemes || {}).map(key => `- ${key}`).join('\n') || 'None'}

Generated on: ${new Date().toISOString()}
`;

    const summaryPath = join(this.outputDir, 'api-summary.md');
    writeFileSync(summaryPath, summary.trim());
    console.log(`📊 API summary saved to: ${summaryPath}`);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Check if this script is being run directly
if (import.meta.main) {
  const extractor = new OpenAPIExtractor();
  
  extractor.extract().then(() => {
    console.log('\n✨ OpenAPI extraction completed successfully!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 OpenAPI extraction failed:', error);
    process.exit(1);
  });
}

export { OpenAPIExtractor };