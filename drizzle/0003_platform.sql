-- Modules directory + booking + billing + events + blog + notifications + gift_cards + chat
-- Ordre FK : professions -> practitioners -> services, working_hours -> appointments -> ...

CREATE TABLE IF NOT EXISTS "professions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(128) NOT NULL UNIQUE,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "practitioners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid UNIQUE REFERENCES "users"("id") ON DELETE SET NULL,
  "profession_id" uuid REFERENCES "professions"("id") ON DELETE SET NULL,
  "slug" varchar(160) NOT NULL UNIQUE,
  "title" varchar(512) NOT NULL DEFAULT '',
  "bio" text NOT NULL DEFAULT '',
  "city" varchar(128) NOT NULL DEFAULT '',
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_practitioners_profession" ON "practitioners" ("profession_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "duration_min" integer NOT NULL DEFAULT 60,
  "price_cents" integer NOT NULL DEFAULT 0,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "working_hours" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "day_of_week" integer NOT NULL,
  "start_time" varchar(8) NOT NULL,
  "end_time" varchar(8) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
  "starts_at" timestamp with time zone NOT NULL,
  "status" varchar(32) DEFAULT 'PENDING' NOT NULL,
  "payment_status" varchar(32) DEFAULT 'PENDING' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_user" ON "appointments" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_practitioner" ON "appointments" ("practitioner_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_starts" ON "appointments" ("starts_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "appointment_id" uuid REFERENCES "appointments"("id") ON DELETE SET NULL,
  "invoice_number" varchar(64) NOT NULL UNIQUE,
  "amount_cents" integer NOT NULL,
  "total_cents" integer NOT NULL,
  "status" varchar(32) DEFAULT 'draft' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(160) NOT NULL UNIQUE,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "title" varchar(512) NOT NULL,
  "description" text,
  "date" timestamp with time zone NOT NULL,
  "price_cents" integer NOT NULL DEFAULT 0,
  "capacity" integer NOT NULL DEFAULT 20,
  "remaining_places" integer NOT NULL DEFAULT 20,
  "status" varchar(32) DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "quantity" integer DEFAULT 1 NOT NULL,
  "amount_cents" integer,
  "status" varchar(32) DEFAULT 'confirmed' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(64) NOT NULL,
  "title" varchar(512) NOT NULL,
  "message" text NOT NULL,
  "read" boolean DEFAULT false NOT NULL,
  "link" varchar(1024),
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(160) NOT NULL UNIQUE,
  "title" varchar(512) NOT NULL,
  "body" text NOT NULL,
  "published" boolean DEFAULT false NOT NULL,
  "author_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gift_cards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(64) NOT NULL UNIQUE,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "buyer_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "amount_cents" integer NOT NULL,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "appointment_id" uuid NOT NULL REFERENCES "appointments"("id") ON DELETE CASCADE,
  "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointment_messages_appt" ON "appointment_messages" ("appointment_id");
