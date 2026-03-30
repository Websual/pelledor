-- Hébergement : chambres + réservations par nuit (blueprint gîte / hôtel)
CREATE TABLE IF NOT EXISTS "rooms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "slug" varchar(160) NOT NULL,
  "title" varchar(512) NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "capacity" integer DEFAULT 2 NOT NULL,
  "price_cents_night" integer DEFAULT 0 NOT NULL,
  "image_url" varchar(2048),
  "published" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE("practitioner_id", "slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "room_bookings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "guest_email" varchar(255) NOT NULL,
  "guest_name" varchar(255) DEFAULT '' NOT NULL,
  "check_in" varchar(10) NOT NULL,
  "check_out" varchar(10) NOT NULL,
  "nights" integer NOT NULL,
  "total_cents" integer NOT NULL,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "stripe_checkout_session_id" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "room_bookings_room_id_idx" ON "room_bookings" ("room_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "room_bookings_status_idx" ON "room_bookings" ("status");
