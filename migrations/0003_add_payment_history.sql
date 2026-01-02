CREATE TABLE IF NOT EXISTS "payment_history" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "payment_id" varchar NOT NULL REFERENCES "payments"("id") ON DELETE CASCADE,
  "amount" real NOT NULL,
  "date" text NOT NULL,
  "method" text,
  "reference" text,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
