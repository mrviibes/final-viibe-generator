
-- Make user_id nullable to support guest jobs and add guest_id for tracking
ALTER TABLE public.gen_jobs
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.gen_jobs
  ADD COLUMN IF NOT EXISTS guest_id text;

-- Optional: if you want updated_at to auto-refresh on updates (you already have the function),
-- uncomment the trigger below. It is not required to fix the failure.
-- DO $$ BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_trigger WHERE tgname = 'gen_jobs_set_updated_at'
--   ) THEN
--     CREATE TRIGGER gen_jobs_set_updated_at
--     BEFORE UPDATE ON public.gen_jobs
--     FOR EACH ROW
--     EXECUTE FUNCTION public.set_updated_at();
--   END IF;
-- END $$;
