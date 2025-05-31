export enum ApiVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum ApiPricing {
  FREE = 'FREE',
  PAID = 'PAID',
  FREEMIUM = 'FREEMIUM',
}

export enum ApiStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEPRECATED = 'DEPRECATED',
}

export interface ApiCategory {
  id: string;
  name: string;
  color: string;
}

export interface ApiScore {
  avgServiceLevel: number;
  avgLatency: number;
  avgSuccessRate: number;
  popularityScore: number;
}

export interface ApiVersion {
  id: string;
  name: string;
  apiId: string;
  current: boolean;
  createdAt: Date;
  versionStatus: string;
  apiSubType: 'rest' | 'graphql' | 'soap';
  tags: string[];
}

export interface ApiQuality {
  score: number | null;
}

export interface Api {
  id: string;
  name: string;
  title: string;
  description: string;
  longDescription: string;
  visibility: ApiVisibility;
  slugifiedName: string;
  pricing: ApiPricing;
  status: ApiStatus;
  categoryId: string;
  category: ApiCategory;
  thumbnail?: string;
  apiType: 'http' | 'websocket' | 'grpc';
  createdAt: Date;
  updatedAt: Date;
  score: ApiScore;
  gatewayIds: string[];
  allowedContext: string[];
  isCtxSubscriber: boolean;
  quality?: ApiQuality;
}

export interface ApiGroup {
  id: string;
  name: string;
  apiId: string;
  index: number;
  description?: string;
}

export interface ApiEndpoint {
  id: string;
  name: string;
  groupId: string;
  method: string;
  route: string;
  description: string;
  index: number;
  isGraphQL: boolean;
  security: any[];
  externalDocs?: {
    description: string;
    url: string;
  };
  graphQLSchema?: string;
  createdAt: Date;
}
