-- Ajustes runtime da progressão: preserva OAB sem career_id e expõe catálogo de avaliações elegíveis.

begin;

create or replace function public.get_available_progression_exams(p_career_id uuid)
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
    'id', e.id,
    'slug', e.slug,
    'title', e.title,
    'examType', e.exam_type,
    'targetLevel', e.target_level,
    'questionCount', e.question_count,
    'passingScore', e.passing_score,
    'durationMinutes', e.duration_minutes,
    'sourceKind', e.source_kind,
    'simulationNotice', e.simulation_notice,
    'eligible', case
      when e.exam_type = 'mestrado' then e.target_level = v_career.master_level + 1
      when e.exam_type = 'doutorado' then e.target_level = v_career.doctorate_level + 1
      when e.exam_type in ('concurso_juiz','concurso_desembargador') then v_career.doctorate_level >= 4
      when e.exam_type = 'oab_first_phase' then v_career.career_stage = 'ESTAGIARIO_SENIOR' and not v_career.oab_exam_passed
      else false
    end,
    'currentMasterLevel', v_career.master_level,
    'currentDoctorateLevel', v_career.doctorate_level,
    'careerStage', v_career.career_stage
  ) order by e.created_at desc), '[]'::jsonb)
  into v_result
  from public.exams e
  where e.status = 'published'
    and e.is_active = true
    and e.exam_type in ('oab_first_phase','mestrado','doutorado','concurso_juiz','concurso_desembargador');

  return v_result;
end;
$$;

revoke all on function public.get_available_progression_exams(uuid) from public;
grant execute on function public.get_available_progression_exams(uuid) to authenticated;

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
  v_has_career boolean := false;
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
    v_has_career := true;
  end if;

  if v_exam.exam_type in ('mestrado','doutorado','concurso_juiz','concurso_desembargador') and not v_has_career then
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

  if v_passed then
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

      if v_has_career then
        update public.careers
        set career_stage = case when career_stage = 'ESTAGIARIO_SENIOR' then 'ADVOGADO_CONTRATADO' else career_stage end,
            oab_exam_passed = true,
            oab_exam_score = greatest(coalesce(oab_exam_score,0),v_score),
            oab_registration_code = coalesce(oab_registration_code,v_registration_code),
            oab_exam_passed_at = coalesce(oab_exam_passed_at,now()),
            last_played_at = now()
        where id = p_career_id and user_id = v_uid;
      end if;
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

    if v_has_career then
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
