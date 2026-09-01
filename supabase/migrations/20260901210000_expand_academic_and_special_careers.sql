-- Rota da Justiça - progressão acadêmica avançada, concursos e carreiras especiais
-- Mestrado/Doutorado com 5 níveis, concursos de Juiz/Desembargador e convites institucionais.

begin;

alter table public.careers
  add column if not exists master_level smallint not null default 0,
  add column if not exists doctorate_level smallint not null default 0;

alter table public.careers drop constraint if exists careers_master_level_range;
alter table public.careers add constraint careers_master_level_range
  check (master_level between 0 and 5);

alter table public.careers drop constraint if exists careers_doctorate_level_range;
alter table public.careers add constraint careers_doctorate_level_range
  check (doctorate_level between 0 and 5);

create table if not exists public.exam_blueprints (
  id text primary key,
  title text not null,
  description text not null default '',
  question_count integer not null,
  target_kind text not null,
  max_target_level smallint,
  eligibility_rules jsonb not null default '{}'::jsonb,
  generation_instructions text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_blueprints_question_count_positive check (question_count > 0),
  constraint exam_blueprints_target_kind_valid check (target_kind in ('career_unlock','academic_track','public_exam')),
  constraint exam_blueprints_max_level_valid check (max_target_level is null or max_target_level between 1 and 5),
  constraint exam_blueprints_eligibility_object check (jsonb_typeof(eligibility_rules) = 'object'),
  constraint exam_blueprints_metadata_object check (jsonb_typeof(metadata) = 'object')
);

insert into public.exam_blueprints (
  id, title, description, question_count, target_kind, max_target_level,
  eligibility_rules, generation_instructions, sort_order, metadata
)
values
  (
    'oab_first_phase',
    'Exame da Ordem - 1ª Fase',
    'Marco obrigatório para a transição de Estagiário Sênior para Advogado Contratado.',
    80,
    'career_unlock',
    null,
    '{"careerStage":"ESTAGIARIO_SENIOR"}'::jsonb,
    'Simulado objetivo de conhecimentos jurídicos gerais. Quando gerado por IA, nunca deve ser rotulado como prova oficial.',
    10,
    '{"fixedReference":"46º EOU 2026"}'::jsonb
  ),
  (
    'mestrado',
    'Exame de Progressão do Mestrado',
    'Avaliação acadêmica com 40 questões para progressão sequencial entre os níveis 1 e 5 do Mestrado.',
    40,
    'academic_track',
    5,
    '{}'::jsonb,
    'Crie questões acadêmicas de Direito com leitura crítica, teoria, metodologia, jurisprudência e pesquisa. O administrador define o tema e o corte.',
    20,
    '{"levels":5}'::jsonb
  ),
  (
    'doutorado',
    'Exame de Progressão do Doutorado',
    'Avaliação acadêmica avançada com 40 questões para progressão sequencial entre os níveis 1 e 5 do Doutorado.',
    40,
    'academic_track',
    5,
    '{}'::jsonb,
    'Crie questões avançadas de Direito, pesquisa jurídica, teoria, precedentes, argumentação e problemas complexos. O administrador define o tema e o corte.',
    30,
    '{"levels":5}'::jsonb
  ),
  (
    'concurso_juiz',
    'Concurso para Juiz',
    'Prova objetiva de 20 questões. Só pode ser prestada com Doutorado em nível superior a 3.',
    20,
    'public_exam',
    null,
    '{"minDoctorateLevel":4}'::jsonb,
    'Crie questões complexas compatíveis com seleção para a magistratura, com problemas jurídicos e processuais variados.',
    40,
    '{}'::jsonb
  ),
  (
    'concurso_desembargador',
    'Concurso para Desembargador',
    'Prova objetiva de 20 questões. Só pode ser prestada com Doutorado em nível superior a 3.',
    20,
    'public_exam',
    null,
    '{"minDoctorateLevel":4}'::jsonb,
    'Crie questões de alta complexidade, recursos, precedentes, colegialidade e interpretação jurídica compatíveis com o nível de tribunal.',
    50,
    '{}'::jsonb
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  question_count = excluded.question_count,
  target_kind = excluded.target_kind,
  max_target_level = excluded.max_target_level,
  eligibility_rules = excluded.eligibility_rules,
  generation_instructions = excluded.generation_instructions,
  is_active = true,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = now();

alter table public.exams
  add column if not exists blueprint_id text references public.exam_blueprints(id) on delete restrict,
  add column if not exists target_level smallint,
  add column if not exists eligibility_rules jsonb not null default '{}'::jsonb;

alter table public.exams drop constraint if exists exams_target_level_range;
alter table public.exams add constraint exams_target_level_range
  check (target_level is null or target_level between 1 and 5);

alter table public.exams drop constraint if exists exams_eligibility_rules_object;
alter table public.exams add constraint exams_eligibility_rules_object
  check (jsonb_typeof(eligibility_rules) = 'object');

update public.exams
set blueprint_id = 'oab_first_phase'
where exam_type = 'oab_first_phase'
  and blueprint_id is null;

create table if not exists public.special_career_definitions (
  id text primary key,
  title text not null,
  description text not null default '',
  min_master_level smallint not null default 0,
  min_doctorate_level smallint not null default 0,
  min_reputation integer not null default 0,
  term_years smallint not null,
  end_behavior text not null,
  next_possible_roles jsonb not null default '[]'::jsonb,
  status text not null default 'planned',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint special_career_master_level_range check (min_master_level between 0 and 5),
  constraint special_career_doctorate_level_range check (min_doctorate_level between 0 and 5),
  constraint special_career_reputation_range check (min_reputation between 0 and 100),
  constraint special_career_term_positive check (term_years > 0),
  constraint special_career_end_behavior_valid check (end_behavior in ('offer_retirement','possible_transition','return_to_advocacy','retire')),
  constraint special_career_next_roles_array check (jsonb_typeof(next_possible_roles) = 'array'),
  constraint special_career_status_valid check (status in ('planned','published','archived')),
  constraint special_career_metadata_object check (jsonb_typeof(metadata) = 'object')
);

insert into public.special_career_definitions (
  id, title, description, min_master_level, min_doctorate_level, min_reputation,
  term_years, end_behavior, next_possible_roles, status, sort_order, metadata
)
values
  (
    'MINISTRO_STF',
    'Ministro do STF',
    'Cargo especial por convite. Exige nível superior a Mestrado 3 e reputação superior a 85%.',
    4, 0, 86, 5, 'offer_retirement', '[]'::jsonb, 'planned', 10,
    '{"afterTerm":"Perguntar ao jogador se deseja se aposentar.","module":"future"}'::jsonb
  ),
  (
    'MINISTRO_STE',
    'Ministro do STE',
    'Cargo especial por convite. Exige nível superior a Mestrado 3 e reputação superior a 85%. Após cinco anos pode surgir convite ao STF conforme reputação.',
    4, 0, 86, 5, 'possible_transition', '["MINISTRO_STF"]'::jsonb, 'planned', 20,
    '{"afterTerm":"Pode receber convite para o STF dependendo da reputação.","module":"future","labelKeptAsRequested":true}'::jsonb
  ),
  (
    'MINISTRO_JUSTICA',
    'Ministro da Justiça',
    'Cargo especial por convite. Exige nível superior a Mestrado 3 e reputação superior a 55%.',
    4, 0, 56, 4, 'return_to_advocacy', '["MINISTRO_STF","MINISTRO_STE"]'::jsonb, 'planned', 30,
    '{"afterTerm":"Retorna à rotina como advogado com sua progressão acadêmica preservada e pode receber convite para STF ou STE.","module":"future"}'::jsonb
  ),
  (
    'PGR',
    'Procurador-Geral da República',
    'Cargo especial por convite. Exige nível superior a Mestrado 2 e reputação superior a 85%.',
    3, 0, 86, 5, 'retire', '[]'::jsonb, 'planned', 40,
    '{"afterTerm":"Aposentadoria após o período no cargo.","module":"future"}'::jsonb
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  min_master_level = excluded.min_master_level,
  min_doctorate_level = excluded.min_doctorate_level,
  min_reputation = excluded.min_reputation,
  term_years = excluded.term_years,
  end_behavior = excluded.end_behavior,
  next_possible_roles = excluded.next_possible_roles,
  status = excluded.status,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = now();

create table if not exists public.special_career_assignments (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.careers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  special_career_id text not null references public.special_career_definitions(id) on delete restrict,
  state text not null default 'invited',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_game_year integer,
  term_years smallint not null,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint special_career_assignment_state_valid check (state in ('invited','active','completed','retired','declined')),
  constraint special_career_assignment_term_positive check (term_years > 0),
  constraint special_career_assignment_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_special_career_assignments_owner
  on public.special_career_assignments(user_id, career_id, state);

create index if not exists idx_special_career_assignments_role
  on public.special_career_assignments(special_career_id, state);

alter table public.exam_blueprints enable row level security;
alter table public.special_career_definitions enable row level security;
alter table public.special_career_assignments enable row level security;

grant select on public.exam_blueprints to authenticated;
grant select on public.special_career_definitions to authenticated;
grant select on public.special_career_assignments to authenticated;

drop policy if exists exam_blueprints_authenticated_select on public.exam_blueprints;
create policy exam_blueprints_authenticated_select
on public.exam_blueprints for select to authenticated
using (is_active = true);

drop policy if exists special_career_definitions_authenticated_select on public.special_career_definitions;
create policy special_career_definitions_authenticated_select
on public.special_career_definitions for select to authenticated
using (is_active = true);

drop policy if exists special_career_assignments_own_select on public.special_career_assignments;
create policy special_career_assignments_own_select
on public.special_career_assignments for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.get_special_career_eligibility(p_career_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_career public.careers%rowtype;
  v_result jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_career
  from public.careers
  where id = p_career_id and user_id = v_uid;

  if v_career.id is null then raise exception 'CAREER_NOT_OWNED'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'title', d.title,
    'minMasterLevel', d.min_master_level,
    'minDoctorateLevel', d.min_doctorate_level,
    'minReputation', d.min_reputation,
    'termYears', d.term_years,
    'endBehavior', d.end_behavior,
    'nextPossibleRoles', d.next_possible_roles,
    'status', d.status,
    'eligible', (
      v_career.master_level >= d.min_master_level
      and v_career.doctorate_level >= d.min_doctorate_level
      and v_career.reputation >= d.min_reputation
    ),
    'requirements', jsonb_build_object(
      'currentMasterLevel', v_career.master_level,
      'currentDoctorateLevel', v_career.doctorate_level,
      'currentReputation', v_career.reputation
    )
  ) order by d.sort_order), '[]'::jsonb)
  into v_result
  from public.special_career_definitions d
  where d.is_active = true and d.status <> 'archived';

  return v_result;
end;
$$;

revoke all on function public.get_special_career_eligibility(uuid) from public;
grant execute on function public.get_special_career_eligibility(uuid) to authenticated;

-- Amplia a leitura do exame com dados de progressão sem expor o gabarito.
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
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_exam
  from public.exams
  where slug = p_slug and status = 'published' and is_active = true
  limit 1;

  if v_exam.id is null then raise exception 'EXAM_NOT_FOUND'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'number', q.question_number,
    'area', q.area,
    'prompt', q.prompt,
    'options', q.options,
    'difficulty', q.difficulty
  ) order by q.sort_order, q.question_number), '[]'::jsonb)
  into v_questions
  from public.exam_questions q
  where q.exam_id = v_exam.id;

  return jsonb_build_object(
    'id', v_exam.id,
    'slug', v_exam.slug,
    'title', v_exam.title,
    'examType', v_exam.exam_type,
    'blueprintId', v_exam.blueprint_id,
    'targetLevel', v_exam.target_level,
    'eligibilityRules', v_exam.eligibility_rules,
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

-- Correção server-side genérica. O navegador continua sem acesso a correct_option.
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
  v_career public.careers%rowtype;
  v_score integer := 0;
  v_total integer := 0;
  v_passed boolean := false;
  v_attempt_id uuid;
  v_registration_code text := null;
  v_q record;
  v_answer text;
  v_new_master_level integer := null;
  v_new_doctorate_level integer := null;
  v_new_career_stage text := null;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'ANSWERS_MUST_BE_OBJECT'; end if;
  if p_duration_seconds is null or p_duration_seconds < 0 then p_duration_seconds := 0; end if;

  select * into v_exam
  from public.exams
  where slug = p_exam_slug and status = 'published' and is_active = true
  limit 1;
  if v_exam.id is null then raise exception 'EXAM_NOT_FOUND'; end if;

  if p_career_id is not null then
    select * into v_career
    from public.careers
    where id = p_career_id and user_id = v_uid;
    if v_career.id is null then raise exception 'CAREER_NOT_OWNED'; end if;
  elsif v_exam.exam_type in ('mestrado','doutorado','concurso_juiz','concurso_desembargador') then
    raise exception 'CAREER_REQUIRED_FOR_PROGRESSION_EXAM';
  end if;

  if v_exam.exam_type = 'mestrado' then
    if v_exam.target_level is null then raise exception 'TARGET_LEVEL_REQUIRED'; end if;
    if v_career.master_level <> v_exam.target_level - 1 then raise exception 'MASTER_LEVEL_SEQUENCE_REQUIRED'; end if;
  elsif v_exam.exam_type = 'doutorado' then
    if v_exam.target_level is null then raise exception 'TARGET_LEVEL_REQUIRED'; end if;
    if v_career.doctorate_level <> v_exam.target_level - 1 then raise exception 'DOCTORATE_LEVEL_SEQUENCE_REQUIRED'; end if;
  elsif v_exam.exam_type in ('concurso_juiz','concurso_desembargador') then
    if v_career.doctorate_level < 4 then raise exception 'DOCTORATE_LEVEL_4_REQUIRED'; end if;
  end if;

  for v_q in
    select id, question_number, correct_option
    from public.exam_questions
    where exam_id = v_exam.id
    order by question_number
  loop
    v_total := v_total + 1;
    v_answer := upper(coalesce(p_answers ->> (v_q.id::text), ''));
    if v_answer = v_q.correct_option then v_score := v_score + 1; end if;
  end loop;

  if v_total <> v_exam.question_count then raise exception 'EXAM_QUESTION_COUNT_MISMATCH'; end if;
  v_passed := v_score >= v_exam.passing_score;

  insert into public.exam_attempts (
    exam_id, user_id, career_id, started_at, submitted_at,
    duration_seconds, score, total_questions, passed, answers, metadata
  ) values (
    v_exam.id, v_uid, p_career_id,
    now() - make_interval(secs => least(p_duration_seconds, 86400)),
    now(), p_duration_seconds, v_score, v_total, v_passed, p_answers,
    jsonb_build_object('source','game','examSlug',v_exam.slug,'examType',v_exam.exam_type,'targetLevel',v_exam.target_level)
  ) returning id into v_attempt_id;

  if v_passed and p_career_id is not null then
    if v_exam.exam_type = 'oab_first_phase' then
      select pr.registration_code into v_registration_code
      from public.professional_registrations pr
      where pr.user_id = v_uid
        and pr.registration_type = 'OAB_SIMULADA'
        and pr.source_exam_id = v_exam.id
      order by pr.issued_at desc limit 1;

      if v_registration_code is null then
        v_registration_code := 'OAB-JOGO-' || coalesce(v_exam.edition_number::text, v_exam.year::text) || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
        insert into public.professional_registrations (
          user_id, career_id, registration_type, registration_code,
          source_exam_id, exam_score, is_simulated, metadata
        ) values (
          v_uid, p_career_id, 'OAB_SIMULADA', v_registration_code,
          v_exam.id, v_score, true,
          jsonb_build_object('disclaimer','Registro fictício do personagem dentro do Rota da Justiça. Não equivale a inscrição profissional real na OAB.','examTitle',v_exam.title)
        );
      end if;

      update public.careers
      set career_stage = case when career_stage = 'ESTAGIARIO_SENIOR' then 'ADVOGADO_CONTRATADO' else career_stage end,
          oab_exam_passed = true,
          oab_exam_score = greatest(coalesce(oab_exam_score,0),v_score),
          oab_registration_code = coalesce(oab_registration_code,v_registration_code),
          oab_exam_passed_at = coalesce(oab_exam_passed_at,now()),
          last_played_at = now()
      where id = p_career_id and user_id = v_uid;
      v_new_career_stage := 'ADVOGADO_CONTRATADO';

    elsif v_exam.exam_type = 'mestrado' then
      update public.careers
      set master_level = greatest(master_level, v_exam.target_level),
          academic_degree = 'MESTRE',
          last_played_at = now()
      where id = p_career_id and user_id = v_uid;
      v_new_master_level := v_exam.target_level;

    elsif v_exam.exam_type = 'doutorado' then
      update public.careers
      set doctorate_level = greatest(doctorate_level, v_exam.target_level),
          academic_degree = 'DOUTOR',
          last_played_at = now()
      where id = p_career_id and user_id = v_uid;
      v_new_doctorate_level := v_exam.target_level;

    elsif v_exam.exam_type = 'concurso_juiz' then
      update public.careers
      set career_stage = 'MAGISTRADO_SUBSTITUTO', last_played_at = now()
      where id = p_career_id and user_id = v_uid;
      v_new_career_stage := 'MAGISTRADO_SUBSTITUTO';

    elsif v_exam.exam_type = 'concurso_desembargador' then
      update public.careers
      set career_stage = 'DESEMBARGADOR', last_played_at = now()
      where id = p_career_id and user_id = v_uid;
      v_new_career_stage := 'DESEMBARGADOR';
    end if;

    insert into public.career_events (
      career_id, user_id, event_type, title, description, metadata
    ) values (
      p_career_id,
      v_uid,
      upper(v_exam.exam_type) || '_PASSED',
      'Aprovação: ' || v_exam.title,
      'O personagem foi aprovado em uma avaliação de progressão.',
      jsonb_build_object('examId',v_exam.id,'examSlug',v_exam.slug,'examType',v_exam.exam_type,'score',v_score,'targetLevel',v_exam.target_level)
    );
  end if;

  return jsonb_build_object(
    'attemptId', v_attempt_id,
    'score', v_score,
    'totalQuestions', v_total,
    'passingScore', v_exam.passing_score,
    'passed', v_passed,
    'registrationCode', v_registration_code,
    'isSimulatedRegistration', (v_registration_code is not null),
    'examTitle', v_exam.title,
    'examType', v_exam.exam_type,
    'targetLevel', v_exam.target_level,
    'newMasterLevel', v_new_master_level,
    'newDoctorateLevel', v_new_doctorate_level,
    'newCareerStage', v_new_career_stage
  );
end;
$$;

revoke all on function public.submit_exam_attempt(text, jsonb, integer, uuid) from public;
grant execute on function public.submit_exam_attempt(text, jsonb, integer, uuid) to authenticated;

commit;
