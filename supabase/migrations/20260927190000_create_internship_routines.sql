-- Rota da Justiça - persistência da rotina de estágio e progressão sênior
-- 2026-09-27
-- Execute manualmente no Supabase SQL Editor.

create table if not exists public.internship_routines (
  career_id uuid primary key references public.careers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attendance jsonb not null default '[]'::jsonb,
  meetings jsonb not null default '[]'::jsonb,
  handled_event_keys jsonb not null default '[]'::jsonb,
  daily_task_keys jsonb not null default '{}'::jsonb,
  greeted_workdays jsonb not null default '[]'::jsonb,
  excused_absence_keys jsonb not null default '[]'::jsonb,
  senior_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists internship_routines_user_id_idx
  on public.internship_routines(user_id);

alter table public.internship_routines enable row level security;

drop policy if exists "internship_routines_select_own" on public.internship_routines;
create policy "internship_routines_select_own"
  on public.internship_routines for select
  using (auth.uid() = user_id);

drop policy if exists "internship_routines_insert_own" on public.internship_routines;
create policy "internship_routines_insert_own"
  on public.internship_routines for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.careers c
      where c.id = career_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "internship_routines_update_own" on public.internship_routines;
create policy "internship_routines_update_own"
  on public.internship_routines for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "internship_routines_delete_own" on public.internship_routines;
create policy "internship_routines_delete_own"
  on public.internship_routines for delete
  using (auth.uid() = user_id);
