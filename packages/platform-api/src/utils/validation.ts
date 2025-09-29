import { z } from 'zod';
import { ValidationError, ErrorCode } from './errors';

/**
 * Common validation schemas and utilities
 */

// Base validation schemas
export const baseSchemas = {
  // String validations
  nonEmptyString: z.string().min(1, 'This field is required'),
  email: z.string().email('Invalid email format'),
  url: z.string().url('Invalid URL format'),
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Numeric validations
  positiveInt: z.number().int().positive('Must be a positive integer'),
  nonNegativeInt: z.number().int().min(0, 'Must be a non-negative integer'),
  positiveNumber: z.number().positive('Must be a positive number'),
  
  // Date validations
  dateString: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
  futureDate: z.string().refine(
    (date) => new Date(date) > new Date(),
    'Date must be in the future'
  ),
  
  // Common field patterns
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid version format (use semantic versioning)'),
  apiKeyFormat: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid API key format'),
  
  // Pagination
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),
};

// Enhanced validation schemas
export const enhancedSchemas = {
  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  
  // Phone number validation (international format)
  phoneNumber: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Invalid international phone number format (+1234567890)'),
  
  // Currency validation
  currency: z.string()
    .length(3, 'Currency code must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters only'),
  
  // Price validation (up to 2 decimal places)
  price: z.number()
    .positive('Price must be positive')
    .multipleOf(0.01, 'Price cannot have more than 2 decimal places'),
  
  // API endpoint validation
  apiEndpoint: z.string()
    .min(1, 'Endpoint is required')
    .regex(/^\//, 'Endpoint must start with /')
    .max(500, 'Endpoint path too long'),
  
  // HTTP method validation
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']),
  
  // JSON validation
  jsonString: z.string().refine((str) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid JSON format'),
  
  // File upload validation
  fileUpload: z.object({
    filename: z.string().min(1, 'Filename is required'),
    mimeType: z.string().min(1, 'MIME type is required'),
    size: z.number().positive().max(10 * 1024 * 1024, 'File size cannot exceed 10MB'),
  }),
};

// Conditional validation helpers
export const conditionalValidation = {
  // Required if another field has a specific value
  requiredIf: <T>(condition: (data: any) => boolean, schema: z.ZodType<T>) =>
    z.any().superRefine((data, ctx) => {
      if (condition(data)) {
        const result = schema.safeParse(data);
        if (!result.success) {
          result.error.issues.forEach(issue => ctx.addIssue(issue));
        }
      }
    }),
  
  // Mutual exclusivity - only one of the specified fields should be present
  mutuallyExclusive: (fields: string[]) =>
    z.any().superRefine((data, ctx) => {
      const presentFields = fields.filter(field => data[field] != null);
      if (presentFields.length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Only one of these fields can be present: ${presentFields.join(', ')}`,
        });
      }
    }),
  
  // At least one required - at least one of the specified fields must be present
  atLeastOneRequired: (fields: string[]) =>
    z.any().superRefine((data, ctx) => {
      const presentFields = fields.filter(field => data[field] != null);
      if (presentFields.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `At least one of these fields is required: ${fields.join(', ')}`,
        });
      }
    }),
};

// Business logic validation helpers
export const businessValidation = {
  // API key validation with checksum
  apiKey: z.string().refine(
    (key) => {
      // Simple checksum validation (in real implementation, use proper algorithm)
      if (key.length < 32) return false;
      const checksum = key.slice(-4);
      const content = key.slice(0, -4);
      // Simplified checksum - in production, use proper cryptographic checksum
      const expectedChecksum = content.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 10000;
      return checksum === expectedChecksum.toString().padStart(4, '0');
    },
    'Invalid API key format or checksum'
  ),
  
  // Subscription tier validation
  subscriptionTier: z.enum(['free', 'starter', 'professional', 'enterprise']),
  
  // Rate limit configuration validation
  rateLimit: z.object({
    requests: z.number().int().positive('Requests must be positive'),
    window: z.number().int().positive('Window must be positive'),
    burst: z.number().int().positive().optional(),
  }).refine(
    (data) => !data.burst || data.burst >= data.requests,
    'Burst limit cannot be less than regular limit'
  ),
  
  // Pricing model validation
  pricingModel: z.enum(['free', 'per_request', 'monthly', 'tiered']),
  
  // API category validation
  apiCategory: z.string().min(1).max(50).regex(
    /^[a-zA-Z0-9\s\-_]+$/,
    'Category can only contain letters, numbers, spaces, hyphens, and underscores'
  ),
};

// Validation middleware factory
export function createValidationMiddleware<T>(
  schema: z.ZodType<T>,
  options: {
    source?: 'body' | 'query' | 'params';
    stripUnknown?: boolean;
    allowPartial?: boolean;
  } = {}
) {
  const { source = 'body', stripUnknown = true, allowPartial = false } = options;
  
  return (data: any) => {
    try {
      let validationSchema = schema;
      
      if (allowPartial) {
        validationSchema = schema.partial() as z.ZodType<T>;
      }
      
      const result = validationSchema.parse(data);
      
      if (stripUnknown && typeof result === 'object' && result !== null) {
        // Remove unknown properties
        const knownKeys = Object.keys(schema.shape || {});
        const cleaned = Object.fromEntries(
          Object.entries(result).filter(([key]) => knownKeys.includes(key))
        );
        return cleaned as T;
      }
      
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          `${source.charAt(0).toUpperCase() + source.slice(1)} validation failed`,
          error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            value: issue.received,
            constraint: issue.code,
          }))
        );
      }
      throw error;
    }
  };
}

// Sanitization utilities
export const sanitization = {
  // HTML sanitization (basic)
  html: (input: string): string => {
    return input
      .replace(/[<>]/g, '')
      .trim();
  },
  
  // SQL injection prevention (basic escaping)
  sql: (input: string): string => {
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  },
  
  // Normalize whitespace
  normalizeWhitespace: (input: string): string => {
    return input
      .replace(/\s+/g, ' ')
      .trim();
  },
  
  // Remove special characters (keep alphanumeric and basic punctuation)
  alphanumeric: (input: string): string => {
    return input.replace(/[^a-zA-Z0-9\s\-_.]/g, '');
  },
  
  // Normalize email
  email: (input: string): string => {
    return input.toLowerCase().trim();
  },
  
  // Normalize URL
  url: (input: string): string => {
    let url = input.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url;
  },
};

// Validation result helpers
export function createValidationError(
  message: string,
  field?: string,
  value?: any
): ValidationError {
  return new ValidationError(message, field ? [{ field, value }] : undefined);
}

export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string
): T {
  if (value === null || value === undefined || value === '') {
    throw createValidationError(`${fieldName} is required`, fieldName, value);
  }
  return value;
}

export function validateEnum<T extends string>(
  value: string,
  allowedValues: readonly T[],
  fieldName: string
): T {
  if (!allowedValues.includes(value as T)) {
    throw createValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName,
      value
    );
  }
  return value as T;
}

export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): number {
  if (value < min || value > max) {
    throw createValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      fieldName,
      value
    );
  }
  return value;
}

export function validateLength(
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string
): string {
  if (value.length < minLength || value.length > maxLength) {
    throw createValidationError(
      `${fieldName} must be between ${minLength} and ${maxLength} characters`,
      fieldName,
      value
    );
  }
  return value;
}

// Validation decorators for service methods
export function validate<T>(schema: z.ZodType<T>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      // Validate the first argument (usually the input data)
      if (args.length > 0) {
        try {
          args[0] = schema.parse(args[0]);
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new ValidationError(
              `Invalid input for ${propertyKey}`,
              error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message,
                value: issue.received,
                constraint: issue.code,
              }))
            );
          }
          throw error;
        }
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}