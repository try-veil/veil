export enum LoadBalancerStrategy {
  RoundRobin = 'RoundRobin',
  Geolocation = 'Geolocation',
}

export interface PlanConfig {
  id: string;
  enabled: boolean;
  pricePerMonth: number;
  requestQuotaPerMonth: number;
  hardLimitQuota: number;

  basicOf?: HubListing;
  proOf?: HubListing;
  ultraOf?: HubListing;
}

export interface HubListing {
  id: string;
  logo?: string;
  category: string;
  shortDescription?: string;
  longDescription?: string;
  website?: string;
  termsOfUse?: string;
  visibleToPublic: boolean;
  loadBalancer: LoadBalancerStrategy;
  healthCheckUrl?: string;
  apiDocumentation?: string;
  proxySecret?: string;
  requestSizeLimitMb?: number;
  proxyTimeoutSeconds?: number;

  basicPlanId?: string;
  basicPlan?: PlanConfig;

  proPlanId?: string;
  proPlan?: PlanConfig;

  ultraPlanId?: string;
  ultraPlan?: PlanConfig;

  projectId: number;
  project: Project;
}

export interface Project {
  id: number;
}
