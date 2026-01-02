
require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function enableRLS() {
    const client = await pool.connect();
    try {
        const tables = [
            'users',
            'session',
            'properties',
            'tenants',
            'payments',
            'payment_history',
            'maintenance_requests',
            'expenses'
        ];

        for (const table of tables) {
            console.log(`Enabling RLS on ${table}...`);
            await client.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
        }
        console.log("RLS enabled on all tables.");
    } catch (err) {
        console.error("Error enabling RLS:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

enableRLS();
