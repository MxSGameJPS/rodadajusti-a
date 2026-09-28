-- Ato 3 — Pilares 3 e 4: equipe operacional e concorrência entre escritórios
begin;
alter table public.player_office_staff
 add column if not exists experience integer not null default 0,
 add column if not exists workload integer not null default 0,
 add column if not exists morale integer not null default 70,
 add column if not exists specialization text,
 add column if not exists semester integer,
 add column if not exists oab_status text not null default 'NOT_APPLICABLE',
 add column if not exists last_review_game_date date;
alter table public.player_office_staff drop constraint if exists player_office_staff_oab_valid;
alter table public.player_office_staff add constraint player_office_staff_oab_valid check(oab_status in ('NOT_APPLICABLE','STUDYING','ELIGIBLE','APPROVED'));

create table if not exists public.player_office_case_assignments(
 id uuid primary key default gen_random_uuid(),
 office_business_id uuid not null references public.player_office_businesses(id) on delete cascade,
 case_id text not null,
 staff_id uuid references public.player_office_staff(id) on delete set null,
 supervisor_career_id uuid references public.careers(id) on delete set null,
 status text not null default 'ASSIGNED',
 workload_points integer not null default 20,
 quality_score integer,
 risk_score integer not null default 0,
 assigned_game_date date not null,
 due_game_date date,
 resolved_game_date date,
 outcome text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint office_case_assignment_status_valid check(status in ('ASSIGNED','IN_PROGRESS','REVIEW','COMPLETED','FAILED','CANCELLED')),
 constraint office_case_assignment_unique_active unique(office_business_id,case_id)
);

create table if not exists public.law_firm_market_simulation(
 id uuid primary key default gen_random_uuid(),
 law_firm_id uuid not null unique references public.law_firms(id) on delete cascade,
 simulated_game_month text,
 client_strength integer not null default 30,
 talent_strength integer not null default 30,
 financial_strength integer not null default 30,
 caseload integer not null default 0,
 wins integer not null default 0,
 losses integer not null default 0,
 growth_score integer not null default 0,
 momentum integer not null default 0,
 last_event text,
 metadata jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);

create table if not exists public.law_firm_market_events(
 id uuid primary key default gen_random_uuid(),
 game_month text not null,
 law_firm_id uuid not null references public.law_firms(id) on delete cascade,
 event_type text not null,
 impact integer not null default 0,
 description text not null,
 source_key text not null,
 created_at timestamptz not null default now(),
 constraint law_firm_market_event_unique unique(law_firm_id,source_key)
);

alter table public.player_office_case_assignments enable row level security;
alter table public.law_firm_market_simulation enable row level security;
alter table public.law_firm_market_events enable row level security;
grant select,insert,update on public.player_office_case_assignments to authenticated;
grant select on public.law_firm_market_simulation to authenticated;
grant select on public.law_firm_market_events to authenticated;
create policy own_case_assignments on public.player_office_case_assignments for all to authenticated using(exists(select 1 from public.player_office_businesses b join public.careers c on c.id=b.career_id where b.id=office_business_id and c.user_id=auth.uid())) with check(exists(select 1 from public.player_office_businesses b join public.careers c on c.id=b.career_id where b.id=office_business_id and c.user_id=auth.uid()));
create policy market_simulation_read on public.law_firm_market_simulation for select to authenticated using(true);
create policy market_events_read on public.law_firm_market_events for select to authenticated using(true);
commit;