-- Rota da Justiça — mercado de trabalho e vínculo com escritórios
-- Fecha o fluxo pós-demissão: escritórios publicados, cargos, propostas,
-- aceite/recusa e vínculo profissional persistente por carreira.

begin;

-- =========================================================
-- UNIVERSO DE ESCRITÓRIOS
-- =========================================================

create table if not exists public.law_firms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  legal_name text,
  description text not null default '',
  status text not null default 'draft',
  is_active boolean not null default true,
  version integer not null default 1,
  market_tier text not null default 'LOCAL',
  size_category text not null default 'SMALL',
  prestige integer not null default 0,
  public_reputation integer not null default 0,
  location_strategy text not null default 'PLAYER_BASE_CITY',
  brand jsonb not null default '{}'::jsonb,
  location jsonb not null default '{}'::jsonb,
  culture jsonb not null default '{}'::jsonb,
  specialties jsonb not null default '[]'::jsonb,
  departments jsonb not null default '[]'::jsonb,
  recruitment jsonb not null default '{}'::jsonb,
  case_distribution jsonb not null default '{}'::jsonb,
  discipline jsonb not null default '{}'::jsonb,
  economy jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint law_firms_status_valid check (status in ('draft', 'published', 'archived')),
  constraint law_firms_version_positive check (version >= 1),
  constraint law_firms_prestige_range check (prestige between 0 and 100),
  constraint law_firms_public_reputation_range check (public_reputation between 0 and 100),
  constraint law_firms_recruitment_object check (jsonb_typeof(recruitment) = 'object'),
  constraint law_firms_specialties_array check (jsonb_typeof(specialties) = 'array')
);

create table if not exists public.law_firm_roles (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  code text not null,
  title text not null,
  maps_to_career_tier text,
  role_type text not null default 'LAWYER',
  hierarchy_level integer not null default 1,
  requires_oab boolean not null default true,
  employment_type text not null default 'EMPLOYED',
  salary_monthly_jr numeric(14,2),
  weekly_hours integer,
  exclusive_dedication boolean not null default false,
  contract jsonb not null default '{}'::jsonb,
  requirements jsonb not null default '{}'::jsonb,
  benefits jsonb not null default '{}'::jsonb,
  case_access jsonb not null default '{}'::jsonb,
  promotion jsonb not null default '{}'::jsonb,
  termination_rules jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint law_firm_roles_code_unique unique (law_firm_id, code),
  constraint law_firm_roles_status_valid check (status in ('draft', 'published', 'archived')),
  constraint law_firm_roles_hierarchy_positive check (hierarchy_level >= 0),
  constraint law_firm_roles_weekly_hours_positive check (weekly_hours is null or weekly_hours > 0)
);

create table if not exists public.law_firm_members (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  npc_id uuid not null references public.npcs(id) on delete cascade,
  role_id uuid references public.law_firm_roles(id) on delete set null,
  department_slug text,
  office_title text not null,
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint law_firm_members_unique unique (law_firm_id, npc_id, office_title)
);

-- Garante compatibilidade caso as tabelas tenham sido criadas anteriormente
-- fora deste repositório.
alter table public.law_firms
  add column if not exists recruitment jsonb not null default '{}'::jsonb,
  add column if not exists specialties jsonb not null default '[]'::jsonb,
  add column if not exists description text not null default '',
  add column if not exists market_tier text not null default 'LOCAL',
  add column if not exists size_category text not null default 'SMALL',
  add column if not exists prestige integer not null default 0,
  add column if not exists public_reputation integer not null default 0,
  add column if not exists status text not null default 'draft',
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.law_firm_roles
  add column if not exists maps_to_career_tier text,
  add column if not exists salary_monthly_jr numeric(14,2),
  add column if not exists weekly_hours integer,
  add column if not exists exclusive_dedication boolean not null default false,
  add column if not exists employment_type text not null default 'EMPLOYED',
  add column if not exists contract jsonb not null default '{}'::jsonb,
  add column if not exists benefits jsonb not null default '{}'::jsonb,
  add column if not exists status text not null default 'draft',
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

-- =========================================================
-- PROPOSTAS E VÍNCULO DA CARREIRA
-- =========================================================

create table if not exists public.career_law_firm_offers (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.careers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  role_id uuid not null references public.law_firm_roles(id) on delete cascade,
  offer_type text not null,
  status text not null default 'PENDING',
  game_date date not null default current_date,
  expires_game_date date,
  terms jsonb not null default '{}'::jsonb,
  eligibility_snapshot jsonb not null default '{}'::jsonb,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_law_firm_offer_type_valid check (
    offer_type in (
      'POST_OAB',
      'CONTINUITY',
      'HEADHUNTING',
      'APPLICATION_APPROVED',
      'POST_TERMINATION',
      'COUNTEROFFER',
      'RETURN'
    )
  ),
  constraint career_law_firm_offer_status_valid check (
    status in ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN')
  ),
  constraint career_law_firm_offer_terms_object check (jsonb_typeof(terms) = 'object'),
  constraint career_law_firm_offer_eligibility_object check (jsonb_typeof(eligibility_snapshot) = 'object')
);

alter table public.career_law_firm_offers
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists game_date date not null default current_date,
  add column if not exists expires_game_date date,
  add column if not exists terms jsonb not null default '{}'::jsonb,
  add column if not exists eligibility_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists responded_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill defensivo do owner para instalações onde a tabela de propostas já existia.
update public.career_law_firm_offers offers
set user_id = careers.user_id
from public.careers careers
where offers.career_id = careers.id
  and offers.user_id is null;

alter table public.career_law_firm_offers
  alter column user_id set not null;

alter table public.career_law_firm_offers
  drop constraint if exists career_law_firm_offer_type_valid;
alter table public.career_law_firm_offers
  add constraint career_law_firm_offer_type_valid
  check (
    offer_type in (
      'POST_OAB',
      'CONTINUITY',
      'HEADHUNTING',
      'APPLICATION_APPROVED',
      'POST_TERMINATION',
      'COUNTEROFFER',
      'RETURN'
    )
  );

alter table public.career_law_firm_offers
  drop constraint if exists career_law_firm_offer_status_valid;
alter table public.career_law_firm_offers
  add constraint career_law_firm_offer_status_valid
  check (status in ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'));

alter table public.careers
  add column if not exists current_law_firm_id uuid references public.law_firms(id) on delete set null,
  add column if not exists current_law_firm_role_id uuid references public.law_firm_roles(id) on delete set null,
  add column if not exists employment_status text not null default 'INDEPENDENT';

alter table public.careers
  drop constraint if exists careers_employment_status_valid;
alter table public.careers
  add constraint careers_employment_status_valid
  check (employment_status in ('INDEPENDENT', 'EMPLOYED', 'TERMINATED'));

create index if not exists idx_law_firms_published
  on public.law_firms (status, is_active, prestige desc);

create index if not exists idx_law_firm_roles_firm
  on public.law_firm_roles (law_firm_id, status, is_active);

create index if not exists idx_law_firm_members_firm
  on public.law_firm_members (law_firm_id, is_active);

create index if not exists idx_law_firm_offers_career
  on public.career_law_firm_offers (career_id, status, created_at desc);

create index if not exists idx_law_firm_offers_firm
  on public.career_law_firm_offers (law_firm_id, offer_type, status);

create unique index if not exists idx_law_firm_offers_unique_pending_origin
  on public.career_law_firm_offers (career_id, law_firm_id, role_id, offer_type)
  where status = 'PENDING';

drop trigger if exists law_firms_set_updated_at on public.law_firms;
create trigger law_firms_set_updated_at
before update on public.law_firms
for each row execute function public.set_updated_at();

drop trigger if exists law_firm_roles_set_updated_at on public.law_firm_roles;
create trigger law_firm_roles_set_updated_at
before update on public.law_firm_roles
for each row execute function public.set_updated_at();

drop trigger if exists law_firm_members_set_updated_at on public.law_firm_members;
create trigger law_firm_members_set_updated_at
before update on public.law_firm_members
for each row execute function public.set_updated_at();

drop trigger if exists career_law_firm_offers_set_updated_at on public.career_law_firm_offers;
create trigger career_law_firm_offers_set_updated_at
before update on public.career_law_firm_offers
for each row execute function public.set_updated_at();

-- =========================================================
-- DATA API / RLS
-- =========================================================

alter table public.law_firms enable row level security;
alter table public.law_firm_roles enable row level security;
alter table public.law_firm_members enable row level security;
alter table public.career_law_firm_offers enable row level security;

revoke all on public.law_firms from anon;
revoke all on public.law_firm_roles from anon;
revoke all on public.law_firm_members from anon;
revoke all on public.career_law_firm_offers from anon;

grant select on public.law_firms to authenticated;
grant select on public.law_firm_roles to authenticated;
grant select on public.law_firm_members to authenticated;
grant select, insert, update on public.career_law_firm_offers to authenticated;

drop policy if exists law_firms_published_read on public.law_firms;
create policy law_firms_published_read
on public.law_firms
for select
to authenticated
using (status = 'published' and is_active = true);

drop policy if exists law_firm_roles_published_read on public.law_firm_roles;
create policy law_firm_roles_published_read
on public.law_firm_roles
for select
to authenticated
using (
  status = 'published'
  and is_active = true
  and exists (
    select 1
    from public.law_firms firm
    where firm.id = law_firm_roles.law_firm_id
      and firm.status = 'published'
      and firm.is_active = true
  )
);

drop policy if exists law_firm_members_published_read on public.law_firm_members;
create policy law_firm_members_published_read
on public.law_firm_members
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.law_firms firm
    where firm.id = law_firm_members.law_firm_id
      and firm.status = 'published'
      and firm.is_active = true
  )
);

drop policy if exists career_law_firm_offers_own_select on public.career_law_firm_offers;
create policy career_law_firm_offers_own_select
on public.career_law_firm_offers
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.careers career
    where career.id = career_law_firm_offers.career_id
      and career.user_id = (select auth.uid())
  )
);

drop policy if exists career_law_firm_offers_own_insert on public.career_law_firm_offers;
create policy career_law_firm_offers_own_insert
on public.career_law_firm_offers
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.careers career
    where career.id = career_law_firm_offers.career_id
      and career.user_id = (select auth.uid())
  )
);

drop policy if exists career_law_firm_offers_own_update on public.career_law_firm_offers;
create policy career_law_firm_offers_own_update
on public.career_law_firm_offers
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.careers career
    where career.id = career_law_firm_offers.career_id
      and career.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.careers career
    where career.id = career_law_firm_offers.career_id
      and career.user_id = (select auth.uid())
  )
);

comment on table public.career_law_firm_offers is
  'Propostas concretas geradas pelo Offer Engine do jogo a partir das políticas publicadas pelo Rota Admin.';

comment on column public.career_law_firm_offers.offer_type is
  'Recruitment V1: POST_OAB, CONTINUITY, HEADHUNTING, APPLICATION_APPROVED, POST_TERMINATION, COUNTEROFFER ou RETURN.';

commit;
