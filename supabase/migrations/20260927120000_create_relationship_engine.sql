-- Rota da Justiça — Motor de Relacionamentos
-- Execute no SQL Editor do Supabase após as migrations base do jogo.

begin;

create table if not exists public.player_relationships (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null,
  user_id uuid not null,
  entity_id text not null,
  entity_type text not null,
  entity_name text not null,
  entity_role text,
  adult_only boolean not null default true,
  bonds jsonb not null default '[]'::jsonb,
  affinity smallint not null default 20,
  trust smallint not null default 15,
  intimacy smallint not null default 0,
  attraction smallint not null default 0,
  romance smallint not null default 0,
  commitment smallint not null default 0,
  conflict smallint not null default 0,
  professional_respect smallint not null default 10,
  professional_trust smallint not null default 10,
  rivalry smallint not null default 0,
  institutional_reputation smallint not null default 10,
  loyalty smallint not null default 5,
  interaction_count integer not null default 0,
  last_interaction_game_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_relationships_career_owner_fk foreign key (career_id,user_id) references public.careers(id,user_id) on delete cascade,
  constraint player_relationships_entity_type_check check (entity_type in ('NPC','ESTABLISHMENT','ORGANIZATION')),
  constraint player_relationships_entity_id_check check (char_length(trim(entity_id)) > 0),
  constraint player_relationships_name_check check (char_length(trim(entity_name)) > 0),
  constraint player_relationships_bonds_array check (jsonb_typeof(bonds)='array'),
  constraint player_relationships_interactions_nonnegative check (interaction_count >= 0),
  constraint player_relationships_dimensions_check check (
    affinity between 0 and 100 and trust between 0 and 100 and intimacy between 0 and 100
    and attraction between 0 and 100 and romance between 0 and 100 and commitment between 0 and 100
    and conflict between 0 and 100 and professional_respect between 0 and 100
    and professional_trust between 0 and 100 and rivalry between 0 and 100
    and institutional_reputation between 0 and 100 and loyalty between 0 and 100
  ),
  constraint player_relationships_career_entity_unique unique(career_id,entity_id)
);

create table if not exists public.relationship_memories (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.player_relationships(id) on delete cascade,
  career_id uuid not null,
  user_id uuid not null,
  memory_key text,
  kind text not null,
  title text not null,
  description text not null default '',
  game_date text not null,
  intensity smallint not null default 20,
  scope text not null default 'PRIVATE',
  dimension_effects jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint relationship_memories_career_owner_fk foreign key (career_id,user_id) references public.careers(id,user_id) on delete cascade,
  constraint relationship_memories_intensity_check check (intensity between 1 and 100),
  constraint relationship_memories_scope_check check (scope in ('PRIVATE','SOCIAL_CIRCLE','WORKPLACE','PROFESSIONAL_COMMUNITY','CITY','REGIONAL','NATIONAL')),
  constraint relationship_memories_effects_object check (jsonb_typeof(dimension_effects)='object'),
  constraint relationship_memories_metadata_object check (jsonb_typeof(metadata)='object'),
  constraint relationship_memories_kind_check check (char_length(trim(kind)) > 0),
  constraint relationship_memories_title_check check (char_length(trim(title)) > 0)
);

create unique index if not exists idx_relationship_memories_key on public.relationship_memories(relationship_id,memory_key) where memory_key is not null;
create index if not exists idx_player_relationships_user on public.player_relationships(user_id);
create index if not exists idx_player_relationships_career_type on public.player_relationships(career_id,entity_type);
create index if not exists idx_player_relationships_last_interaction on public.player_relationships(career_id,updated_at desc);
create index if not exists idx_relationship_memories_relationship on public.relationship_memories(relationship_id,created_at desc);
create index if not exists idx_relationship_memories_career on public.relationship_memories(career_id,created_at desc);

drop trigger if exists player_relationships_set_updated_at on public.player_relationships;
create trigger player_relationships_set_updated_at before update on public.player_relationships for each row execute function public.set_updated_at();

alter table public.player_relationships enable row level security;
alter table public.relationship_memories enable row level security;
revoke all on public.player_relationships from anon;
revoke all on public.relationship_memories from anon;
grant select,insert,update,delete on public.player_relationships to authenticated;
grant select,insert,update,delete on public.relationship_memories to authenticated;

drop policy if exists player_relationships_own_all on public.player_relationships;
create policy player_relationships_own_all on public.player_relationships for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop policy if exists relationship_memories_own_all on public.relationship_memories;
create policy relationship_memories_own_all on public.relationship_memories for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

commit;

-- Verificação opcional:
-- select table_name from information_schema.tables
-- where table_schema='public' and table_name in ('player_relationships','relationship_memories');
