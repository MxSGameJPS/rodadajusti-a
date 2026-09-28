-- Rota da Justiça - Ato 2: estado profissional persistente
-- Executar manualmente no Supabase SQL Editor antes de testar o Ato 2.

alter table public.careers
  add column if not exists professional_employment jsonb not null default '{}'::jsonb,
  add column if not exists professional_rpg jsonb not null default '{}'::jsonb,
  add column if not exists professional_work_state jsonb not null default '{}'::jsonb,
  add column if not exists professional_portfolio jsonb not null default '{}'::jsonb;

create index if not exists careers_professional_employment_gin
  on public.careers using gin (professional_employment);
create index if not exists careers_professional_portfolio_gin
  on public.careers using gin (professional_portfolio);

comment on column public.careers.professional_employment is 'Ato 2: vínculo, contrato e onboarding profissional.';
comment on column public.careers.professional_rpg is 'Ato 2: atributos, traits, ética, caráter e exposição.';
comment on column public.careers.professional_work_state is 'Ato 2: rotina diária, jornada e responsabilidade profissional.';
comment on column public.careers.professional_portfolio is 'Ato 2: carteira simultânea de processos, tarefas e prazos.';
