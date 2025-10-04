import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PricingYAMLConfig, PricingModelConfig, PromotionConfig, PricingModelYAML } from '../../types/pricing-types';

export class PricingConfigLoader {
  private configCache: Map<string, PricingModelConfig> = new Map();
  private configDir: string;

  constructor(configDir: string = './config/pricing') {
    this.configDir = configDir;
  }

  /**
   * Load all pricing configurations from YAML files
   */
  async loadPricingConfigs(): Promise<PricingModelConfig[]> {
    try {
      const files = await this.getConfigFiles();
      const allModels: PricingModelConfig[] = [];

      for (const file of files) {
        const configs = await this.loadConfigFile(file);
        allModels.push(...configs);
      }

      // Cache the loaded configs
      for (const model of allModels) {
        if (model.uid) {
          this.configCache.set(model.uid, model);
        }
      }

      console.log(`Loaded ${allModels.length} pricing models from ${files.length} files`);
      return allModels;

    } catch (error) {
      console.error('Failed to load pricing configurations:', error);
      throw new Error(`Configuration loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load and parse a single YAML config file
   */
  private async loadConfigFile(filePath: string): Promise<PricingModelConfig[]> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const yamlData = yaml.load(fileContent) as PricingYAMLConfig;

      // Validate structure
      this.validateYAMLStructure(yamlData);

      // Transform YAML to internal format
      const models = yamlData.pricing_models.map(model =>
        this.transformYAMLToPricingModel(model)
      );

      return models;

    } catch (error) {
      console.error(`Failed to load config file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Transform YAML format to internal PricingModelConfig format
   */
  private transformYAMLToPricingModel(yaml: PricingModelYAML): PricingModelConfig {
    return {
      uid: yaml.id,
      name: yaml.name,
      description: yaml.description,
      type: yaml.type,
      billingCycle: yaml.billing_cycle,
      currency: yaml.currency,
      basePrice: yaml.base_price,
      config: {
        tiers: yaml.tiers?.map((tier, index) => ({
          name: tier.name,
          limitRequests: tier.limit,
          pricePerUnit: tier.price_per_unit,
          baseFee: tier.base_fee,
          features: tier.features,
        })),
        includedUsage: yaml.included_usage ? {
          requests: yaml.included_usage.requests,
          dataTransferGB: yaml.included_usage.data_transfer_gb,
        } : undefined,
        overage: yaml.overage ? {
          enabled: yaml.overage.enabled,
          requestsPricePerUnit: yaml.overage.requests_price_per_unit || 0,
          dataPricePerGB: yaml.overage.data_price_per_gb,
          graceRequests: yaml.overage.grace_requests,
        } : undefined,
        quotas: yaml.quotas ? {
          requestsPerHour: yaml.quotas.requests_per_hour,
          requestsPerDay: yaml.quotas.requests_per_day,
          requestsPerMonth: yaml.quotas.requests_per_month,
          dataTransferGB: yaml.quotas.data_transfer_gb,
          concurrentRequests: yaml.quotas.concurrent_requests,
        } : undefined,
      },
      isActive: true,
    };
  }

  /**
   * Validate YAML structure
   */
  private validateYAMLStructure(config: PricingYAMLConfig): void {
    if (!config.pricing_models || !Array.isArray(config.pricing_models)) {
      throw new Error('Invalid YAML: pricing_models array is required');
    }

    for (const model of config.pricing_models) {
      // Required fields
      if (!model.id || !model.name || !model.type || !model.billing_cycle) {
        throw new Error(`Invalid pricing model: missing required fields (id, name, type, billing_cycle)`);
      }

      // Valid type
      const validTypes = ['usage_based', 'subscription', 'freemium', 'hybrid'];
      if (!validTypes.includes(model.type)) {
        throw new Error(`Invalid pricing model type: ${model.type}`);
      }

      // Valid billing cycle
      const validCycles = ['daily', 'weekly', 'monthly', 'yearly'];
      if (!validCycles.includes(model.billing_cycle)) {
        throw new Error(`Invalid billing cycle: ${model.billing_cycle}`);
      }

      // Validate tiers if present
      if (model.tiers) {
        for (const tier of model.tiers) {
          if (!tier.name || tier.price_per_unit === undefined || tier.base_fee === undefined) {
            throw new Error(`Invalid tier in model ${model.id}: missing required fields`);
          }

          if (tier.price_per_unit < 0 || tier.base_fee < 0) {
            throw new Error(`Invalid tier in model ${model.id}: negative prices not allowed`);
          }
        }
      }

      // Validate business rules
      this.validateBusinessRules(model);
    }
  }

  /**
   * Validate business logic rules
   */
  private validateBusinessRules(model: PricingModelYAML): void {
    // Usage-based models must have tiers
    if (model.type === 'usage_based' && (!model.tiers || model.tiers.length === 0)) {
      throw new Error(`Usage-based pricing model ${model.id} must have at least one tier`);
    }

    // Subscription models must have base price
    if (model.type === 'subscription' && !model.base_price) {
      throw new Error(`Subscription pricing model ${model.id} must have a base_price`);
    }

    // Freemium models must have free tier
    if (model.type === 'freemium') {
      if (!model.included_usage || model.included_usage.requests === undefined) {
        throw new Error(`Freemium model ${model.id} must define included_usage`);
      }
    }

    // Tiers should be in ascending order
    if (model.tiers && model.tiers.length > 1) {
      for (let i = 1; i < model.tiers.length; i++) {
        const prevLimit = model.tiers[i - 1].limit;
        const currentLimit = model.tiers[i].limit;

        if (prevLimit !== null && currentLimit !== null && currentLimit <= prevLimit) {
          throw new Error(`Tier limits in model ${model.id} must be in ascending order`);
        }
      }
    }
  }

  /**
   * Get all YAML config files from directory
   */
  private async getConfigFiles(): Promise<string[]> {
    try {
      // Ensure config directory exists
      await fs.mkdir(this.configDir, { recursive: true });

      const entries = await fs.readdir(this.configDir, { withFileTypes: true });
      const yamlFiles = entries
        .filter(entry => entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')))
        .map(entry => path.join(this.configDir, entry.name));

      return yamlFiles;

    } catch (error) {
      console.error('Failed to read config directory:', error);
      throw error;
    }
  }

  /**
   * Get cached pricing model by UID
   */
  getCachedModel(uid: string): PricingModelConfig | undefined {
    return this.configCache.get(uid);
  }

  /**
   * Clear config cache
   */
  clearCache(): void {
    this.configCache.clear();
  }

  /**
   * Reload configurations (hot-reload support)
   */
  async reloadConfigs(): Promise<PricingModelConfig[]> {
    this.clearCache();
    return await this.loadPricingConfigs();
  }

  /**
   * Watch for config file changes (for development)
   */
  async watchConfigChanges(callback: (models: PricingModelConfig[]) => void): Promise<void> {
    try {
      const watcher = fs.watch(this.configDir);

      for await (const event of watcher) {
        if (event.eventType === 'change' || event.eventType === 'rename') {
          console.log(`Config file changed: ${event.filename}`);
          try {
            const models = await this.reloadConfigs();
            callback(models);
          } catch (error) {
            console.error('Failed to reload configs after change:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to watch config changes:', error);
    }
  }

  /**
   * Validate a single config object (for testing)
   */
  validateConfig(config: PricingYAMLConfig): boolean {
    try {
      this.validateYAMLStructure(config);
      return true;
    } catch (error) {
      console.error('Config validation failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const pricingConfigLoader = new PricingConfigLoader();