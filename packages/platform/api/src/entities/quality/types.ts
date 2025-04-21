export enum QualityMetricType {
  LATENCY = 'LATENCY',
  SUCCESS_RATE = 'SUCCESS_RATE',
  ERROR_RATE = 'ERROR_RATE',
  UPTIME = 'UPTIME',
  DOCUMENTATION = 'DOCUMENTATION',
  SECURITY = 'SECURITY',
}

export interface QualityMetric {
  id: string;
  apiId: string;
  type: QualityMetricType;
  score: number;
  details?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityThreshold {
  id: string;
  metricType: QualityMetricType;
  minScore: number;
  maxScore: number;
  warningThreshold: number;
  criticalThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityAlert {
  id: string;
  apiId: string;
  metricType: QualityMetricType;
  score: number;
  threshold: number;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  createdAt: Date;
  updatedAt: Date;
}
