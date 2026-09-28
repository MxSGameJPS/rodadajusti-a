begin;
alter table public.careers add column if not exists public_service_gameplay jsonb not null default '{"jurisdiction":null,"branch":null,"assignment":null,"completedAssignments":[],"stats":{"judicialDecisions":0,"hearings":0,"prosecutionActs":0,"jurySessions":0,"civilInvestigations":0,"appellateVotes":0,"dissents":0},"correctionRisk":0,"institutionalEvents":[]}'::jsonb;
alter table public.careers add column if not exists apex_career_state jsonb not null default '{"activeAppointment":null,"history":[],"processedKeys":[]}'::jsonb;
commit;