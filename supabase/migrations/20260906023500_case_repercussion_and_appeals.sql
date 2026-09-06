-- Rota da Justiça — repercussão, recursos e progressão por instância

begin;

alter table public.cases
  add column if not exists repercussion_level text not null default 'COMUM',
  add column if not exists procedural_stage text not null default 'PRIMEIRA_INSTANCIA',
  add column if not exists process_key text,
  add column if not exists appeal_of_case_id text,
  add column if not exists appeal_type text,
  add column if not exists appeal_trigger text,
  add column if not exists appeal_deadline_days integer not null default 15,
  add column if not exists court_name text;

alter table public.cases drop constraint if exists cases_repercussion_level_valid;
alter table public.cases add constraint cases_repercussion_level_valid
  check (repercussion_level in ('COMUM', 'RELEVANTE', 'GRANDE_REPERCUSSAO', 'NACIONAL'));

alter table public.cases drop constraint if exists cases_procedural_stage_valid;
alter table public.cases add constraint cases_procedural_stage_valid
  check (procedural_stage in ('PRIMEIRA_INSTANCIA', 'SEGUNDA_INSTANCIA', 'STJ', 'STF'));

alter table public.cases drop constraint if exists cases_appeal_type_valid;
alter table public.cases add constraint cases_appeal_type_valid
  check (
    appeal_type is null or appeal_type in (
      'APELACAO',
      'AGRAVO_INSTRUMENTO',
      'AGRAVO_INTERNO',
      'RECURSO_ESPECIAL',
      'RECURSO_EXTRAORDINARIO',
      'AGRAVO_RECURSO_ESPECIAL',
      'AGRAVO_RECURSO_EXTRAORDINARIO',
      'OUTRO'
    )
  );

alter table public.cases drop constraint if exists cases_appeal_trigger_valid;
alter table public.cases add constraint cases_appeal_trigger_valid
  check (
    appeal_trigger is null or appeal_trigger in (
      'PLAYER_LOSS',
      'PLAYER_WIN_OPPONENT_APPEALS',
      'ANY_RESULT'
    )
  );

alter table public.cases drop constraint if exists cases_appeal_deadline_days_positive;
alter table public.cases add constraint cases_appeal_deadline_days_positive
  check (appeal_deadline_days > 0);

alter table public.cases drop constraint if exists cases_appeal_not_self;
alter table public.cases add constraint cases_appeal_not_self
  check (appeal_of_case_id is null or appeal_of_case_id <> id);

-- A FK é adicionada de forma defensiva para permitir reexecução da migration.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cases_appeal_of_case_id_fkey'
      and conrelid = 'public.cases'::regclass
  ) then
    alter table public.cases
      add constraint cases_appeal_of_case_id_fkey
      foreign key (appeal_of_case_id)
      references public.cases(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_cases_repercussion_level
  on public.cases (repercussion_level, status, is_active);
create index if not exists idx_cases_procedural_stage
  on public.cases (procedural_stage, min_career_tier, status, is_active);
create index if not exists idx_cases_appeal_of_case_id
  on public.cases (appeal_of_case_id)
  where appeal_of_case_id is not null;
create index if not exists idx_cases_process_key
  on public.cases (process_key)
  where process_key is not null;

comment on column public.cases.repercussion_level is
  'COMUM, RELEVANTE, GRANDE_REPERCUSSAO ou NACIONAL. O jogo aplica bônus de XP e reputação a partir deste nível.';
comment on column public.cases.procedural_stage is
  'PRIMEIRA_INSTANCIA, SEGUNDA_INSTANCIA, STJ ou STF.';
comment on column public.cases.process_key is
  'Identificador lógico do mesmo processo ao longo das instâncias. Pode ser compartilhado entre caso originário e recursos.';
comment on column public.cases.appeal_of_case_id is
  'Caso/fase imediatamente anterior que este registro continua em grau recursal.';
comment on column public.cases.appeal_type is
  'Tipo de recurso que leva o processo a esta fase.';
comment on column public.cases.appeal_trigger is
  'PLAYER_LOSS: jogador recorre após derrota; PLAYER_WIN_OPPONENT_APPEALS: parte contrária recorre após vitória do jogador; ANY_RESULT: continuação configurada independentemente do resultado.';
comment on column public.cases.appeal_deadline_days is
  'Prazo recursal simulado em dias do calendário do jogo. Aplicado aos recursos interpostos pelo jogador.';
comment on column public.cases.court_name is
  'Nome exibível do tribunal/câmara/turma responsável pela fase recursal.';

commit;
