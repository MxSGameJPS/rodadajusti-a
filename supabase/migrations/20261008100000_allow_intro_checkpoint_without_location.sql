-- The narrative is completed before the player selects a city.
alter table public.player_onboarding alter column city drop not null;
alter table public.player_onboarding alter column state drop not null;
alter table public.player_onboarding add constraint onboarding_location_both_or_neither check ((city is null and state is null) or (city is not null and state is not null));
