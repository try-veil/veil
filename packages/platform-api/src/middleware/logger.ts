import { Elysia } from 'elysia';
import { config } from '../config';

export const logger = new Elysia()
  .onRequest(({ request }) => {
    const method = request.method;
    const url = new URL(request.url).pathname;
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    if (config.isDevelopment) {
      console.log(`[${new Date().toISOString()}] ${method} ${url} - ${userAgent}`);
    }
  })
  .onAfterResponse(({ request, set }) => {
    const method = request.method;
    const url = new URL(request.url).pathname;
    const status = set.status || 200;
    
    const logLevel = status >= 400 ? 'ERROR' : 'INFO';
    const statusColor = status >= 400 ? '\x1b[31m' : status >= 300 ? '\x1b[33m' : '\x1b[32m';
    const resetColor = '\x1b[0m';
    
    if (config.isDevelopment) {
      console.log(
        `[${new Date().toISOString()}] [${logLevel}] ${method} ${url} - ${statusColor}${status}${resetColor}`
      );
    } else {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: logLevel,
          method,
          url,
          status,
        })
      );
    }
  });