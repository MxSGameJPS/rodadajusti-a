-- Rota da Justiça — Ato 3 / Pilar 2: escritório próprio como empresa jurídica
begin;
alter table public.law_firms add column if not exists ownership_type text not null default 'NPC', add column if not exists owner_career_id uuid references public.careers(id) on delete set null;
alter table public.law_firms drop constraint if exists law_firms_ownership_type_valid;
alter table public.law_firms add constraint law_firms_ownership_type_valid check (ownership_type in ('NPC','PLAYER'));
create unique index if not exists idx_law_firms_player_owner on public.law_firms(owner_career_id) where ownership_type='PLAYER' and owner_career_id is not null;

create table if not exists public.commercial_properties (
 id uuid primary key default gen_random_uuid(), establishment_id uuid not null references public.establishments(id) on delete cascade,
 title text not null, city_id uuid references public.cities(id) on delete set null, address_text text not null default '',
 area_m2 numeric(10,2) not null default 20, room_count integer not null default 1, capacity integer not null default 2,
 listing_type text not null default 'BOTH', rent_monthly_jr numeric(14,2), sale_price_jr numeric(14,2),
 condominium_monthly_jr numeric(14,2) not null default 0, property_tax_monthly_jr numeric(14,2) not null default 0,
 deposit_months integer not null default 2, infrastructure_level integer not null default 1, status text not null default 'published',
 is_active boolean not null default true, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint commercial_property_listing_valid check(listing_type in ('RENT','SALE','BOTH')), constraint commercial_property_status_valid check(status in ('draft','published','archived')), constraint commercial_property_capacity_positive check(capacity > 0)
);
create table if not exists public.player_office_businesses (
 id uuid primary key default gen_random_uuid(), career_id uuid not null unique references public.careers(id) on delete cascade,
 law_firm_id uuid references public.law_firms(id) on delete set null, commercial_property_id uuid references public.commercial_properties(id) on delete set null,
 office_name text not null, occupancy_type text not null default 'NONE', business_status text not null default 'PLANNING', bank_balance numeric(14,2) not null default 0,
 infrastructure_level integer not null default 1, opened_game_date date, last_settlement_game_month text, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint player_office_occupancy_valid check(occupancy_type in ('NONE','RENT','OWNED')), constraint player_office_status_valid check(business_status in ('PLANNING','ACTIVE','SUSPENDED','CLOSED'))
);
create table if not exists public.player_office_staff (
 id uuid primary key default gen_random_uuid(), office_business_id uuid not null references public.player_office_businesses(id) on delete cascade,
 name text not null, role_type text not null, salary_monthly_jr numeric(14,2) not null default 0, technical_skill integer not null default 30,
 client_skill integer not null default 30, productivity integer not null default 30, loyalty integer not null default 50, status text not null default 'ACTIVE',
 hired_game_date date, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint player_office_staff_role_valid check(role_type in ('INTERN','ASSISTANT','JUNIOR_LAWYER','MID_LAWYER','SENIOR_LAWYER')), constraint player_office_staff_status_valid check(status in ('ACTIVE','TERMINATED'))
);
create table if not exists public.player_office_transactions (
 id uuid primary key default gen_random_uuid(), office_business_id uuid not null references public.player_office_businesses(id) on delete cascade,
 game_date date not null, transaction_type text not null, category text not null, amount numeric(14,2) not null, description text not null default '', source_key text, created_at timestamptz not null default now(),
 constraint player_office_transaction_type_valid check(transaction_type in ('INCOME','EXPENSE','CAPITAL_IN','WITHDRAWAL'))
);
create unique index if not exists idx_player_office_transactions_source on public.player_office_transactions(office_business_id,source_key) where source_key is not null;
alter table public.commercial_properties enable row level security; alter table public.player_office_businesses enable row level security; alter table public.player_office_staff enable row level security; alter table public.player_office_transactions enable row level security;
grant select on public.commercial_properties to authenticated; grant select,insert,update on public.player_office_businesses to authenticated; grant select,insert,update on public.player_office_staff to authenticated; grant select,insert on public.player_office_transactions to authenticated;
create policy commercial_properties_read on public.commercial_properties for select to authenticated using(status='published' and is_active=true);
create policy own_office_business on public.player_office_businesses for all to authenticated using(exists(select 1 from public.careers c where c.id=career_id and c.user_id=auth.uid())) with check(exists(select 1 from public.careers c where c.id=career_id and c.user_id=auth.uid()));
create policy own_office_staff on public.player_office_staff for all to authenticated using(exists(select 1 from public.player_office_businesses b join public.careers c on c.id=b.career_id where b.id=office_business_id and c.user_id=auth.uid())) with check(exists(select 1 from public.player_office_businesses b join public.careers c on c.id=b.career_id where b.id=office_business_id and c.user_id=auth.uid()));
create policy own_office_transactions on public.player_office_transactions for all to authenticated using(exists(select 1 from public.player_office_businesses b join public.careers c on c.id=b.career_id where b.id=office_business_id and c.user_id=auth.uid())) with check(exists(select 1 from public.player_office_businesses b join public.careers c on c.id=b.career_id where b.id=office_business_id and c.user_id=auth.uid()));
commit;
