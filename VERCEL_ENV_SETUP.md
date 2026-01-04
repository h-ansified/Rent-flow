# Vercel Environment Variables Setup

This guide will help you configure the required environment variables in Vercel to fix the 500 errors and startup issues.

## Required Environment Variables

You need to set the following environment variables in your Vercel project:

### 1. Database Connection (DATABASE_URL)

**Where to find it:**
1. Go to your Supabase Dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Under **Connection string**, select **Transaction Pooler** (recommended for serverless)
5. Copy the connection string (it looks like: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`)
6. Replace `[password]` with your actual database password

**In Vercel:**
- Variable name: `DATABASE_URL`
- Value: The connection string from Supabase

### 2. Supabase Project URL (VITE_SUPABASE_URL)

**Where to find it:**
1. Go to your Supabase Dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** (it looks like: `https://[project-ref].supabase.co`)

**In Vercel:**
- Variable name: `VITE_SUPABASE_URL`
- Value: The Project URL from Supabase

### 3. Supabase Anon Key (VITE_SUPABASE_ANON_KEY)

**Where to find it:**
1. Go to your Supabase Dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Under **Project API keys**, copy the **anon/public** key

**In Vercel:**
- Variable name: `VITE_SUPABASE_ANON_KEY`
- Value: The anon/public key from Supabase

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click on **Settings**
3. Click on **Environment Variables** in the left sidebar
4. Add each variable:
   - Enter the variable name (e.g., `DATABASE_URL`)
   - Enter the variable value
   - Select the environments where it should be available (Production, Preview, Development)
   - Click **Save**
5. Repeat for all three variables

## After Setting Variables

1. **Redeploy your application** in Vercel:
   - Go to the **Deployments** tab
   - Click the three dots (⋯) on the latest deployment
   - Select **Redeploy**

2. **Verify the setup:**
   - Check the Vercel deployment logs for any errors
   - The logs should show "Environment variables validated successfully" if everything is correct

## Troubleshooting

### If you still get 500 errors:

1. **Check Vercel logs:**
   - Go to your deployment in Vercel
   - Click on the deployment
   - Check the **Logs** tab for detailed error messages
   - The improved error logging will now show the actual error details

2. **Verify database connection:**
   - Make sure your Supabase database is running
   - Verify the password in the connection string is correct
   - Check if your Supabase project has any restrictions or IP allowlists

3. **Verify Supabase credentials:**
   - Make sure the Project URL and Anon Key are correct
   - The Anon Key should be the `anon/public` key, not the `service_role` key

4. **Check for typos:**
   - Variable names are case-sensitive
   - Make sure there are no extra spaces in the values

## Additional Notes

- The `VITE_` prefix is required for client-side environment variables in Vite
- Server-side code can access these variables via `process.env.VITE_SUPABASE_URL` or `process.env.SUPABASE_URL`
- After setting environment variables, you must redeploy for changes to take effect

