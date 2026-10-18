-- Bilva: Phase 3 database update (strategies).
-- Run after 0002_briefs_usage.sql. Safe to run more than once.

-- Each time Bilva proposes angles for an approved brief, it saves three rows
-- sharing one batch number. The owner picks one; chosen_at marks it.

create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  brief_version integer not null check (brief_version >= 1),
  batch integer not null check (batch >= 1),
  position integer not null check (position between 1 and 3),
  strategy_data jsonb not null,
  prompt_version text not null,
  model_id text,
  chosen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, batch, position)
);

create index if not exists strategies_project_batch_idx
  on public.strategies (project_id, batch desc, position);

alter table public.strategies enable row level security;

drop policy if exists "Users read own strategies" on public.strategies;
create policy "Users read own strategies" on public.strategies
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users create own strategies" on public.strategies;
create policy "Users create own strategies" on public.strategies
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users update own strategies" on public.strategies;
create policy "Users update own strategies" on public.strategies
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
