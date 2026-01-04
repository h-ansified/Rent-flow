import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkData() {
    const userId = '66e85397-70a1-4232-bf0d-7f48623d1968';
    try {
        await client.connect();

        console.log("Checking data for user:", userId);

        const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        console.log("User found:", userRes.rows.length > 0 ? "YES" : "NO");
        if (userRes.rows.length > 0) console.log("User details:", JSON.stringify(userRes.rows[0]));

        const propRes = await client.query('SELECT name, user_id FROM properties WHERE user_id = $1', [userId]);
        console.log("Properties found:", propRes.rows.length);
        console.table(propRes.rows);

        const tenantRes = await client.query('SELECT first_name, last_name, user_id FROM tenants WHERE user_id = $1', [userId]);
        console.log("Tenants found:", tenantRes.rows.length);

    } catch (e) {
        console.error("Check failed:", e);
    } finally {
        await client.end();
    }
}

checkData();
