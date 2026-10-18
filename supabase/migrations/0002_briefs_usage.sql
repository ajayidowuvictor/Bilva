-- Bilva: Phase 2 database update (briefs and AI usage tracking).
-- Run after 0001_init.sql. Safe to run more than once.

-- 1. Briefs: each version of a project's brief, kept so nothing is lost ----

create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  version integer not null check (version >= 1),
  brief_data jsonb not null,
  owner_answers text,
  prompt_version text not null,
  model_id text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create index if not exists briefs_project_version_idx
  on public.briefs (project_id, version desc);

-- 2. Usage events: one row per AI call, used for daily limits and costs ----

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  operation text not null,
  provider text not null,
  model_id text,
  input_tokens integer,
  output_tokens integer,
  status text not null check (status in ('success', 'error')),
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_created_idx
  on public.usage_events (user_id, created_at desc);

-- 3. Privacy: people only see and change their own rows ---------------------

alter table public.briefs enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists "Users read own briefs" on public.briefs;
create policy "Users read own briefs" on public.briefs
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users create own briefs" on public.briefs;
create policy "Users create own briefs" on public.briefs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users update own briefs" on public.briefs;
create policy "Users update own briefs" on public.briefs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users read own usage" on public.usage_events;
create policy "Users read own usage" on public.usage_events
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users record own usage" on public.usage_events;
create policy "Users record own usage" on public.usage_events
  for insert to authenticated
  with check (user_id = (select auth.uid()));
