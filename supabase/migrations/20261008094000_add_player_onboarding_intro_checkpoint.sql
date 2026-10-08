-- Keep the pre-contract narrative completion on the authenticated account.
alter table public.player_onboarding add column if not exists intro_seen boolean not null default false;
