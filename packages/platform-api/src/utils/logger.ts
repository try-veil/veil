/**
 * Comprehensive logging utility for the Veil API platform
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

export interface LogContext {
  requestId?: string;
  userId?: number;
  apiKeyId?: number;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  duration?: number;
  tags?: string[];
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  format: 'json' | 'text';
  filePath?: string;
  remoteEndpoint?: string;
  remoteApiKey?: string;
}

class Logger {
  private config: LoggerConfig;
  private defaultContext: LogContext = {};

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableRemote: false,
      format: 'json',
      ...config,
    };
  }

  setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  clearDefaultContext(): void {
    this.defaultContext = {};
  }

  error(message: string, error?: Error, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, metadata, error);
  }

  warn(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  info(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  debug(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  trace(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, context, metadata);
  }

  // Structured logging methods
  logApiRequest(request: {
    method: string;
    url: string;
    userAgent?: string;
    ipAddress?: string;
    requestId: string;
    userId?: number;
    apiKeyId?: number;
    body?: any;
    query?: any;
    headers?: Record<string, string>;
  }): void {
    this.info('API Request', {
      requestId: request.requestId,
      userId: request.userId,
      apiKeyId: request.apiKeyId,
      endpoint: request.url,
      method: request.method,
      userAgent: request.userAgent,
      ipAddress: request.ipAddress,
    }, {
      type: 'api_request',
      body: request.body,
      query: request.query,
      headers: this.sanitizeHeaders(request.headers),
    });
  }

  logApiResponse(response: {
    requestId: string;
    statusCode: number;
    duration: number;
    responseSize?: number;
    userId?: number;
    apiKeyId?: number;
  }): void {
    const level = response.statusCode >= 500 ? LogLevel.ERROR :
                  response.statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, 'API Response', {
      requestId: response.requestId,
      userId: response.userId,
      apiKeyId: response.apiKeyId,
    }, {
      type: 'api_response',
      statusCode: response.statusCode,
      responseSize: response.responseSize,
    }, undefined, response.duration);
  }

  logDatabaseOperation(operation: {
    type: 'select' | 'insert' | 'update' | 'delete';
    table: string;
    duration: number;
    rowsAffected?: number;
    requestId?: string;
    query?: string;
  }): void {
    this.debug('Database Operation', {
      requestId: operation.requestId,
    }, {
      type: 'database_operation',
      operation: operation.type,
      table: operation.table,
      rowsAffected: operation.rowsAffected,
      query: operation.query ? this.sanitizeQuery(operation.query) : undefined,
    }, undefined, operation.duration);
  }

  logExternalServiceCall(service: {
    name: string;
    method: string;
    url: string;
    duration: number;
    statusCode?: number;
    requestId?: string;
    success: boolean;
    error?: Error;
  }): void {
    const level = service.success ? LogLevel.INFO : LogLevel.ERROR;
    
    this.log(level, `External Service: ${service.name}`, {
      requestId: service.requestId,
    }, {
      type: 'external_service_call',
      service: service.name,
      method: service.method,
      url: service.url,
      statusCode: service.statusCode,
      success: service.success,
    }, service.error, service.duration);
  }

  logSecurityEvent(event: {
    type: 'authentication_failed' | 'authorization_failed' | 'rate_limit_exceeded' | 'suspicious_activity';
    message: string;
    userId?: number;
    apiKeyId?: number;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    metadata?: Record<string, any>;
  }): void {
    this.warn(`Security Event: ${event.type}`, {
      requestId: event.requestId,
      userId: event.userId,
      apiKeyId: event.apiKeyId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    }, {
      type: 'security_event',
      eventType: event.type,
      details: event.message,
      ...event.metadata,
    });
  }

  logPerformanceMetric(metric: {
    name: string;
    value: number;
    unit: 'ms' | 'bytes' | 'count' | 'percentage';
    requestId?: string;
    endpoint?: string;
    metadata?: Record<string, any>;
  }): void {
    this.info('Performance Metric', {
      requestId: metric.requestId,
      endpoint: metric.endpoint,
    }, {
      type: 'performance_metric',
      metric: metric.name,
      value: metric.value,
      unit: metric.unit,
      ...metric.metadata,
    });
  }

  logBusinessEvent(event: {
    type: string;
    message: string;
    userId?: number;
    entityType?: string;
    entityId?: string | number;
    requestId?: string;
    metadata?: Record<string, any>;
  }): void {
    this.info(`Business Event: ${event.type}`, {
      requestId: event.requestId,
      userId: event.userId,
    }, {
      type: 'business_event',
      eventType: event.type,
      entityType: event.entityType,
      entityId: event.entityId,
      details: event.message,
      ...event.metadata,
    });
  }

  // Performance timing utilities
  startTimer(label: string, context?: LogContext): () => void {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      this.logPerformanceMetric({
        name: label,
        value: duration,
        unit: 'ms',
        requestId: context?.requestId,
        endpoint: context?.endpoint,
      });
    };
  }

  async timeAsync<T>(
    label: string,
    asyncFn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const endTimer = this.startTimer(label, context);
    try {
      const result = await asyncFn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  // Child logger with additional context
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.config);
    childLogger.setDefaultContext({
      ...this.defaultContext,
      ...additionalContext,
    });
    return childLogger;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
    error?: Error,
    duration?: number
  ): void {
    if (level > this.config.level) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.defaultContext, ...context },
      metadata,
      duration,
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    // Output to different targets
    if (this.config.enableConsole) {
      this.outputToConsole(logEntry);
    }

    if (this.config.enableFile && this.config.filePath) {
      this.outputToFile(logEntry);
    }

    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.outputToRemote(logEntry);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
    const levelName = levelNames[entry.level];
    
    if (this.config.format === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      const timestamp = entry.timestamp.split('T')[1].split('.')[0];
      const context = entry.context?.requestId ? `[${entry.context.requestId}] ` : '';
      const duration = entry.duration ? ` (${entry.duration}ms)` : '';
      
      console.log(`${timestamp} ${levelName} ${context}${entry.message}${duration}`);
      
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        console.log('  Metadata:', JSON.stringify(entry.metadata, null, 2));
      }
      
      if (entry.error) {
        console.error('  Error:', entry.error.message);
        if (entry.error.stack) {
          console.error('  Stack:', entry.error.stack);
        }
      }
    }
  }

  private outputToFile(entry: LogEntry): void {
    // In a real implementation, this would write to a file
    // For now, we'll just implement the structure
    const logLine = JSON.stringify(entry) + '\n';
    
    // Write to file (pseudo-code)
    // fs.appendFile(this.config.filePath!, logLine, (err) => {
    //   if (err) console.error('Failed to write log to file:', err);
    // });
  }

  private outputToRemote(entry: LogEntry): void {
    // In a real implementation, this would send to a remote logging service
    // For now, we'll just implement the structure
    
    // Send to remote service (pseudo-code)
    // fetch(this.config.remoteEndpoint!, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${this.config.remoteApiKey}`,
    //   },
    //   body: JSON.stringify(entry),
    // }).catch(err => {
    //   console.error('Failed to send log to remote service:', err);
    // });
  }

  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
    if (!headers) return {};
    
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'x-auth-token'];
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data from SQL queries
    return query
      .replace(/('.*?')/g, "'[REDACTED]'")
      .replace(/(\$\d+)/g, '$[PARAM]');
  }
}

// Global logger instance
export const logger = new Logger({
  level: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : LogLevel.INFO,
  enableConsole: true,
  enableFile: process.env.LOG_FILE_PATH ? true : false,
  enableRemote: process.env.LOG_REMOTE_ENDPOINT ? true : false,
  format: (process.env.LOG_FORMAT as 'json' | 'text') || 'json',
  filePath: process.env.LOG_FILE_PATH,
  remoteEndpoint: process.env.LOG_REMOTE_ENDPOINT,
  remoteApiKey: process.env.LOG_REMOTE_API_KEY,
});

// Convenience functions
export function createRequestLogger(requestId: string, userId?: number): Logger {
  return logger.child({ requestId, userId });
}

export function logApiCall(
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  context: LogContext = {}
): void {
  logger.logApiResponse({
    requestId: context.requestId || 'unknown',
    statusCode,
    duration,
    userId: context.userId,
    apiKeyId: context.apiKeyId,
  });
}

export function logError(
  message: string,
  error: Error,
  context: LogContext = {}
): void {
  logger.error(message, error, context);
}

export function logSecurityIncident(
  type: 'authentication_failed' | 'authorization_failed' | 'rate_limit_exceeded' | 'suspicious_activity',
  message: string,
  context: LogContext = {}
): void {
  logger.logSecurityEvent({
    type,
    message,
    userId: context.userId,
    apiKeyId: context.apiKeyId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId,
  });
}