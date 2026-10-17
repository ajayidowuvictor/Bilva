-- Bilva: initial database setup (profiles and projects).
-- Safe to run more than once.

-- 1. Tables ---------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  original_idea text not null
    check (char_length(original_idea) between 10 and 4000),
  objective text,
  status text not null default 'intake'
    check (status in (
      'intake', 'briefing', 'strategy',
      'drafting', 'review', 'completed', 'archived'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_created_at_idx
  on public.projects (user_id, created_at desc);

-- 2. Automatic profile for every new account -----------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Give a profile to anyone who signed up before this file was run.
insert into public.profiles (id, display_name)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- 3. Keep updated_at current ----------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- 4. Privacy: each person can only see and change their own work ---------

alter table public.profiles enable row level security;
alter table public.projects enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Users read own projects" on public.projects;
create policy "Users read own projects" on public.projects
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users create own projects" on public.projects;
create policy "Users create own projects" on public.projects
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users update own projects" on public.projects;
create policy "Users update own projects" on public.projects
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users delete own projects" on public.projects;
create policy "Users delete own projects" on public.projects
  for delete to authenticated
  using (user_id = (select auth.uid()));
