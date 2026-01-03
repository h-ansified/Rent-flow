
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Supabase environment variables missing.");
    process.exit(1);
}

console.log(`Connecting to Supabase at ${supabaseUrl}...`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    try {
        // Attempt to fetch general settings or a known public table, or just auth session
        // Since we don't know the schema, we'll try to get the session which checks connectivity
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            console.error("Connection failed:", error.message);
            process.exit(1);
        }

        console.log("Successfully connected to Supabase!");
        console.log("Session Check Result:", data ? "OK" : "No Data");

    } catch (err) {
        console.error("Unexpected error:", err);
        process.exit(1);
    }
}

verify();
