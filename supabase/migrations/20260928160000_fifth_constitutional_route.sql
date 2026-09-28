begin;
create or replace function public.accept_fifth_constitutional(p_career_id uuid,p_opportunity_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_c public.careers%rowtype;v_s jsonb;v_a jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_c from public.careers where id=p_career_id and user_id=v_uid;
 if v_c.id is null then raise exception 'CAREER_NOT_OWNED';end if;
 v_s:=v_c.public_career_opportunities;v_a:=v_s->'active';
 if v_a is null or v_a->>'id'<>p_opportunity_id or v_a->>'kind'<>'FIFTH_ADVOCACY' or v_a->>'status'<>'ENROLLED' then raise exception 'FIFTH_OPPORTUNITY_NOT_ENROLLED';end if;
 if coalesce((v_s->>'legalPracticeMonths')::int,0)<120 then raise exception 'TEN_YEARS_REQUIRED';end if;
 if v_c.reputation<85 then raise exception 'REPUTATION_REQUIRED';end if;
 update public.careers set career_stage='DESEMBARGADOR',public_service_career=jsonb_build_object('track','MAGISTRACY','startedMonth',v_a->>'examMonth','monthsInRole',0,'lastServiceMonth',null,'decisions',0,'merit',75,'discipline',100,'promotionKeys',jsonb_build_array('FIFTH_ADVOCACY')),public_career_opportunities=jsonb_set(v_s,'{active}','null'::jsonb,true),last_played_at=now() where id=p_career_id and user_id=v_uid;
 return jsonb_build_object('passed',true,'newCareerStage','DESEMBARGADOR','route','FIFTH_ADVOCACY');
end$$;
revoke all on function public.accept_fifth_constitutional(uuid,text) from public;grant execute on function public.accept_fifth_constitutional(uuid,text) to authenticated;
commit;