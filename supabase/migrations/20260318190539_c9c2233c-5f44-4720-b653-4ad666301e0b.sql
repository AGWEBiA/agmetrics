
-- Remove the CASCADE FK and replace with SET NULL so deleting a user doesn't delete their projects
ALTER TABLE public.projects DROP CONSTRAINT projects_owner_id_fkey;

-- Make owner_id nullable
ALTER TABLE public.projects ALTER COLUMN owner_id DROP NOT NULL;

-- Re-add FK with SET NULL
ALTER TABLE public.projects
  ADD CONSTRAINT projects_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
