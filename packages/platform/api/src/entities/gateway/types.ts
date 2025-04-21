export enum GatewayServiceStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Pending = 'Pending',
}

export enum GatewayStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

export enum GatewayType {
  RapidAPI = 'rapidapi',
  Apigee = 'Apigee',
}

export interface Gateway {
  id: string;
  dns: string;
  serviceStatus: GatewayServiceStatus;
  type: GatewayType;
  status: GatewayStatus;
  isDefault: boolean;
  tenantId: string;
}

export interface GatewayTemplate {
  id: string;
  name: string;
  urlPattern: string;
}

export interface GatewayHeader {
  id: string;
  gatewayTemplateId: string;
  paramName: string;
  paramValue: string;
  paramDescription: string;
}

export interface Tenant {
  id: string;
  domain: string;
  name: string;
  slugifiedKey: string;
}
