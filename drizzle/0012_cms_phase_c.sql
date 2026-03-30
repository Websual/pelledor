-- Phase C : contenus par établissement (blog, portfolio, menu site)

CREATE TABLE IF NOT EXISTS "cms_blog_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "slug" varchar(160) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "cms_blog_categories_practitioner_slug_unique" UNIQUE("practitioner_id", "slug")
);
CREATE INDEX IF NOT EXISTS "cms_blog_categories_practitioner_idx" ON "cms_blog_categories" ("practitioner_id");

CREATE TABLE IF NOT EXISTS "cms_blog_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "category_id" uuid REFERENCES "cms_blog_categories"("id") ON DELETE SET NULL,
  "slug" varchar(160) NOT NULL,
  "title" varchar(512) NOT NULL,
  "excerpt" text NOT NULL DEFAULT '',
  "body_html" text NOT NULL DEFAULT '',
  "body_document" jsonb,
  "cover_image_url" varchar(2048),
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "cms_blog_posts_practitioner_slug_unique" UNIQUE("practitioner_id", "slug")
);
CREATE INDEX IF NOT EXISTS "cms_blog_posts_practitioner_idx" ON "cms_blog_posts" ("practitioner_id");
CREATE INDEX IF NOT EXISTS "cms_blog_posts_category_idx" ON "cms_blog_posts" ("category_id");

CREATE TABLE IF NOT EXISTS "cms_portfolio_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "slug" varchar(160) NOT NULL,
  "title" varchar(512) NOT NULL,
  "summary" text NOT NULL DEFAULT '',
  "description_html" text NOT NULL DEFAULT '',
  "description_document" jsonb,
  "cover_image_url" varchar(2048),
  "gallery" jsonb NOT NULL DEFAULT '[]',
  "client_name" varchar(255) NOT NULL DEFAULT '',
  "role_label" varchar(255) NOT NULL DEFAULT '',
  "external_url" varchar(2048),
  "sort_order" integer DEFAULT 0 NOT NULL,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "cms_portfolio_projects_practitioner_slug_unique" UNIQUE("practitioner_id", "slug")
);
CREATE INDEX IF NOT EXISTS "cms_portfolio_projects_practitioner_idx" ON "cms_portfolio_projects" ("practitioner_id");

CREATE TABLE IF NOT EXISTS "site_nav_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "label" varchar(255) NOT NULL,
  "link_type" varchar(32) NOT NULL,
  "link_target" varchar(512) NOT NULL DEFAULT '',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "site_nav_items_practitioner_idx" ON "site_nav_items" ("practitioner_id");
