export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/veil_platform',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  cors: {
    origin: 'http://localhost:3001',
    credentials: true,
  },
  
  caddy: {
    managementUrl: process.env.CADDY_MANAGEMENT_URL || 'http://localhost:2020',
    gatewayUrl: process.env.CADDY_GATEWAY_URL || 'http://localhost:2021',
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  payment: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    },
  },
  
  email: {
    provider: process.env.EMAIL_PROVIDER || 'console', // 'console', 'sendgrid', 'smtp'
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || '',
    },
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
    },
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  fusionAuth: {
    serverUrl: process.env.FUSIONAUTH_SERVER_URL || 'http://localhost:9011',
    apiKey: process.env.FUSIONAUTH_API_KEY || 'fusionauth-kickstart-api-key',
    applicationId: process.env.FUSIONAUTH_APPLICATION_ID || '12345678-1234-1234-1234-123456789012',
    clientId: process.env.FUSIONAUTH_CLIENT_ID || '12345678-1234-1234-1234-123456789012',
    clientSecret: process.env.FUSIONAUTH_CLIENT_SECRET || '5ufLk_CtysYmhQn76NlmZkzVY0Q1XPWVGMgEmNDcWtE',
    tenantId: process.env.FUSIONAUTH_TENANT_ID || '9f255291-7f43-4721-995a-e7c622384755',
    redirectUri: process.env.FUSIONAUTH_REDIRECT_URI || 'http://localhost:3001/auth/callback',
  },
};