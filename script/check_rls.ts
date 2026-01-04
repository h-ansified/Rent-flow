import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkRLS() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public'
        `);
        console.log("RLS STATUS:");
        console.table(res.rows);
    } catch (e) {
        console.error("Failed to check RLS:", e);
    } finally {
        await client.end();
    }
}

checkRLS();
