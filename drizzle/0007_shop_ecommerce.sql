CREATE TABLE IF NOT EXISTS "product_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(160) NOT NULL UNIQUE,
  "description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(512) NOT NULL,
  "slug" varchar(160) NOT NULL UNIQUE,
  "description" text,
  "price_cents" integer DEFAULT 0 NOT NULL,
  "image_url" varchar(2048),
  "stock" integer,
  "published" boolean DEFAULT false NOT NULL,
  "weight_g" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_category_links" (
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "category_id" uuid NOT NULL REFERENCES "product_categories"("id") ON DELETE CASCADE,
  PRIMARY KEY ("product_id", "category_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cart_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" varchar(255) NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "quantity" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cart_items_session_idx" ON "cart_items" ("session_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_number" varchar(64) NOT NULL UNIQUE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "email" varchar(255) NOT NULL,
  "billing_name" varchar(255) NOT NULL,
  "billing_address" text,
  "billing_city" varchar(128),
  "billing_postal_code" varchar(20),
  "billing_country" varchar(2) DEFAULT 'FR' NOT NULL,
  "shipping_name" varchar(255),
  "shipping_address" text,
  "shipping_city" varchar(128),
  "shipping_postal_code" varchar(20),
  "shipping_country" varchar(2),
  "subtotal_cents" integer NOT NULL,
  "shipping_cents" integer DEFAULT 0 NOT NULL,
  "total_cents" integer NOT NULL,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "stripe_payment_intent_id" varchar(255),
  "stripe_checkout_session_id" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL,
  "product_name" varchar(512) NOT NULL,
  "quantity" integer NOT NULL,
  "price_cents" integer NOT NULL,
  "total_cents" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shipping_zones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(128) NOT NULL,
  "country_codes" varchar(512) DEFAULT 'FR' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shipping_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "zone_id" uuid NOT NULL REFERENCES "shipping_zones"("id") ON DELETE CASCADE,
  "min_order_cents" integer DEFAULT 0 NOT NULL,
  "max_order_cents" integer,
  "price_cents" integer DEFAULT 0 NOT NULL,
  "free_shipping_over_cents" integer,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
