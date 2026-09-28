-- Rota da Justiça — Ato 3 / Pilares 5 e 6
begin;
create table if not exists public.career_media_events(
 id uuid primary key default gen_random_uuid(),career_id uuid not null references public.careers(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 case_id text not null,event_key text not null,event_type text not null,game_date date not null,repercussion_level text not null,headline text not null,summary text not null default '',
 exposure integer not null default 0,sentiment integer not null default 0,legal_risk integer not null default 0,client_impact integer not null default 0,institutional_impact integer not null default 0,
 response_strategy text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),
 constraint career_media_repercussion_valid check(repercussion_level in ('RELEVANTE','GRANDE_REPERCUSSAO','NACIONAL')),
 constraint career_media_strategy_valid check(response_strategy is null or response_strategy in ('SILENCE','TECHNICAL_STATEMENT','INTERVIEW','SOCIAL_MEDIA')),
 constraint career_media_unique unique(career_id,event_key)
);
create table if not exists public.career_world_memories(
 id uuid primary key default gen_random_uuid(),career_id uuid not null references public.careers(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 memory_key text not null,entity_key text not null,entity_name text not null,entity_role text,kind text not null,title text not null,description text not null default '',
 game_date date not null,scope text not null,intensity integer not null default 20,respect_delta integer not null default 0,trust_delta integer not null default 0,rivalry_delta integer not null default 0,
 source_case_id text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),
 constraint career_world_memory_scope_valid check(scope in ('WORKPLACE','PROFESSIONAL_COMMUNITY','CITY','REGIONAL','NATIONAL')),
 constraint career_world_memory_unique unique(career_id,memory_key,entity_key)
);
create index if not exists idx_media_events_career on public.career_media_events(career_id,game_date desc);
create index if not exists idx_world_memories_entity on public.career_world_memories(career_id,entity_key,game_date desc);
alter table public.career_media_events enable row level security;alter table public.career_world_memories enable row level security;
grant select,insert,update on public.career_media_events to authenticated;grant select,insert,update on public.career_world_memories to authenticated;
create policy career_media_own on public.career_media_events for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy career_world_memory_own on public.career_world_memories for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
commit;