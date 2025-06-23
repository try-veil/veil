export enum ParameterType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  ENUM = 'ENUM',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
}

export enum ParameterCondition {
  REQUIRED = 'REQUIRED',
  OPTIONAL = 'OPTIONAL',
}

export enum ParameterStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEPRECATED = 'DEPRECATED',
}

/**
 * A consolidated representation of a route parameter
 * This is the single source of truth for RouteParameter entity
 */
export interface ParameterSchema {
  type: string;
  default?: string | number | boolean;
  externalDocs?: {
    description?: string;
    url?: string;
  };
}

export interface RouteParameter {
  id: string;
  name: string;
  endpointId: string;
  index: number;
  paramType: ParameterType;
  condition: ParameterCondition;
  status: ParameterStatus;
  querystring: boolean;
  description?: string;
  defaultValue?: string;
  value?: string;
  options?: string[];
  schema?: ParameterSchema;
  schemaDefinition?: ParameterSchema;
  createdAt: Date;
  updatedAt: Date;
}
