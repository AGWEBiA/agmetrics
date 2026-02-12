
-- Add webhook token columns to projects
ALTER TABLE public.projects
  ADD COLUMN kiwify_webhook_token text DEFAULT NULL,
  ADD COLUMN hotmart_webhook_token text DEFAULT NULL;
