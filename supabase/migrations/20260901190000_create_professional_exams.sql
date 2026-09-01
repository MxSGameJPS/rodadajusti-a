-- Rota da Justiça - módulo de Exames Profissionais / Exame da Ordem
-- Catálogo administrável, tentativas server-authoritative e registro profissional FICTÍCIO do personagem.

begin;

alter table public.careers
  add column if not exists oab_exam_passed boolean not null default false,
  add column if not exists oab_exam_score integer,
  add column if not exists oab_registration_code text,
  add column if not exists oab_exam_passed_at timestamptz;

alter table public.careers drop constraint if exists careers_oab_exam_score_range;
alter table public.careers add constraint careers_oab_exam_score_range
  check (oab_exam_score is null or oab_exam_score between 0 and 200);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  exam_type text not null default 'oab_first_phase',
  edition_number integer,
  year integer not null,
  official_applied_date date,
  source_kind text not null default 'manual',
  source_label text,
  question_count integer not null,
  passing_score integer not null,
  duration_minutes integer not null,
  status text not null default 'draft',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  simulation_notice text,
  disclaimer text,
  generation_brief text,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exams_slug_not_blank check (char_length(trim(slug)) > 2),
  constraint exams_title_not_blank check (char_length(trim(title)) > 3),
  constraint exams_source_kind_valid check (source_kind in ('official_reference','ai_generated','manual')),
  constraint exams_status_valid check (status in ('draft','published','archived')),
  constraint exams_question_count_positive check (question_count > 0),
  constraint exams_passing_score_valid check (passing_score > 0 and passing_score <= question_count),
  constraint exams_duration_positive check (duration_minutes > 0),
  constraint exams_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_number integer not null,
  area text not null,
  prompt text not null,
  options jsonb not null,
  correct_option text not null,
  explanation text,
  difficulty text,
  sort_order integer not null default 0,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_questions_number_positive check (question_number > 0),
  constraint exam_questions_area_not_blank check (char_length(trim(area)) > 1),
  constraint exam_questions_prompt_not_blank check (char_length(trim(prompt)) > 5),
  constraint exam_questions_options_array check (jsonb_typeof(options) = 'array'),
  constraint exam_questions_correct_valid check (correct_option in ('A','B','C','D','E')),
  constraint exam_questions_source_object check (jsonb_typeof(source_metadata) = 'object'),
  constraint exam_questions_exam_number_unique unique (exam_id, question_number)
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  career_id uuid references public.careers(id) on delete set null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  duration_seconds integer not null default 0,
  score integer not null,
  total_questions integer not null,
  passed boolean not null,
  answers jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  constraint exam_attempts_duration_nonnegative check (duration_seconds >= 0),
  constraint exam_attempts_score_nonnegative check (score >= 0),
  constraint exam_attempts_total_positive check (total_questions > 0),
  constraint exam_attempts_answers_object check (jsonb_typeof(answers) = 'object'),
  constraint exam_attempts_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.professional_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  career_id uuid references public.careers(id) on delete set null,
  registration_type text not null default 'OAB_SIMULADA',
  registration_code text not null,
  source_exam_id uuid references public.exams(id) on delete set null,
  exam_score integer,
  is_simulated boolean not null default true,
  issued_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint professional_registrations_type_not_blank check (char_length(trim(registration_type)) > 2),
  constraint professional_registrations_code_not_blank check (char_length(trim(registration_code)) > 3),
  constraint professional_registrations_score_nonnegative check (exam_score is null or exam_score >= 0),
  constraint professional_registrations_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint professional_registrations_user_code_unique unique (user_id, registration_code)
);

create index if not exists idx_exams_status_active
  on public.exams(status, is_active, is_featured);
create index if not exists idx_exam_questions_exam_sort
  on public.exam_questions(exam_id, sort_order, question_number);
create index if not exists idx_exam_attempts_user_submitted
  on public.exam_attempts(user_id, submitted_at desc);
create index if not exists idx_exam_attempts_exam
  on public.exam_attempts(exam_id);
create index if not exists idx_professional_registrations_user
  on public.professional_registrations(user_id, issued_at desc);

drop trigger if exists exams_set_updated_at on public.exams;
create trigger exams_set_updated_at
before update on public.exams
for each row execute function public.set_updated_at();

drop trigger if exists exam_questions_set_updated_at on public.exam_questions;
create trigger exam_questions_set_updated_at
before update on public.exam_questions
for each row execute function public.set_updated_at();

alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.professional_registrations enable row level security;

revoke all on public.exams from anon;
revoke all on public.exam_questions from anon;
revoke all on public.exam_attempts from anon;
revoke all on public.professional_registrations from anon;

grant select on public.exams to authenticated;
-- Não conceder SELECT direto em exam_questions: a resposta correta mora nesta tabela.
grant select on public.exam_attempts to authenticated;
grant select on public.professional_registrations to authenticated;

drop policy if exists exams_published_select on public.exams;
create policy exams_published_select
on public.exams
for select
to authenticated
using (status = 'published' and is_active = true);

drop policy if exists exam_attempts_own_select on public.exam_attempts;
create policy exam_attempts_own_select
on public.exam_attempts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists professional_registrations_own_select on public.professional_registrations;
create policy professional_registrations_own_select
on public.professional_registrations
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.get_published_exam(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exam public.exams%rowtype;
  v_questions jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
    into v_exam
  from public.exams
  where slug = p_slug
    and status = 'published'
    and is_active = true
  limit 1;

  if v_exam.id is null then
    raise exception 'EXAM_NOT_FOUND';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'number', q.question_number,
        'area', q.area,
        'prompt', q.prompt,
        'options', q.options,
        'difficulty', q.difficulty
      )
      order by q.sort_order, q.question_number
    ),
    '[]'::jsonb
  )
  into v_questions
  from public.exam_questions q
  where q.exam_id = v_exam.id;

  return jsonb_build_object(
    'id', v_exam.id,
    'slug', v_exam.slug,
    'title', v_exam.title,
    'examType', v_exam.exam_type,
    'editionNumber', v_exam.edition_number,
    'year', v_exam.year,
    'officialAppliedDate', v_exam.official_applied_date,
    'sourceKind', v_exam.source_kind,
    'sourceLabel', v_exam.source_label,
    'questionCount', v_exam.question_count,
    'passingScore', v_exam.passing_score,
    'durationMinutes', v_exam.duration_minutes,
    'simulationNotice', v_exam.simulation_notice,
    'disclaimer', v_exam.disclaimer,
    'metadata', v_exam.metadata,
    'questions', v_questions
  );
end;
$$;

revoke all on function public.get_published_exam(text) from public;
grant execute on function public.get_published_exam(text) to authenticated;

create or replace function public.submit_exam_attempt(
  p_exam_slug text,
  p_answers jsonb,
  p_duration_seconds integer default 0,
  p_career_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_exam public.exams%rowtype;
  v_score integer := 0;
  v_total integer := 0;
  v_passed boolean := false;
  v_attempt_id uuid;
  v_registration_code text := null;
  v_q record;
  v_answer text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'ANSWERS_MUST_BE_OBJECT';
  end if;

  if p_duration_seconds is null or p_duration_seconds < 0 then
    p_duration_seconds := 0;
  end if;

  select *
    into v_exam
  from public.exams
  where slug = p_exam_slug
    and status = 'published'
    and is_active = true
  limit 1;

  if v_exam.id is null then
    raise exception 'EXAM_NOT_FOUND';
  end if;

  if p_career_id is not null and not exists (
    select 1 from public.careers
    where id = p_career_id and user_id = v_uid
  ) then
    raise exception 'CAREER_NOT_OWNED';
  end if;

  for v_q in
    select id, question_number, correct_option
    from public.exam_questions
    where exam_id = v_exam.id
    order by question_number
  loop
    v_total := v_total + 1;
    v_answer := upper(coalesce(p_answers ->> (v_q.id::text), ''));
    if v_answer = v_q.correct_option then
      v_score := v_score + 1;
    end if;
  end loop;

  if v_total <> v_exam.question_count then
    raise exception 'EXAM_QUESTION_COUNT_MISMATCH';
  end if;

  v_passed := v_score >= v_exam.passing_score;

  insert into public.exam_attempts (
    exam_id, user_id, career_id, started_at, submitted_at,
    duration_seconds, score, total_questions, passed, answers, metadata
  )
  values (
    v_exam.id, v_uid, p_career_id,
    now() - make_interval(secs => least(p_duration_seconds, 86400)),
    now(), p_duration_seconds, v_score, v_total, v_passed, p_answers,
    jsonb_build_object('source', 'game', 'examSlug', v_exam.slug)
  )
  returning id into v_attempt_id;

  if v_passed then
    select pr.registration_code
      into v_registration_code
    from public.professional_registrations pr
    where pr.user_id = v_uid
      and pr.registration_type = 'OAB_SIMULADA'
      and pr.source_exam_id = v_exam.id
    order by pr.issued_at desc
    limit 1;

    if v_registration_code is null then
      v_registration_code :=
        'OAB-JOGO-' || coalesce(v_exam.edition_number::text, v_exam.year::text) || '-' ||
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

      insert into public.professional_registrations (
        user_id, career_id, registration_type, registration_code,
        source_exam_id, exam_score, is_simulated, metadata
      )
      values (
        v_uid, p_career_id, 'OAB_SIMULADA', v_registration_code,
        v_exam.id, v_score, true,
        jsonb_build_object(
          'disclaimer', 'Registro fictício do personagem dentro do Rota da Justiça. Não equivale a inscrição profissional real na OAB.',
          'examTitle', v_exam.title
        )
      );
    end if;

    if p_career_id is not null then
      update public.careers
      set career_stage = case
            when career_stage = 'ESTAGIARIO_SENIOR' then 'ADVOGADO_CONTRATADO'
            else career_stage
          end,
          oab_exam_passed = true,
          oab_exam_score = greatest(coalesce(oab_exam_score, 0), v_score),
          oab_registration_code = coalesce(oab_registration_code, v_registration_code),
          oab_exam_passed_at = coalesce(oab_exam_passed_at, now()),
          last_played_at = now()
      where id = p_career_id
        and user_id = v_uid;

      insert into public.career_events (
        career_id, user_id, event_type, title, description, metadata
      )
      values (
        p_career_id, v_uid, 'OAB_EXAM_PASSED',
        'Aprovação no Exame da Ordem',
        'O personagem foi aprovado no simulado profissional obrigatório e desbloqueou a carreira de Advogado Contratado.',
        jsonb_build_object(
          'examId', v_exam.id,
          'examSlug', v_exam.slug,
          'score', v_score,
          'registrationCode', v_registration_code,
          'isSimulated', true
        )
      );
    end if;
  end if;

  return jsonb_build_object(
    'attemptId', v_attempt_id,
    'score', v_score,
    'totalQuestions', v_total,
    'passingScore', v_exam.passing_score,
    'passed', v_passed,
    'registrationCode', v_registration_code,
    'isSimulatedRegistration', v_passed,
    'examTitle', v_exam.title
  );
end;
$$;

revoke all on function public.submit_exam_attempt(text, jsonb, integer, uuid) from public;
grant execute on function public.submit_exam_attempt(text, jsonb, integer, uuid) to authenticated;

commit;
