export enum CreditUsageType {
  API_CALL = 'API_CALL',
  FEATURE_USAGE = 'FEATURE_USAGE',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
}

export enum CreditBalanceStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

export interface CreditBalance {
  id: string;
  userId: string;
  balance: number;
  status: CreditBalanceStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditUsage {
  id: string;
  userId: string;
  amount: number;
  type: CreditUsageType;
  endpointId?: string;
  featureId?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CreditAdjustment {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  adjustedBy: string;
}

export interface CreditBalanceResponse {
  balance: number;
  status: CreditBalanceStatus;
  expiresAt?: Date;
  recentUsage: CreditUsage[];
}
