
-- Add unit_name text column
ALTER TABLE public.energisa_service_records ADD COLUMN unit_name text NOT NULL DEFAULT '';

-- Drop the foreign key constraint to laudos
ALTER TABLE public.energisa_service_records DROP CONSTRAINT energisa_service_records_laudo_id_fkey;

-- Make laudo_id nullable (keep for backward compat)
ALTER TABLE public.energisa_service_records ALTER COLUMN laudo_id DROP NOT NULL;
ALTER TABLE public.energisa_service_records ALTER COLUMN laudo_id SET DEFAULT NULL;
