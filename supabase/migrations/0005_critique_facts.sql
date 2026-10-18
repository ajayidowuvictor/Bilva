-- Bilva: Phase 5 database update (critique, revisions, facts added later).
-- Run after 0004_drafts.sql. Safe to run more than once.

-- 1. Critiques: one editor's review per draft version ------------------------

create table if not exists public.critiques (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  draft_id uuid not null references public.drafts(id) on delete cascade,
  critique_data jsonb not null,
  prompt_version text not null,
  model_id text,
  created_at timestamptz not null default now(),
  unique (draft_id)
);

create index if not exists critiques_project_idx
  on public.critiques (project_id, created_at desc);

alter table public.critiques enable row level security;

drop policy if exists "Users read own critiques" on public.critiques;
create policy "Users read own critiques" on public.critiques
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users create own critiques" on public.critiques;
create policy "Users create own critiques" on public.critiques
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = (select auth.uid())
    )
  );

-- 2. Drafts: remember which versions came from an editor's critique ----------

alter table public.drafts
  add column if not exists kind text not null default 'draft'
  check (kind in ('draft', 'owner', 'revision'));

-- 3. Projects: facts the owner adds after the brief was approved --------------

alter table public.projects
  add column if not exists extra_facts text;
