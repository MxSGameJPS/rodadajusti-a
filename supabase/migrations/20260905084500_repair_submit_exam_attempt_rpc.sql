-- Rota da Justiça — reparo da RPC de finalização do Exame da Ordem
-- Reafirma a assinatura com p_mode usada pelo cliente atual, remove a sobrecarga
-- legada sem modo e força o PostgREST a recarregar o schema cache.

begin;

-- Remove a assinatura legada para impedir que regras antigas de nota/recompensa
-- sejam usadas por clientes desatualizados ou por resolução ambígua do PostgREST.
drop function if exists public.submit_exam_attempt(text, jsonb, integer, uuid);

-- Mantém o catálogo coerente com as regras atuais do modo completo.
update public.exams
set passing_score = 50,
    duration_minutes = 180,
    updated_at = now()
where slug = 'oab-46-2026-tipo-1'
  and exam_type = 'oab_first_phase';

create or replace function public.submit_exam_attempt(
  p_exam_slug text,
  p_answers jsonb,
  p_duration_seconds integer default 0,
  p_career_id uuid default null,
  p_mode text default 'full'
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
  v_career_id uuid := p_career_id;
  v_has_career boolean := false;
  v_was_oab_passed boolean := false;
  v_mode text := lower(trim(coalesce(p_mode, 'full')));
  v_score integer := 0;
  v_total integer := 0;
  v_expected_total integer := 0;
  v_passing_score integer := 0;
  v_duration_limit_seconds integer := 0;
  v_passed boolean := false;
  v_attempt_id uuid;
  v_registration_code text := null;
  v_q record;
  v_answer text;
  v_new_master_level integer := null;
  v_new_doctorate_level integer := null;
  v_new_career_stage text := null;
  v_reward_amount bigint := 0;
  v_reward_granted boolean := false;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'ANSWERS_MUST_BE_OBJECT'; end if;
  if p_duration_seconds is null or p_duration_seconds < 0 then p_duration_seconds := 0; end if;
  if v_mode not in ('full', 'quick') then raise exception 'INVALID_EXAM_MODE'; end if;

  select * into v_exam
  from public.exams
  where slug = p_exam_slug and status = 'published' and is_active = true
  limit 1;
  if v_exam.id is null then raise exception 'EXAM_NOT_FOUND'; end if;

  if v_mode = 'quick' and v_exam.exam_type <> 'oab_first_phase' then
    raise exception 'QUICK_MODE_ONLY_FOR_OAB';
  end if;

  if v_exam.exam_type = 'oab_first_phase' and v_exam.question_count <> 80 then
    raise exception 'OAB_MODE_REQUIRES_80_QUESTIONS';
  end if;

  if v_career_id is not null then
    select * into v_career
    from public.careers
    where id = v_career_id and user_id = v_uid;
    if v_career.id is null then raise exception 'CAREER_NOT_OWNED'; end if;
    v_has_career := true;
  else
    select * into v_career
    from public.careers
    where user_id = v_uid
    order by last_played_at desc nulls last, created_at desc
    limit 1;

    if v_career.id is not null then
      v_career_id := v_career.id;
      v_has_career := true;
    end if;
  end if;

  if v_has_career then
    v_was_oab_passed := coalesce(v_career.oab_exam_passed, false);
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

  if v_exam.exam_type = 'oab_first_phase' then
    if v_mode = 'quick' then
      v_expected_total := 20;
      v_passing_score := 12;
      v_duration_limit_seconds := 75 * 60;

      for v_q in
        select id, question_number, correct_option
        from public.exam_questions
        where exam_id = v_exam.id
          and mod(question_number - 1, 4) = 0
        order by question_number
        limit 20
      loop
        v_total := v_total + 1;
        v_answer := upper(coalesce(p_answers ->> (v_q.id::text), ''));
        if v_answer = v_q.correct_option then v_score := v_score + 1; end if;
      end loop;
    else
      v_expected_total := 80;
      v_passing_score := 50;
      v_duration_limit_seconds := 3 * 60 * 60;

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
    end if;
  else
    v_expected_total := v_exam.question_count;
    v_passing_score := v_exam.passing_score;
    v_duration_limit_seconds := v_exam.duration_minutes * 60;

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
  end if;

  if v_total <> v_expected_total then raise exception 'EXAM_QUESTION_COUNT_MISMATCH'; end if;
  v_passed := v_score >= v_passing_score;

  insert into public.exam_attempts (
    exam_id, user_id, career_id, started_at, submitted_at,
    duration_seconds, score, total_questions, passed, answers, metadata
  ) values (
    v_exam.id, v_uid, v_career_id,
    now() - make_interval(secs => least(p_duration_seconds, v_duration_limit_seconds)),
    now(), least(p_duration_seconds, v_duration_limit_seconds), v_score, v_total, v_passed, p_answers,
    jsonb_build_object(
      'source','game',
      'examSlug',v_exam.slug,
      'examType',v_exam.exam_type,
      'targetLevel',v_exam.target_level,
      'mode',v_mode,
      'configuredQuestionCount',v_exam.question_count,
      'attemptQuestionCount',v_total,
      'attemptPassingScore',v_passing_score,
      'durationLimitSeconds',v_duration_limit_seconds
    )
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
          v_uid, v_career_id, 'OAB_SIMULADA', v_registration_code,
          v_exam.id, v_score, true,
          jsonb_build_object(
            'disclaimer','Registro fictício do personagem dentro do Rota da Justiça. Não equivale a inscrição profissional real na OAB.',
            'examTitle',v_exam.title,
            'mode',v_mode,
            'score',v_score,
            'totalQuestions',v_total,
            'passingScore',v_passing_score
          )
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
        where id = v_career_id and user_id = v_uid;
        v_new_career_stage := 'ADVOGADO_CONTRATADO';

        if not v_was_oab_passed then
          v_reward_amount := case when v_mode = 'quick' then 2000 else 10000 end;

          insert into public.player_wallets(career_id, currency_id, balance)
          values (v_career_id, 'jures', v_reward_amount)
          on conflict (career_id, currency_id)
          do update set
            balance = public.player_wallets.balance + excluded.balance,
            updated_at = now();

          insert into public.wallet_transactions(
            career_id, currency_id, amount, transaction_type,
            reference_type, reference_id, metadata
          ) values (
            v_career_id,
            'jures',
            v_reward_amount,
            'reward',
            'oab_exam_attempt',
            v_attempt_id::text,
            jsonb_build_object(
              'examSlug',v_exam.slug,
              'examMode',v_mode,
              'score',v_score,
              'totalQuestions',v_total,
              'passingScore',v_passing_score
            )
          );

          v_reward_granted := true;
        end if;
      end if;

    elsif v_exam.exam_type = 'mestrado' then
      update public.careers
      set master_level = greatest(master_level, v_exam.target_level),
          academic_degree = 'MESTRE',
          last_played_at = now()
      where id = v_career_id and user_id = v_uid;
      v_new_master_level := v_exam.target_level;

    elsif v_exam.exam_type = 'doutorado' then
      update public.careers
      set doctorate_level = greatest(doctorate_level, v_exam.target_level),
          academic_degree = 'DOUTOR',
          last_played_at = now()
      where id = v_career_id and user_id = v_uid;
      v_new_doctorate_level := v_exam.target_level;

    elsif v_exam.exam_type = 'concurso_juiz' then
      update public.careers
      set career_stage = 'MAGISTRADO_SUBSTITUTO', last_played_at = now()
      where id = v_career_id and user_id = v_uid;
      v_new_career_stage := 'MAGISTRADO_SUBSTITUTO';

    elsif v_exam.exam_type = 'concurso_desembargador' then
      update public.careers
      set career_stage = 'DESEMBARGADOR', last_played_at = now()
      where id = v_career_id and user_id = v_uid;
      v_new_career_stage := 'DESEMBARGADOR';
    end if;

    if v_has_career then
      insert into public.career_events (
        career_id, user_id, event_type, title, description, metadata
      ) values (
        v_career_id,
        v_uid,
        upper(v_exam.exam_type) || '_PASSED',
        'Aprovação: ' || v_exam.title,
        'O personagem foi aprovado em uma avaliação de progressão.',
        jsonb_build_object(
          'examId',v_exam.id,
          'examSlug',v_exam.slug,
          'examType',v_exam.exam_type,
          'score',v_score,
          'totalQuestions',v_total,
          'passingScore',v_passing_score,
          'mode',v_mode,
          'rewardAmount',v_reward_amount,
          'rewardCurrency','jures',
          'targetLevel',v_exam.target_level
        )
      );
    end if;
  end if;

  return jsonb_build_object(
    'attemptId', v_attempt_id,
    'score', v_score,
    'totalQuestions', v_total,
    'passingScore', v_passing_score,
    'passed', v_passed,
    'registrationCode', v_registration_code,
    'isSimulatedRegistration', (v_registration_code is not null),
    'examTitle', v_exam.title,
    'examType', v_exam.exam_type,
    'examMode', v_mode,
    'durationLimitSeconds', v_duration_limit_seconds,
    'rewardAmount', v_reward_amount,
    'rewardCurrency', 'jures',
    'rewardSymbol', 'JR$',
    'rewardGranted', v_reward_granted,
    'targetLevel', v_exam.target_level,
    'newMasterLevel', v_new_master_level,
    'newDoctorateLevel', v_new_doctorate_level,
    'newCareerStage', v_new_career_stage
  );
end;
$$;

revoke all on function public.submit_exam_attempt(text, jsonb, integer, uuid, text) from public;
grant execute on function public.submit_exam_attempt(text, jsonb, integer, uuid, text) to authenticated;

-- Recarrega a lista de RPCs publicada pelo PostgREST/Supabase API.
select pg_notify('pgrst', 'reload schema');

commit;
