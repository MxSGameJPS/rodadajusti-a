-- Rota da Justica - preparacao intensiva OAB
-- Aplicada manualmente no Supabase em 2026-09-27.

alter table public.internship_routines
  add column if not exists oab_preparation jsonb not null default '{}'::jsonb;
