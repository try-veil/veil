import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { config } from "./config";
import { errorHandler } from "./middleware/error-handler";
import { logger } from "./middleware/logger";

// Import routes
import { authRoutes } from "./routes/auth";
import { marketplaceRoutes } from "./routes/marketplace";
import { sellerRoutes } from "./routes/seller";
import { apiKeyRoutes } from "./routes/api-keys";
import { profileRoutes } from "./routes/profile";
import { adminRoutes } from "./routes/admin";

const app = new Elysia()
  // Add middleware
  .use(cors(config.cors))
  .use(swagger({
    documentation: {
      info: {
        title: 'Veil SaaS Platform BFF API',
        version: '1.0.0',
        description: 'Backend for Frontend API for the Veil SaaS platform providing user authentication, API marketplace, and key management.',
      },
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Marketplace', description: 'API marketplace endpoints' },
        { name: 'Seller', description: 'Seller dashboard endpoints' },
        { name: 'API Keys', description: 'API key management endpoints' },
        { name: 'Profile', description: 'User profile endpoints' },
        { name: 'Admin', description: 'Admin panel endpoints' },
      ],
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server'
        }
      ]
    }
  }))
  .use(logger)
  .use(errorHandler)
  
  // Health check endpoint
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  }))
  
  // Root endpoint
  .get("/", () => ({
    message: "Veil SaaS Platform BFF API",
    version: "1.0.0",
    documentation: "/swagger",
  }))
  
  // API routes
  .group("/api/v1", (app) =>
    app
      .use(authRoutes)
      .use(marketplaceRoutes)
      .use(sellerRoutes)
      .use(apiKeyRoutes)
      .use(profileRoutes)
      .use(adminRoutes)
  )
  
  // 404 handler
  .all("*", ({ set }) => {
    set.status = 404;
    return {
      success: false,
      message: "Route not found",
    };
  })
  
  .listen(config.port);

console.log(
  `🚀 Veil SaaS BFF Server is running at http://${app.server?.hostname}:${app.server?.port}`
);

console.log(`📊 Environment: ${config.nodeEnv}`);
console.log(`🔗 Database URL: ${config.database.url.replace(/:[^:]*@/, ':****@')}`);
console.log(`🔒 CORS Origin: ${config.cors.origin}`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  app.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  app.stop();
  process.exit(0);
});
