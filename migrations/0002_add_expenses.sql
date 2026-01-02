-- Migration: Add expenses table for tracking recurring and one-time expenses
-- This migration creates the expenses table for KPLC, water bills, and other property expenses

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id VARCHAR REFERENCES properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    paid_amount REAL NOT NULL DEFAULT 0,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    frequency TEXT,
    due_date TEXT NOT NULL,
    paid_date TEXT,
    expiry_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses (property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses (status);
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON expenses (due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_is_recurring ON expenses (is_recurring);

-- Migration complete
