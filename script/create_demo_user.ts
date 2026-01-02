import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function createDemoUser() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    // We need SERVICE_ROLE key for admin actions like deleting users or forcing signup
    // But we likely only have ANON key in .env? 
    // If we only have ANON key, we can sign up normally.
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase env vars");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const email = "demo@rentflow.app";
    const password = "Demo123!";
    const username = "demo_user";

    console.log(`Creating demo user: ${email}`);

    // Try to sign up
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username,
                firstName: "Demo",
                lastName: "User",
            }
        }
    });

    if (error) {
        console.error("Error creating demo user:", error.message);
        // If user already exists, that's fine for us.
    } else {
        console.log("Demo user created!", data.user?.id);
    }
}

createDemoUser();
