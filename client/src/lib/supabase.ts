
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = `Missing Supabase environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.`;
    console.error(errorMsg);
    // Throw a more descriptive error that will be caught by the error handler
    throw new Error(errorMsg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
