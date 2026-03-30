-- Module: anamnese (formulaire patient pré-consultation)

CREATE TABLE IF NOT EXISTS "anamnese_forms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "practitioner_id" uuid NOT NULL REFERENCES "practitioners"("id") ON DELETE CASCADE,
  "title" varchar(512) NOT NULL,
  "fields" jsonb NOT NULL DEFAULT '[]',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "anamnese_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "form_id" uuid NOT NULL REFERENCES "anamnese_forms"("id") ON DELETE CASCADE,
  "appointment_id" uuid REFERENCES "appointments"("id") ON DELETE SET NULL,
  "patient_name" varchar(255) NOT NULL,
  "patient_email" varchar(255) NOT NULL,
  "answers" jsonb NOT NULL DEFAULT '{}',
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
