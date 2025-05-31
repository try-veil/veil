# Endpoint Domain Entities

This directory contains the entities related to API endpoints and their parameters.

## Entity Relationships

```mermaid
erDiagram
    Endpoint ||--o{ RouteParameter : "has"
    Endpoint {
        string id PK
        string name
        string method
        string route
        string groupId FK
        number index
        boolean isGraphQL
    }
    RouteParameter {
        string id PK
        string name
        string endpointId FK
        string paramType
        string condition
        string value
        boolean querystring
        string status
    }
</mermaid>

## Types

### Endpoint
Represents an individual API endpoint with:
- HTTP method and route
- Name and description
- Security settings
- External documentation
- GraphQL schema (if applicable)

### RouteParameter
Defines parameters for an endpoint:
- Query parameters
- Path parameters
- Required vs optional parameters
- Parameter type and validation rules

## Parameter Types
- `STRING`: Text values
- `ENUM`: Fixed set of values
- `NUMBER`: Numeric values
- `BOOLEAN`: True/false values
- `OBJECT`: Complex objects
- `ARRAY`: Lists of values

## Parameter Conditions
- `REQUIRED`: Parameter must be provided
- `OPTIONAL`: Parameter can be omitted

## Parameter Status
- `ACTIVE`: Parameter is in use
- `INACTIVE`: Parameter is temporarily disabled
- `DEPRECATED`: Parameter is marked for removal

## Validation Rules

### Endpoint
- `id`: Must be a valid UUID
- `name`: Required string
- `method`: Valid HTTP method
- `route`: Valid URL path
- `groupId`: Must be a valid UUID referencing an ApiGroup
- `index`: Non-negative integer

### RouteParameter
- `id`: Must be a valid UUID
- `name`: Required string
- `endpointId`: Must be a valid UUID referencing an Endpoint
- `paramType`: Must be one of the defined parameter types
- `condition`: Must be either REQUIRED or OPTIONAL
- `status`: Must be one of ACTIVE, INACTIVE, or DEPRECATED
```
