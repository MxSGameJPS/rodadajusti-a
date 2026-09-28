begin;
alter table public.careers add column if not exists academic_career jsonb not null default '{"masterLevel":0,"doctorateLevel":0,"teachingRank":"NONE","institution":null,"weeklyHours":0,"monthlySalary":0,"classesTaught":0,"publications":[],"lastTeachingMonth":null,"processedKeys":[]}'::jsonb;
alter table public.careers drop constraint if exists careers_academic_career_object;
alter table public.careers add constraint careers_academic_career_object check(jsonb_typeof(academic_career)='object');

-- Migra níveis acadêmicos já conquistados para a nova carreira acadêmica sem apagar progresso.
update public.careers
set academic_career=jsonb_set(jsonb_set(academic_career,'{masterLevel}',to_jsonb(master_level),true),'{doctorateLevel}',to_jsonb(doctorate_level),true)
where coalesce((academic_career->>'masterLevel')::int,0)<master_level or coalesce((academic_career->>'doctorateLevel')::int,0)<doctorate_level;

-- Desativa a via incorreta de concurso direto para desembargador. Mantemos o blueprint arquivado para histórico/admin.
update public.exam_blueprints set is_active=false,updated_at=now() where id='concurso_desembargador';

-- A submissão legada não poderá mais promover diretamente para desembargador mesmo que uma prova antiga permaneça publicada.
update public.exams set is_active=false,status='archived' where exam_type='concurso_desembargador' and is_active=true;
commit;