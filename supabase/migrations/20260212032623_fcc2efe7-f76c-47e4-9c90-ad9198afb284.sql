
-- Remove unique constraint on meta_credentials.project_id to allow multiple accounts per project
ALTER TABLE public.meta_credentials DROP CONSTRAINT IF EXISTS meta_credentials_project_id_key;

-- Add a label column to identify accounts
ALTER TABLE public.meta_credentials ADD COLUMN IF NOT EXISTS label TEXT DEFAULT '';

-- Add credential_id reference to meta_campaigns to link campaigns to specific accounts
ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS credential_id UUID REFERENCES public.meta_credentials(id) ON DELETE CASCADE;
