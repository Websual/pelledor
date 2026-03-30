-- Signature électronique devis (upgrade quote_requests)

ALTER TABLE "quote_requests"
  ADD COLUMN IF NOT EXISTS "public_token" varchar(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS "signed_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "signature_data" text;

-- Générer un token pour les devis existants sans token
UPDATE "quote_requests" SET "public_token" = gen_random_uuid()::varchar WHERE "public_token" IS NULL;
