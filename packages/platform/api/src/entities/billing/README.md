# Billing Domain Entities

This directory contains the entities related to API billing, pricing plans, and features.

## Entity Relationships

```mermaid
erDiagram
    BillingPlan ||--o{ BillingPlanVersion : "has"
    BillingPlanVersion ||--o{ BillingLimit : "defines"
    BillingPlanVersion ||--o{ EnabledBillingFeature : "enables"
    BillingLimit ||--|| BillingItem : "references"
    EnabledBillingFeature ||--|| BillingFeature : "references"

    BillingPlan {
        string id PK
        string name
        string visibility
        boolean recommended
        boolean hidden
    }

    BillingPlanVersion {
        string id PK
        string billingPlanId FK
        string period
        number price
        boolean current
    }

    BillingLimit {
        string id PK
        string billingPlanVersionId FK
        string billingItemId FK
        number amount
        boolean unlimited
        number overageprice
    }

    BillingItem {
        string id PK
        string name
        string type
        boolean allEndpoints
    }

    BillingFeature {
        string id PK
        string name
        string description
    }

    EnabledBillingFeature {
        string id PK
        string billingFeatureId FK
        string billingPlanVersionId FK
        string status
    }
</mermaid>

## Types

### BillingPlan
The main billing plan entity that defines:
- Plan visibility (public/private)
- Developer access controls
- Approval requirements
- Legal documentation links

### BillingPlanVersion
A specific version of a billing plan with:
- Pricing details
- Billing period
- Rate limits
- Locale-specific pricing

### BillingLimit
Usage limits for a billing plan version:
- Request quotas
- Feature limits
- Overage pricing

### BillingItem
Billable items that can be limited:
- API requests
- Feature access
- Resource usage

### BillingFeature
Features that can be enabled in billing plans:
- API capabilities
- Enhanced functionality
- Access levels

### EnabledBillingFeature
Maps features to billing plan versions with:
- Feature status
- Usage notes
- Version-specific settings

## Billing Periods
- `PERUSE`: Pay per use
- `MONTHLY`: Monthly subscription
- `YEARLY`: Annual subscription
- `DAILY`: Daily limits
- `HOURLY`: Hourly limits

## Validation Rules

### BillingPlan
- `id`: Must be a valid UUID
- `name`: Required string
- `visibility`: Must be PUBLIC or PRIVATE
- `allowedPlanDevelopers`: Array of developer IDs

### BillingPlanVersion
- `id`: Must be a valid UUID
- `price`: Non-negative number
- `period`: Must be one of the defined billing periods
- `current`: Boolean flag for active version

### BillingLimit
- `amount`: Integer for usage limit
- `overageprice`: Non-negative number
- `unlimited`: Boolean flag for unlimited usage

### EnabledBillingFeature
- `status`: Must be ACTIVE or INACTIVE
- Both feature and version IDs must be valid UUIDs
```
