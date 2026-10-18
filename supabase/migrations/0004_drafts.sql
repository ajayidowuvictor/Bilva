-- Bilva: Phase 4 database update (drafts).
-- Run after 0003_strategies.sql. Safe to run more than once.

-- Every version of the written copy is kept, so nothing is lost.

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  strategy_id uuid references public.strategies(id) on delete set null,
  version integer not null check (version >= 1),
  draft_data jsonb not null,
  owner_note text,
  prompt_version text not null,
  model_id text,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create index if not exists drafts_project_version_idx
  on public.drafts (project_id, version desc);

alter table public.drafts enable row level security;

drop policy if exists "Users read own drafts" on public.drafts;
create policy "Users read own drafts" on public.drafts
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users create own drafts" on public.drafts;
create policy "Users create own drafts" on public.drafts
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = (select auth.uid())
    )
  );
