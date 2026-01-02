import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    try {
        const sqlPath = path.join(__dirname, "setup_auth.sql");
        const sqlContent = fs.readFileSync(sqlPath, "utf-8");

        console.log("Applying auth triggers...");

        // Split by semicolon to run statements individually if needed, 
        // but Drizzle/Postgres usually handles blocks. 
        // Let's try executing the whole block.
        await db.execute(sql.raw(sqlContent));

        console.log("Successfully applied auth triggers!");
        process.exit(0);
    } catch (error) {
        console.error("Failed to apply auth triggers:", error);
        process.exit(1);
    }
}

main();
