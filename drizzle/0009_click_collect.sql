-- Module: click-collect (commande à emporter)

CREATE TABLE IF NOT EXISTS "cc_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "restaurant_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "name" varchar(512) NOT NULL,
  "description" text,
  "price_cents" integer NOT NULL DEFAULT 0,
  "available" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "cc_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "restaurant_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "client_name" varchar(255) NOT NULL,
  "client_email" varchar(255) NOT NULL,
  "client_phone" varchar(64),
  "items" jsonb NOT NULL DEFAULT '[]',
  "total_cents" integer NOT NULL DEFAULT 0,
  "pickup_slot" timestamp with time zone NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'pending',
  "stripe_session_id" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
