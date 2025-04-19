# Project Domain Entities

This directory contains the entities related to project management and access control.

## Entity Relationships

```mermaid
erDiagram
    Project ||--o{ ProjectAcl : "has"
    Project ||--o{ ProjectAllowedAPI : "allows"
    Project {
        string id PK
        string name
        string description
        string status
        string ownerId FK
    }
    ProjectAcl {
        string id PK
        string projectId FK
        string userId FK
        string role
    }
    ProjectAllowedAPI {
        string id PK
        string projectId FK
        string apiId FK
        string billingPlanVersionId FK
    }
</mermaid>

## Types

### Project
The main project entity that represents a workspace for API management:
- Basic project information
- Project status
- Owner reference

### ProjectAcl
Access Control List for project members:
- User assignments
- Role-based permissions
- Access management

### ProjectAllowedAPI
Maps APIs that are accessible within a project:
- API access grants
- Billing plan associations
- Usage tracking

## Project Roles
- `OWNER`: Full control over project
- `ADMIN`: Administrative access
- `DEVELOPER`: API usage and development
- `VIEWER`: Read-only access

## Project Status
- `ACTIVE`: Project is in use
- `INACTIVE`: Project is temporarily disabled
- `DELETED`: Project has been removed

## Validation Rules

### Project
- `id`: Must be a valid UUID
- `name`: Required non-empty string
- `status`: Must be one of the defined statuses
- `ownerId`: Must be a valid UUID referencing a User

### ProjectAcl
- `id`: Must be a valid UUID
- `projectId`: Must be a valid UUID referencing a Project
- `userId`: Must be a valid UUID referencing a User
- `role`: Must be one of the defined roles

### ProjectAllowedAPI
- `id`: Must be a valid UUID
- `projectId`: Must be a valid UUID referencing a Project
- `apiId`: Must be a valid UUID referencing an API
- `billingPlanVersionId`: Optional UUID referencing a BillingPlanVersion
```
