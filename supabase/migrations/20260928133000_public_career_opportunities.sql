begin;
alter table public.careers add column if not exists public_career_opportunities jsonb not null default '{"lastRollMonth":null,"nextEligibleMonth":null,"active":null,"history":[],"legalPracticeMonths":0,"lastPracticeMonth":null}'::jsonb;
alter table public.careers drop constraint if exists careers_public_career_opportunities_object;
alter table public.careers add constraint careers_public_career_opportunities_object check(jsonb_typeof(public_career_opportunities)='object');

insert into public.exam_blueprints(id,title,description,question_count,target_kind,eligibility_rules,generation_instructions,is_active,sort_order,metadata)
values('concurso_promotor','Concurso para Promotor de Justiça','Ingresso na carreira do Ministério Público por concurso de provas e títulos.',20,'public_exam','{"minLegalPracticeYears":3}'::jsonb,'Crie questões complexas compatíveis com ingresso no Ministério Público, cobrindo Direito Constitucional, Penal, Processo Penal, Civil, Processo Civil, Administrativo e tutela coletiva.',true,45,'{"careerStageOnPass":"PROMOTOR_SUBSTITUTO"}'::jsonb)
on conflict(id) do update set title=excluded.title,description=excluded.description,eligibility_rules=excluded.eligibility_rules,generation_instructions=excluded.generation_instructions,is_active=true,metadata=excluded.metadata,updated_at=now();

update public.exam_blueprints
set eligibility_rules='{"minLegalPracticeYears":3}'::jsonb,
description='Ingresso na Magistratura por concurso de provas e títulos. Exige três anos de atividade jurídica no sistema de carreira.',
updated_at=now()
where id='concurso_juiz';

update public.exam_blueprints set is_active=false,updated_at=now() where id='concurso_desembargador';
commit;