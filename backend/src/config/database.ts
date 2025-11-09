import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../models';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create postgres client
const client = postgres(connectionString, {
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Idle timeout in seconds
  connect_timeout: 10, // Connect timeout in seconds
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export for potential direct usage
export { client };

export default db;