/**
 * Custom error classes for the Veil API platform
 */

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST_DATA = 'INVALID_REQUEST_DATA',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Resources
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_GONE = 'RESOURCE_GONE',

  // Business Logic
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  API_NOT_APPROVED = 'API_NOT_APPROVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',

  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CADDY_SERVICE_ERROR = 'CADDY_SERVICE_ERROR',
  PAYMENT_PROVIDER_ERROR = 'PAYMENT_PROVIDER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
}

export interface ErrorDetails {
  field?: string;
  value?: any;
  constraint?: string;
  expected?: string;
  actual?: string;
}

export interface ApiErrorOptions {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: ErrorDetails[];
  cause?: Error;
  metadata?: Record<string, any>;
  retryable?: boolean;
  userFriendly?: boolean;
}

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ErrorDetails[];
  public readonly cause?: Error;
  public readonly metadata?: Record<string, any>;
  public readonly retryable: boolean;
  public readonly userFriendly: boolean;
  public readonly timestamp: string;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    
    this.name = 'ApiError';
    this.code = options.code;
    this.statusCode = options.statusCode || this.getDefaultStatusCode(options.code);
    this.details = options.details;
    this.cause = options.cause;
    this.metadata = options.metadata;
    this.retryable = options.retryable || false;
    this.userFriendly = options.userFriendly !== false; // Default to true
    this.timestamp = new Date().toISOString();

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  private getDefaultStatusCode(code: ErrorCode): number {
    const statusCodeMap: Record<ErrorCode, number> = {
      [ErrorCode.UNAUTHORIZED]: 401,
      [ErrorCode.FORBIDDEN]: 403,
      [ErrorCode.INVALID_TOKEN]: 401,
      [ErrorCode.TOKEN_EXPIRED]: 401,
      [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
      
      [ErrorCode.VALIDATION_ERROR]: 400,
      [ErrorCode.INVALID_REQUEST_DATA]: 400,
      [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
      [ErrorCode.INVALID_FORMAT]: 400,
      
      [ErrorCode.RESOURCE_NOT_FOUND]: 404,
      [ErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
      [ErrorCode.RESOURCE_CONFLICT]: 409,
      [ErrorCode.RESOURCE_GONE]: 410,
      
      [ErrorCode.INSUFFICIENT_FUNDS]: 402,
      [ErrorCode.QUOTA_EXCEEDED]: 429,
      [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
      [ErrorCode.SUBSCRIPTION_REQUIRED]: 402,
      [ErrorCode.SUBSCRIPTION_EXPIRED]: 402,
      [ErrorCode.API_NOT_APPROVED]: 403,
      [ErrorCode.PAYMENT_FAILED]: 402,
      
      [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
      [ErrorCode.CADDY_SERVICE_ERROR]: 502,
      [ErrorCode.PAYMENT_PROVIDER_ERROR]: 502,
      [ErrorCode.DATABASE_ERROR]: 500,
      
      [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
      [ErrorCode.SERVICE_UNAVAILABLE]: 503,
      [ErrorCode.TIMEOUT]: 504,
      [ErrorCode.TOO_MANY_REQUESTS]: 429,
    };

    return statusCodeMap[code] || 500;
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
        ...(this.metadata && { metadata: this.metadata }),
        timestamp: this.timestamp,
        retryable: this.retryable,
      },
      ...(this.cause && { 
        cause: this.cause.message 
      }),
    };
  }
}

// Convenience factory functions for common errors

export class ValidationError extends ApiError {
  constructor(message: string, details?: ErrorDetails[], field?: string) {
    super({
      code: ErrorCode.VALIDATION_ERROR,
      message,
      details: details || (field ? [{ field }] : undefined),
      statusCode: 400,
    });
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    super({
      code: ErrorCode.RESOURCE_NOT_FOUND,
      message,
      statusCode: 404,
      metadata: { resource, identifier },
    });
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, resource?: string, field?: string) {
    super({
      code: ErrorCode.RESOURCE_CONFLICT,
      message,
      statusCode: 409,
      metadata: { resource, field },
    });
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super({
      code: ErrorCode.UNAUTHORIZED,
      message,
      statusCode: 401,
    });
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access denied') {
    super({
      code: ErrorCode.FORBIDDEN,
      message,
      statusCode: 403,
    });
  }
}

export class RateLimitError extends ApiError {
  constructor(limit: number, resetTime: Date, retryAfter?: number) {
    super({
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded',
      statusCode: 429,
      metadata: {
        limit,
        resetTime: resetTime.toISOString(),
        retryAfter,
      },
    });
  }
}

export class QuotaExceededError extends ApiError {
  constructor(used: number, limit: number, resetTime: Date) {
    super({
      code: ErrorCode.QUOTA_EXCEEDED,
      message: `API quota exceeded. Used ${used}/${limit} requests`,
      statusCode: 429,
      metadata: {
        used,
        limit,
        resetTime: resetTime.toISOString(),
      },
    });
  }
}

export class PaymentError extends ApiError {
  constructor(message: string, paymentProvider?: string, providerError?: string) {
    super({
      code: ErrorCode.PAYMENT_FAILED,
      message,
      statusCode: 402,
      metadata: {
        paymentProvider,
        providerError,
      },
      retryable: true,
    });
  }
}

export class ExternalServiceError extends ApiError {
  constructor(service: string, message: string, cause?: Error) {
    super({
      code: ErrorCode.EXTERNAL_SERVICE_ERROR,
      message: `External service error: ${service} - ${message}`,
      statusCode: 502,
      cause,
      metadata: { service },
      retryable: true,
    });
  }
}

// Error type guards
export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}

export function isRetryableError(error: any): boolean {
  if (isApiError(error)) {
    return error.retryable;
  }
  
  // Consider network errors, timeouts, and 5xx errors as retryable
  return error.code === 'ECONNREFUSED' || 
         error.code === 'ENOTFOUND' || 
         error.code === 'ETIMEDOUT' ||
         (error.response?.status >= 500);
}

// Error formatting utilities
export function formatValidationError(zodError: any): ValidationError {
  const details: ErrorDetails[] = zodError.errors?.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message,
    value: err.received,
    constraint: err.code,
  })) || [];

  return new ValidationError(
    'Request validation failed',
    details
  );
}

export function formatDatabaseError(error: any): ApiError {
  // PostgreSQL error codes
  const pgErrorMap: Record<string, { code: ErrorCode; message: string }> = {
    '23505': { 
      code: ErrorCode.RESOURCE_ALREADY_EXISTS, 
      message: 'Resource already exists' 
    },
    '23503': { 
      code: ErrorCode.RESOURCE_CONFLICT, 
      message: 'Foreign key constraint violation' 
    },
    '23514': { 
      code: ErrorCode.VALIDATION_ERROR, 
      message: 'Check constraint violation' 
    },
    '23502': { 
      code: ErrorCode.VALIDATION_ERROR, 
      message: 'Not null violation' 
    },
  };

  const errorInfo = pgErrorMap[error.code] || {
    code: ErrorCode.DATABASE_ERROR,
    message: 'Database operation failed'
  };

  return new ApiError({
    ...errorInfo,
    cause: error,
    metadata: {
      dbCode: error.code,
      dbMessage: error.message,
      table: error.table,
      column: error.column,
    },
  });
}

// Request context for error tracking
export interface ErrorContext {
  requestId?: string;
  userId?: number;
  apiKeyId?: number;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp?: string;
}

export function createErrorWithContext(
  error: ApiErrorOptions | ApiError, 
  context: ErrorContext
): ApiError {
  if (error instanceof ApiError) {
    return new ApiError({
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      cause: error.cause,
      metadata: {
        ...error.metadata,
        context,
      },
      retryable: error.retryable,
      userFriendly: error.userFriendly,
    });
  }

  return new ApiError({
    ...error,
    metadata: {
      ...error.metadata,
      context,
    },
  });
}