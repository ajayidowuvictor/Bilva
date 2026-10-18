-- Bilva: Phase 6 database update (the version the owner marks as final).
-- Run after 0005_critique_facts.sql. Safe to run more than once.

alter table public.projects
  add column if not exists final_draft_id uuid
  references public.drafts(id) on delete set null;
