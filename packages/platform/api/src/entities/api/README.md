# API Domain Entities

This directory contains the entities related to API management.

## Entity Relationships

```mermaid
erDiagram
    Api ||--o{ ApiGroup : "contains"
    Api {
        string id PK
        string name
        string title
        string visibility
        string pricing
        string status
        string category
        string slugifiedName
        string apiType
        boolean isCtxSubscriber
    }
    ApiGroup {
        string id PK
        string name
        string description
        string apiId FK
    }
</mermaid>

## Types

### Api
The main entity representing an API in the system. It contains:
- Basic metadata (name, title, description)
- Visibility and pricing settings
- Category information
- Quality metrics
- Gateway configuration

### ApiGroup
A logical grouping of endpoints within an API. Used to organize endpoints by functionality or domain.

## Validation Rules

### Api
- `id`: Must be a valid UUID
- `name`, `title`: Required strings
- `visibility`: Must be one of `PUBLIC` or `PRIVATE`
- `pricing`: Must be one of `FREE`, `PAID`, or `FREEMIUM`
- `thumbnail`: Must be a valid URL if provided
- `status`: Must be one of `ACTIVE`, `INACTIVE`, or `DELETED`

### ApiGroup
- `id`: Must be a valid UUID
- `name`: Required string
- `apiId`: Must be a valid UUID referencing an existing Api
```
