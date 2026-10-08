-- Persist city selection per authenticated account, never by browser.
create table if not exists public.player_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  city text not null check (char_length(trim(city)) between 2 and 70),
  state text not null check (state ~ '^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$'),
  updated_at timestamptz not null default now()
);
alter table public.player_onboarding enable row level security;
revoke all on public.player_onboarding from anon;
grant select,insert,update,delete on public.player_onboarding to authenticated;
create policy player_onboarding_owner on public.player_onboarding
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
