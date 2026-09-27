-- Rota da Justiça - carteira supervisionada do Estagiário Sênior
-- Execute manualmente no Supabase SQL Editor.

alter table public.internship_routines
  add column if not exists senior_portfolio jsonb not null default '[]'::jsonb,
  add column if not exists senior_decisions jsonb not null default '[]'::jsonb;

create index if not exists internship_routines_senior_portfolio_gin_idx
  on public.internship_routines using gin (senior_portfolio);
