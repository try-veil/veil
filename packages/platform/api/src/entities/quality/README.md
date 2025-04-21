# Quality Domain Entities

This directory contains the entities related to API quality metrics, thresholds, and alerts.

## Entity Relationships

```mermaid
erDiagram
    QualityMetric }|--|| Api : "measures"
    QualityThreshold ||--|{ QualityMetric : "defines"
    QualityAlert }|--|| QualityMetric : "triggered by"

    QualityMetric {
        string id PK
        string apiId FK
        string type
        number score
        json details
    }

    QualityThreshold {
        string id PK
        string metricType
        number minScore
        number maxScore
        number warningThreshold
        number criticalThreshold
    }

    QualityAlert {
        string id PK
        string apiId FK
        string metricType
        number score
        number threshold
        string severity
        string message
    }
</mermaid>

## Types

### QualityMetric
Measures various aspects of API quality:
- Performance metrics
- Reliability metrics
- Documentation quality
- Security measures

### QualityThreshold
Defines acceptable ranges for quality metrics:
- Minimum and maximum scores
- Warning thresholds
- Critical thresholds

### QualityAlert
Notifications when quality metrics breach thresholds:
- Alert severity levels
- Threshold breaches
- Alert messages

## Quality Metric Types
- `LATENCY`: API response time
- `SUCCESS_RATE`: Successful request percentage
- `ERROR_RATE`: Failed request percentage
- `UPTIME`: API availability
- `DOCUMENTATION`: Documentation completeness
- `SECURITY`: Security compliance score

## Validation Rules

### QualityMetric
- `id`: Must be a valid UUID
- `apiId`: Must be a valid UUID referencing an API
- `type`: Must be one of the defined metric types
- `score`: Number between 0 and 100
- `details`: Optional JSON object with metric-specific data

### QualityThreshold
- `id`: Must be a valid UUID
- `metricType`: Must be one of the defined metric types
- `minScore`: Number between 0 and 100
- `maxScore`: Number between 0 and 100
- `warningThreshold`: Must be less than criticalThreshold
- `criticalThreshold`: Must be between minScore and maxScore

### QualityAlert
- `id`: Must be a valid UUID
- `apiId`: Must be a valid UUID referencing an API
- `metricType`: Must be one of the defined metric types
- `score`: Number between 0 and 100
- `severity`: Must be either WARNING or CRITICAL
- `message`: Non-empty string describing the alert
```
