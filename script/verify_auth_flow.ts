
import { createClient } from "@supabase/supabase-js";
import pg from 'pg';
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const databaseUrl = process.env.DATABASE_URL!;

if (!supabaseUrl || !supabaseKey || !databaseUrl) {
    console.error("Missing environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const { Client } = pg;

async function verifyAuthFlow() {
    const testEmail = `testuser_${Date.now()}@rentflow-test.com`;
    const testPassword = "Password123!";
    const testRole = "landlord";

    console.log(`Testing signup for ${testEmail} with role ${testRole}...`);

    // 1. Sign Up
    const { data: { user }, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
            data: {
                role: testRole,
                username: "testuser_" + Date.now()
            }
        }
    });

    if (error) {
        console.error("Signup failed:", error.message);
        process.exit(1);
    }

    if (!user) {
        console.error("Signup succeeded but no user returned (confirmation email sent?)");
        // Even if confirmation is required, the user record MIGHT be created in auth.users, 
        // and the trigger SHOULD fire.
    } else {
        console.log("Signup successful. User ID:", user.id);
    }

    // 2. Check Database
    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();

        // Give a moment for trigger to fire
        await new Promise(r => setTimeout(r, 2000));

        console.log("Checking local 'users' table...");
        const res = await client.query("SELECT * FROM users WHERE email = $1", [testEmail]);

        if (res.rows.length === 0) {
            console.error("FAIL: User not found in local 'users' table. Trigger might have failed.");
            process.exit(1);
        }

        const localUser = res.rows[0];
        console.log("Found local user:", localUser);

        if (localUser.role === testRole) {
            console.log("SUCCESS: Role matches!");
        } else {
            console.error(`FAIL: Role mismatch. Expected ${testRole}, got ${localUser.role}`);
            process.exit(1);
        }

    } catch (err) {
        console.error("Database check failed:", err);
        process.exit(1);
    } finally {
        // Cleanup if possible (optional, maybe leave for manual inspection or hard delete)
        // Deleting from auth.users (Supabase) via client is not possible with anon key usually.
        // Deleting from local users table:
        if (user) {
            // await client.query("DELETE FROM users WHERE email = $1", [testEmail]); 
            // Note: Cascade delete might handle it if we could delete from auth.users
            console.log("Note: Test user remains in database. Email:", testEmail);
        }
        await client.end();
    }
}

verifyAuthFlow();
