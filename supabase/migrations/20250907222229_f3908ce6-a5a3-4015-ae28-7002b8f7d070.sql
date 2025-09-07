-- Update RLS policies for gen_jobs to allow guest access
-- Drop existing policies
DROP POLICY IF EXISTS "gen_jobs_select_owner" ON public.gen_jobs;
DROP POLICY IF EXISTS "gen_jobs_insert_owner" ON public.gen_jobs;
DROP POLICY IF EXISTS "gen_jobs_update_owner" ON public.gen_jobs;
DROP POLICY IF EXISTS "gen_jobs_delete_owner" ON public.gen_jobs;

-- Create new policies that handle both authenticated users and guests
CREATE POLICY "gen_jobs_select_owner_or_guest"
ON public.gen_jobs
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND guest_id IS NOT NULL)
);

CREATE POLICY "gen_jobs_insert_owner_or_guest"
ON public.gen_jobs
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND guest_id IS NOT NULL)
);

CREATE POLICY "gen_jobs_update_owner_or_guest"
ON public.gen_jobs
FOR UPDATE
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND guest_id IS NOT NULL)
);

CREATE POLICY "gen_jobs_delete_owner_or_guest"
ON public.gen_jobs
FOR DELETE
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND guest_id IS NOT NULL)
);