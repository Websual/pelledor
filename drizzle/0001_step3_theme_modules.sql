CREATE TABLE IF NOT EXISTS "theme_tokens" (
	"id" varchar(32) PRIMARY KEY DEFAULT 'default' NOT NULL,
	"payload" jsonb NOT NULL DEFAULT '{}',
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
INSERT INTO "theme_tokens" ("id", "payload") VALUES ('default', '{}')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_toggles" (
	"slug" varchar(64) PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
