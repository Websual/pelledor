-- Block Builder : pages personnalisées par établissement

CREATE TABLE IF NOT EXISTS "page_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "page_slug" varchar(128) NOT NULL DEFAULT 'home',
  "blocks" jsonb NOT NULL DEFAULT '[]',
  "published_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE("practitioner_id", "page_slug")
);

-- Index pour requêtes publiques rapides
CREATE INDEX IF NOT EXISTS "page_blocks_practitioner_slug" ON "page_blocks"("practitioner_id", "page_slug");
