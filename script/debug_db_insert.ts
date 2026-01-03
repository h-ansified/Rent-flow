
import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { Client } = pg;

async function debugInsert() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log("Connected to database.");

        const testEmail = `debug_${Date.now()}@test.com`;
        const testId = "123e4567-e89b-12d3-a456-426614174000"; // Valid UUID
        const testUsername = "debuguser_" + Date.now();
        const testRole = "tenant";

        console.log(`Attempting insert: ${testEmail}, ${testId}, ${testUsername}, ${testRole}`);

        const res = await client.query(
            "INSERT INTO users (id, email, username, role) VALUES ($1, $2, $3, $4) RETURNING *",
            [testId, testEmail, testUsername, testRole]
        );

        console.log("Insert successful:", res.rows[0]);

        // Cleanup
        await client.query("DELETE FROM users WHERE id = $1", [testId]);

    } catch (err) {
        console.error("Insert failed:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

debugInsert();
