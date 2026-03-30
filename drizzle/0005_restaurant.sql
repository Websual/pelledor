CREATE TABLE IF NOT EXISTS "restaurant_tables" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "name" varchar(128) NOT NULL,
  "seats" integer DEFAULT 2 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "restaurant_reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "table_id" uuid NOT NULL REFERENCES "restaurant_tables"("id") ON DELETE CASCADE,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "party_size" integer DEFAULT 2 NOT NULL,
  "client_name" varchar(255) NOT NULL,
  "client_email" varchar(255) NOT NULL,
  "client_phone" varchar(64),
  "status" varchar(32) DEFAULT 'confirmed' NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "restaurant_reservations_table_starts_idx" ON "restaurant_reservations" ("table_id", "starts_at");
