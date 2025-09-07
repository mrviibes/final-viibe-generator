
-- 1) Jobs table for image generations
create table if not exists public.gen_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status text not null default 'queued', -- queued | running | done | error
  prompt text not null,
  negative_prompt text default '',
  style text not null,         -- e.g. DESIGN | REALISTIC | etc (mirrors style_type)
  aspect text not null,        -- e.g. ASPECT_16_9, ASPECT_9_16, ASPECT_1_1
  image_url text,              -- signed URL returned to client
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.gen_jobs enable row level security;

-- Policies: owner-only access
drop policy if exists "gen_jobs_select_owner" on public.gen_jobs;
create policy "gen_jobs_select_owner"
  on public.gen_jobs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "gen_jobs_insert_owner" on public.gen_jobs;
create policy "gen_jobs_insert_owner"
  on public.gen_jobs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "gen_jobs_update_owner" on public.gen_jobs;
create policy "gen_jobs_update_owner"
  on public.gen_jobs
  for update
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "gen_jobs_delete_owner" on public.gen_jobs;
create policy "gen_jobs_delete_owner"
  on public.gen_jobs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Helpful index for listing
create index if not exists gen_jobs_user_created_at_idx on public.gen_jobs (user_id, created_at desc);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gen_jobs_set_updated_at on public.gen_jobs;
create trigger gen_jobs_set_updated_at
before update on public.gen_jobs
for each row execute function public.set_updated_at();

-- 2) Storage bucket for generated images (private)
insert into storage.buckets (id, name, public)
values ('gen-images', 'gen-images', false)
on conflict (id) do nothing;

-- Storage RLS: allow users to access only their own objects under {user_id}/...
-- NOTE: Policies are evaluated on storage.objects
-- Path-based ownership using object name prefix "user_id/"
drop policy if exists "gen_images_select_own" on storage.objects;
create policy "gen_images_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'gen-images'
    and (name like (auth.uid()::text || '/%'))
  );

drop policy if exists "gen_images_insert_own" on storage.objects;
create policy "gen_images_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'gen-images'
    and (name like (auth.uid()::text || '/%'))
  );

drop policy if exists "gen_images_update_own" on storage.objects;
create policy "gen_images_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'gen-images'
    and (name like (auth.uid()::text || '/%'))
  );

drop policy if exists "gen_images_delete_own" on storage.objects;
create policy "gen_images_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'gen-images'
    and (name like (auth.uid()::text || '/%'))
  );
