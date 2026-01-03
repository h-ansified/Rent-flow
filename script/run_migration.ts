
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { Client } = pg;

async function runMigration() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }, // Required for Supabase transaction pooler sometimes
    });

    try {
        await client.connect();
        console.log("Connected to database.");

        const sqlPath = path.resolve(process.cwd(), "migrations", "supabase_setup.sql");
        const sql = fs.readFileSync(sqlPath, "utf-8");

        console.log("Executing migration...");
        await client.query(sql);
        console.log("Migration executed successfully!");

    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
