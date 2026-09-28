begin;
alter table public.careers add column if not exists public_service_career jsonb not null default '{"track":null,"startedMonth":null,"monthsInRole":0,"lastServiceMonth":null,"decisions":0,"merit":0,"discipline":100,"promotionKeys":[]}'::jsonb;

create or replace function public.submit_public_career_exam(
 p_exam_slug text,p_answers jsonb,p_duration_seconds integer,p_career_id uuid,p_opportunity_id text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_exam public.exams%rowtype;v_career public.careers%rowtype;v_state jsonb;v_active jsonb;v_q record;v_answer text;v_score int:=0;v_total int:=0;v_passed boolean:=false;v_attempt uuid;v_stage text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_career from public.careers where id=p_career_id and user_id=v_uid;
 if v_career.id is null then raise exception 'CAREER_NOT_OWNED'; end if;
 v_state:=coalesce(v_career.public_career_opportunities,'{}'::jsonb);v_active:=v_state->'active';
 if v_active is null or v_active->>'id'<>p_opportunity_id or v_active->>'status'<>'ENROLLED' then raise exception 'PUBLIC_OPPORTUNITY_NOT_ENROLLED';end if;
 select * into v_exam from public.exams where slug=p_exam_slug and status='published' and is_active=true and exam_type=v_active->>'examType' limit 1;
 if v_exam.id is null then raise exception 'PUBLIC_EXAM_NOT_PUBLISHED';end if;
 if coalesce((v_state->>'legalPracticeMonths')::int,0)<36 then raise exception 'LEGAL_PRACTICE_3_YEARS_REQUIRED';end if;
 for v_q in select id,correct_option from public.exam_questions where exam_id=v_exam.id order by question_number loop
  v_total:=v_total+1;v_answer:=upper(coalesce(p_answers->>(v_q.id::text),''));if v_answer=v_q.correct_option then v_score:=v_score+1;end if;
 end loop;
 if v_total<>v_exam.question_count then raise exception 'EXAM_QUESTION_COUNT_MISMATCH';end if;
 v_passed:=v_score>=v_exam.passing_score;
 insert into public.exam_attempts(exam_id,user_id,career_id,started_at,submitted_at,duration_seconds,score,total_questions,passed,answers,metadata)
 values(v_exam.id,v_uid,p_career_id,now()-make_interval(secs=>least(greatest(p_duration_seconds,0),86400)),now(),greatest(p_duration_seconds,0),v_score,v_total,v_passed,p_answers,jsonb_build_object('source','public-career','opportunityId',p_opportunity_id))
 returning id into v_attempt;
 if v_passed then
  v_stage:=case v_exam.exam_type when 'concurso_juiz' then 'MAGISTRADO_SUBSTITUTO' when 'concurso_promotor' then 'PROMOTOR_SUBSTITUTO' else null end;
  if v_stage is null then raise exception 'UNSUPPORTED_PUBLIC_EXAM';end if;
  update public.careers set career_stage=v_stage,
   public_service_career=jsonb_build_object('track',case when v_stage='MAGISTRADO_SUBSTITUTO' then 'MAGISTRACY' else 'PROSECUTION' end,'startedMonth',v_active->>'examMonth','monthsInRole',0,'lastServiceMonth',null,'decisions',0,'merit',0,'discipline',100,'promotionKeys','[]'::jsonb),
   public_career_opportunities=jsonb_set(jsonb_set(v_state,'{active}','null'::jsonb,true),'{history}',coalesce(v_state->'history','[]'::jsonb)||jsonb_build_array(jsonb_build_object('id',p_opportunity_id,'kind',v_active->>'kind','status','PASSED','month',v_active->>'examMonth')),true),last_played_at=now()
  where id=p_career_id and user_id=v_uid;
 else
  update public.careers set public_career_opportunities=jsonb_set(jsonb_set(v_state,'{active}','null'::jsonb,true),'{history}',coalesce(v_state->'history','[]'::jsonb)||jsonb_build_array(jsonb_build_object('id',p_opportunity_id,'kind',v_active->>'kind','status','FAILED','month',v_active->>'examMonth')),true),last_played_at=now() where id=p_career_id and user_id=v_uid;
 end if;
 return jsonb_build_object('attemptId',v_attempt,'score',v_score,'totalQuestions',v_total,'passingScore',v_exam.passing_score,'passed',v_passed,'examTitle',v_exam.title,'examType',v_exam.exam_type,'newCareerStage',v_stage);
end$$;
revoke all on function public.submit_public_career_exam(text,jsonb,integer,uuid,text) from public;
grant execute on function public.submit_public_career_exam(text,jsonb,integer,uuid,text) to authenticated;

-- bloqueia a promoção legada direta por concurso para desembargador no RPC antigo
create or replace function public.guard_no_direct_appellate_exam() returns trigger language plpgsql as $$
begin if new.exam_type='concurso_desembargador' and new.is_active=true then raise exception 'DIRECT_APPELLATE_EXAM_DISABLED';end if;return new;end$$;
drop trigger if exists trg_no_direct_appellate_exam on public.exams;
create trigger trg_no_direct_appellate_exam before insert or update on public.exams for each row execute function public.guard_no_direct_appellate_exam();
commit;