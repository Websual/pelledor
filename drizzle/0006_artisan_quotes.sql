CREATE TABLE IF NOT EXISTS "quote_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "client_name" varchar(255) NOT NULL,
  "client_email" varchar(255) NOT NULL,
  "client_phone" varchar(64),
  "address" text,
  "description" text DEFAULT '' NOT NULL,
  "status" varchar(32) DEFAULT 'new' NOT NULL,
  "converted_invoice_id" uuid REFERENCES "invoices"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_requests_practitioner_status_idx" ON "quote_requests" ("practitioner_id", "status");
