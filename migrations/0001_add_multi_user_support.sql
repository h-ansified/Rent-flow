-- Migration: Add multi-user support to RentFlow
-- This migration adds email, profile photo, timestamps to users table
-- Creates demo user account and assigns all existing data to it
-- Adds userId to all data tables for multi-user data isolation

-- Step 1: Add new fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Step 2: Update email field constraints (after adding nulls)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Step 3: Create demo user with bcrypt hashed password for "Demo123!"
-- Hash generated with bcrypt, 10 salt rounds: $2b$10$lY4VZ8sN3nqNyG7QBJlBNuQ8K7pYXhO0j7vHXMZbF7oQZ9tQVLqHK
INSERT INTO users (username, email, password, created_at, updated_at)
VALUES ('demo', 'demo@rentflow.app', '$2b$10$lY4VZ8sN3nqNyG7QBJlBNuQ8K7pYXhO0j7vHXMZbF7oQZ9tQVLqHK', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Store demo user ID for later use
DO $$
DECLARE
    demo_user_id VARCHAR;
BEGIN
    SELECT id INTO demo_user_id FROM users WHERE email = 'demo@rentflow.app';

    -- Step 4: Add userId columns to all data tables
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS user_id VARCHAR;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS user_id VARCHAR;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id VARCHAR;
    ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS user_id VARCHAR;

    -- Step 5: Assign all existing data to demo user
    UPDATE properties SET user_id = demo_user_id WHERE user_id IS NULL;
    UPDATE tenants SET user_id = demo_user_id WHERE user_id IS NULL;
    UPDATE payments SET user_id = demo_user_id WHERE user_id IS NULL;
    UPDATE maintenance_requests SET user_id = demo_user_id WHERE user_id IS NULL;

    -- Step 6: Set userId as NOT NULL and add foreign keys
    ALTER TABLE properties ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE properties ADD CONSTRAINT properties_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

    ALTER TABLE tenants ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE tenants ADD CONSTRAINT tenants_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

    ALTER TABLE payments ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE payments ADD CONSTRAINT payments_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

    ALTER TABLE maintenance_requests ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE maintenance_requests ADD CONSTRAINT maintenance_requests_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- Step 7: Create session table for express-session storage
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR PRIMARY KEY,
    sess TEXT NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Create index on session expiration for cleanup
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

-- Migration complete
-- Demo account credentials: demo@rentflow.app / Demo123!
