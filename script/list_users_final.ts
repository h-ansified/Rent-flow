import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listUsers() {
    try {
        await client.connect();
        const res = await client.query('SELECT id, email, username, role FROM users');
        console.table(res.rows);
    } catch (e) {
        console.error("List users failed:", e);
    } finally {
        await client.end();
    }
}

listUsers();
