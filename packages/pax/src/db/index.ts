import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from '../config';

// Create postgres connection
const queryClient = postgres(config.database.url);

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

// Export schema
export * from './schema';
