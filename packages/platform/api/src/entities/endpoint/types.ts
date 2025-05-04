import {
  RouteParameter,
  ParameterType as ParamType,
  ParameterCondition as ParamCondition,
  ParameterStatus as ParamStatus,
  ParameterSchema,
} from '../parameter/types';

export { ParamType, ParamCondition, ParamStatus, RouteParameter };

export interface ExternalDocs {
  description: string;
  url: string;
}

export interface Endpoint {
  id: string;
  index: number;
  groupId: string;
  method: string;
  name: string;
  route: string;
  description?: string;
  isGraphQL: boolean;
  security?: any[];
  externalDocs?: ExternalDocs;
  graphQLSchema?: any;
  createdAt: Date;
  updatedAt: Date;
}

// For backward compatibility, re-export ParameterSchema as well
export { ParameterSchema };
