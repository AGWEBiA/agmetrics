ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agsell_api_key text DEFAULT NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agsell_base_url text DEFAULT NULL;