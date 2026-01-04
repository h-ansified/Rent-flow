import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    const errorMsg = "DATABASE_URL environment variable is required. Please set it in your .env file or environment. For Supabase, use the connection string from your project settings (Settings > Database > Connection string).";
    console.error("CRITICAL:", errorMsg);
    throw new Error(errorMsg);
}

// Create PostgreSQL connection pool with error handling
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Add connection timeout and retry settings
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
});

// Test connection on startup
pool.query('SELECT NOW()').catch((err) => {
    console.error('Database connection test failed:', err);
    console.error('Please check your DATABASE_URL environment variable.');
});

// Create Drizzle ORM instance with schema
export const db = drizzle(pool, { schema });

// Export pool for session store
export { pool };
