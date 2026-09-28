begin;
alter table public.careers add column if not exists legal_prestige jsonb not null default '{"tier":"LOCAL","score":0,"peakTier":"LOCAL","promotedAt":null,"lastReason":null,"processedKeys":[]}'::jsonb;
alter table public.careers drop constraint if exists careers_legal_prestige_object;
alter table public.careers add constraint careers_legal_prestige_object check(jsonb_typeof(legal_prestige)='object');
commit;