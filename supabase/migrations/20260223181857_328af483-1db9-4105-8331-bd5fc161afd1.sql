ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS hotmart_client_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hotmart_client_secret text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hotmart_basic_auth text DEFAULT NULL;