
-- Add Kiwify OAuth credentials per project
ALTER TABLE public.projects
ADD COLUMN kiwify_client_id text DEFAULT NULL,
ADD COLUMN kiwify_client_secret text DEFAULT NULL,
ADD COLUMN kiwify_account_id text DEFAULT NULL;
