# Parameter Entities

This directory contains the parameter-related entities for the Veil API platform, handling API endpoint parameters.

## Entities

### RouteParameter

Represents a parameter for an API endpoint route.

```typescript
interface RouteParameter {
  id: string; // UUID of the parameter
  name: string; // Parameter name
  endpointId: string; // Reference to endpoint
  paramType: ParameterType; // Parameter type (path/query/header/body)
  condition: ParameterCondition; // Required/Optional
  description?: string; // Optional parameter description
  defaultValue?: string; // Optional default value
  schema?: Record<string, any>; // Optional JSON Schema
}
```

## Enums

### ParameterType

```typescript
enum ParameterType {
  Path = 'path', // URL path parameter
  Query = 'query', // URL query parameter
  Header = 'header', // HTTP header parameter
  Body = 'body', // Request body parameter
}
```

### ParameterCondition

```typescript
enum ParameterCondition {
  Required = 'required', // Parameter must be provided
  Optional = 'optional', // Parameter is optional
}
```

## Validation

All entities use Zod schemas for runtime validation:

- UUID validation for IDs
- Enum validation for parameter types and conditions
- Required vs optional fields
- Schema validation for JSON Schema objects

## Usage Example

```typescript
import { RouteParameter, routeParameterSchema } from './entities/parameter';

// Create a new route parameter
const parameter: RouteParameter = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'userId',
  endpointId: '987fde65-c432-12d3-b456-426614174000',
  paramType: 'path',
  condition: 'required',
  description: 'The ID of the user to fetch',
  schema: {
    type: 'string',
    format: 'uuid',
  },
};

// Validate at runtime
const validatedParameter = routeParameterSchema.parse(parameter);
```

## Relationships

- RouteParameter -> Endpoint: Many-to-one (parameters belong to an endpoint)

## Parameter Types

### Path Parameters

- Used in URL path segments
- Always required
- Example: `/users/{userId}`

### Query Parameters

- Used in URL query string
- Can be optional
- Example: `/users?page=1&limit=10`

### Header Parameters

- Used in HTTP headers
- Can be optional
- Example: `X-API-Key: abc123`

### Body Parameters

- Used in HTTP request body
- Can be optional
- Supports complex JSON Schema definitions
