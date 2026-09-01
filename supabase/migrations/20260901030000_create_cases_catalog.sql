-- Rota da Justiça — catálogo oficial de casos jurídicos
-- Conteúdo público do jogo. Escrita fica reservada ao service_role/admin futuro.

begin;

create table if not exists public.cases (
  id text primary key,
  code text not null unique,
  title text not null,
  area text not null,
  difficulty text not null,
  difficulty_stars smallint not null default 1,
  deadline_hours integer not null,
  honorarios_reward numeric(14,2) not null default 0,
  xp_reward integer not null default 0,
  reputation_reward integer not null default 0,
  min_career_tier text not null default 'ESTAGIARIO',
  status text not null default 'draft',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  version integer not null default 1,
  content jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cases_title_not_blank check (char_length(trim(title)) > 0),
  constraint cases_area_not_blank check (char_length(trim(area)) > 0),
  constraint cases_difficulty_not_blank check (char_length(trim(difficulty)) > 0),
  constraint cases_difficulty_stars_range check (difficulty_stars between 1 and 10),
  constraint cases_deadline_positive check (deadline_hours > 0),
  constraint cases_xp_nonnegative check (xp_reward >= 0),
  constraint cases_status_valid check (status in ('draft', 'published', 'archived')),
  constraint cases_version_positive check (version >= 1),
  constraint cases_content_object check (jsonb_typeof(content) = 'object'),
  constraint cases_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_cases_public_catalog
  on public.cases (status, is_active, sort_order);
create index if not exists idx_cases_min_career_tier
  on public.cases (min_career_tier);
create index if not exists idx_cases_difficulty
  on public.cases (difficulty, difficulty_stars);

create or replace trigger cases_set_updated_at
before update on public.cases
for each row execute function public.set_updated_at();

alter table public.cases enable row level security;

drop policy if exists "published cases are readable" on public.cases;
create policy "published cases are readable"
on public.cases
for select
to anon, authenticated
using (status = 'published' and is_active = true);

comment on table public.cases is
  'Catálogo oficial dos casos do Rota da Justiça. O conteúdo complexo fica em content JSONB; metadados de progressão ficam em colunas indexáveis.';
comment on column public.cases.content is
  'JSON do caso: client, briefing, locations, availableClues, strategies e minimumPassingScore.';
comment on column public.cases.status is
  'draft, published ou archived. Preparado para o painel administrativo futuro.';

commit;
