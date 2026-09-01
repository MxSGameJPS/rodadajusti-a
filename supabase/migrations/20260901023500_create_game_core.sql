-- Rota da Justiça — esquema base de persistência do jogo
-- Cria perfis, carreiras, saves, progresso de casos e histórico de eventos.
-- Inclui RLS, índices, gatilhos de updated_at e criação automática de profiles.

begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  auth_source text not null default 'email',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) between 1 and 80
  ),
  constraint profiles_auth_source_not_blank check (char_length(trim(auth_source)) > 0)
);

create table if not exists public.careers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_name text not null,
  career_stage text not null default 'ESTAGIARIO',
  academic_degree text not null default 'GRADUANDO',
  level integer not null default 1,
  xp integer not null default 0,
  reputation integer not null default 15,
  money numeric(14,2) not null default 1200.00,
  main_area text,
  current_city text,
  cases_completed integer not null default 0,
  cases_failed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_played_at timestamptz not null default now(),
  constraint careers_character_name_length check (char_length(trim(character_name)) between 1 and 80),
  constraint careers_career_stage_not_blank check (char_length(trim(career_stage)) > 0),
  constraint careers_academic_degree_not_blank check (char_length(trim(academic_degree)) > 0),
  constraint careers_level_positive check (level >= 1),
  constraint careers_xp_nonnegative check (xp >= 0),
  constraint careers_reputation_range check (reputation between 0 and 100),
  constraint careers_cases_completed_nonnegative check (cases_completed >= 0),
  constraint careers_cases_failed_nonnegative check (cases_failed >= 0),
  constraint careers_id_user_unique unique (id, user_id)
);

create table if not exists public.game_saves (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null,
  user_id uuid not null,
  slot smallint not null default 1,
  save_version integer not null default 1,
  game_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  constraint game_saves_career_owner_fk
    foreign key (career_id, user_id)
    references public.careers(id, user_id)
    on delete cascade,
  constraint game_saves_slot_range check (slot between 1 and 5),
  constraint game_saves_version_positive check (save_version >= 1),
  constraint game_saves_state_object check (jsonb_typeof(game_state) = 'object'),
  constraint game_saves_career_slot_unique unique (career_id, slot)
);

create table if not exists public.case_progress (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null,
  user_id uuid not null,
  case_id text not null,
  status text not null default 'AVAILABLE',
  score integer,
  investigation_score integer,
  legal_score integer,
  ethics_score integer,
  evidence_found jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  outcome jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint case_progress_career_owner_fk
    foreign key (career_id, user_id)
    references public.careers(id, user_id)
    on delete cascade,
  constraint case_progress_case_id_not_blank check (char_length(trim(case_id)) > 0),
  constraint case_progress_status_valid check (
    status in ('LOCKED', 'AVAILABLE', 'ACTIVE', 'COMPLETED', 'FAILED')
  ),
  constraint case_progress_score_range check (score is null or score between 0 and 100),
  constraint case_progress_investigation_score_range check (
    investigation_score is null or investigation_score between 0 and 100
  ),
  constraint case_progress_legal_score_range check (
    legal_score is null or legal_score between 0 and 100
  ),
  constraint case_progress_ethics_score_range check (
    ethics_score is null or ethics_score between 0 and 100
  ),
  constraint case_progress_evidence_array check (jsonb_typeof(evidence_found) = 'array'),
  constraint case_progress_decisions_array check (jsonb_typeof(decisions) = 'array'),
  constraint case_progress_outcome_object check (jsonb_typeof(outcome) = 'object'),
  constraint case_progress_career_case_unique unique (career_id, case_id)
);

create table if not exists public.career_events (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null,
  user_id uuid not null,
  event_type text not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint career_events_career_owner_fk
    foreign key (career_id, user_id)
    references public.careers(id, user_id)
    on delete cascade,
  constraint career_events_type_not_blank check (char_length(trim(event_type)) > 0),
  constraint career_events_title_not_blank check (char_length(trim(title)) > 0),
  constraint career_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_careers_user_id
  on public.careers(user_id);

create index if not exists idx_careers_user_last_played
  on public.careers(user_id, last_played_at desc);

create index if not exists idx_game_saves_user_id
  on public.game_saves(user_id);

create index if not exists idx_game_saves_career_id
  on public.game_saves(career_id);

create index if not exists idx_game_saves_last_saved
  on public.game_saves(user_id, last_saved_at desc);

create index if not exists idx_case_progress_user_id
  on public.case_progress(user_id);

create index if not exists idx_case_progress_career_status
  on public.case_progress(career_id, status);

create index if not exists idx_case_progress_case_id
  on public.case_progress(case_id);

create index if not exists idx_career_events_user_id
  on public.career_events(user_id);

create index if not exists idx_career_events_career_created
  on public.career_events(career_id, created_at desc);

create index if not exists idx_career_events_type
  on public.career_events(event_type);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists careers_set_updated_at on public.careers;
create trigger careers_set_updated_at
before update on public.careers
for each row execute function public.set_updated_at();

drop trigger if exists game_saves_set_updated_at on public.game_saves;
create trigger game_saves_set_updated_at
before update on public.game_saves
for each row execute function public.set_updated_at();

drop trigger if exists case_progress_set_updated_at on public.case_progress;
create trigger case_progress_set_updated_at
before update on public.case_progress
for each row execute function public.set_updated_at();

create or replace function public.handle_new_game_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, auth_source, created_at, updated_at)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Jogador'
    ),
    coalesce(nullif(new.raw_app_meta_data ->> 'provider', ''), 'email'),
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name),
        auth_source = coalesce(nullif(public.profiles.auth_source, ''), excluded.auth_source),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_game_profile on auth.users;
create trigger on_auth_user_created_game_profile
after insert on auth.users
for each row execute function public.handle_new_game_user();

insert into public.profiles (id, display_name, auth_source, created_at, updated_at)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Jogador'
  ),
  coalesce(nullif(u.raw_app_meta_data ->> 'provider', ''), 'email'),
  coalesce(u.created_at, now()),
  now()
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.careers enable row level security;
alter table public.game_saves enable row level security;
alter table public.case_progress enable row level security;
alter table public.career_events enable row level security;

revoke all on public.profiles from anon;
revoke all on public.careers from anon;
revoke all on public.game_saves from anon;
revoke all on public.case_progress from anon;
revoke all on public.career_events from anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.careers to authenticated;
grant select, insert, update, delete on public.game_saves to authenticated;
grant select, insert, update, delete on public.case_progress to authenticated;
grant select, insert on public.career_events to authenticated;

drop policy if exists profiles_own_select on public.profiles;
create policy profiles_own_select
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists profiles_own_insert on public.profiles;
create policy profiles_own_insert
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists careers_own_all on public.careers;
create policy careers_own_all
on public.careers
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists game_saves_own_all on public.game_saves;
create policy game_saves_own_all
on public.game_saves
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists case_progress_own_all on public.case_progress;
create policy case_progress_own_all
on public.case_progress
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists career_events_own_select on public.career_events;
create policy career_events_own_select
on public.career_events
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists career_events_own_insert on public.career_events;
create policy career_events_own_insert
on public.career_events
for insert
to authenticated
with check ((select auth.uid()) = user_id);

commit;
