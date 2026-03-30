-- Phase D : SEO (meta, OG, robots, sitemap côté app)

ALTER TABLE "practitioners" ADD COLUMN IF NOT EXISTS "public_site_url" varchar(2048);
ALTER TABLE "practitioners" ADD COLUMN IF NOT EXISTS "seo_robots_txt" text;

ALTER TABLE "page_blocks" ADD COLUMN IF NOT EXISTS "meta_title" varchar(512);
ALTER TABLE "page_blocks" ADD COLUMN IF NOT EXISTS "meta_description" text;
ALTER TABLE "page_blocks" ADD COLUMN IF NOT EXISTS "canonical_url" varchar(2048);
ALTER TABLE "page_blocks" ADD COLUMN IF NOT EXISTS "og_title" varchar(512);
ALTER TABLE "page_blocks" ADD COLUMN IF NOT EXISTS "og_description" text;
ALTER TABLE "page_blocks" ADD COLUMN IF NOT EXISTS "og_image_url" varchar(2048);
ALTER TABLE "page_blocks" ADD COLUMN IF NOT EXISTS "noindex" boolean DEFAULT false NOT NULL;
ALTER TABLE "page_blocks" ADD COLUMN IF NOT EXISTS "target_keyword" varchar(255);

ALTER TABLE "cms_blog_posts" ADD COLUMN IF NOT EXISTS "meta_title" varchar(512);
ALTER TABLE "cms_blog_posts" ADD COLUMN IF NOT EXISTS "meta_description" text;
ALTER TABLE "cms_blog_posts" ADD COLUMN IF NOT EXISTS "canonical_url" varchar(2048);
ALTER TABLE "cms_blog_posts" ADD COLUMN IF NOT EXISTS "og_title" varchar(512);
ALTER TABLE "cms_blog_posts" ADD COLUMN IF NOT EXISTS "og_description" text;
ALTER TABLE "cms_blog_posts" ADD COLUMN IF NOT EXISTS "og_image_url" varchar(2048);
ALTER TABLE "cms_blog_posts" ADD COLUMN IF NOT EXISTS "noindex" boolean DEFAULT false NOT NULL;
ALTER TABLE "cms_blog_posts" ADD COLUMN IF NOT EXISTS "target_keyword" varchar(255);

ALTER TABLE "cms_portfolio_projects" ADD COLUMN IF NOT EXISTS "meta_title" varchar(512);
ALTER TABLE "cms_portfolio_projects" ADD COLUMN IF NOT EXISTS "meta_description" text;
ALTER TABLE "cms_portfolio_projects" ADD COLUMN IF NOT EXISTS "canonical_url" varchar(2048);
ALTER TABLE "cms_portfolio_projects" ADD COLUMN IF NOT EXISTS "og_title" varchar(512);
ALTER TABLE "cms_portfolio_projects" ADD COLUMN IF NOT EXISTS "og_description" text;
ALTER TABLE "cms_portfolio_projects" ADD COLUMN IF NOT EXISTS "og_image_url" varchar(2048);
ALTER TABLE "cms_portfolio_projects" ADD COLUMN IF NOT EXISTS "noindex" boolean DEFAULT false NOT NULL;
ALTER TABLE "cms_portfolio_projects" ADD COLUMN IF NOT EXISTS "target_keyword" varchar(255);
