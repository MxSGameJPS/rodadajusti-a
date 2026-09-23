-- Rota da Justiça — mercado jurídico inicial pós-Ramos
-- Escritórios ficcionais publicados para que o fluxo pós-demissão seja jogável
-- imediatamente, sem depender da criação prévia de conteúdo no Rota Admin.

begin;

-- =========================================================
-- SÓCIOS / NPCS
-- =========================================================

insert into public.npcs (
  slug, name, role_type, profession, specialization, jurisdiction,
  status, is_active, professional_profile, personality, base_memories,
  dialogue_library, decision_rules, relationships, knowledge, metadata, published_at
)
values
(
  'helena-valente',
  'Dra. Helena Valente',
  'LAWYER',
  'Advogada',
  'Direito Civil e Direito do Consumidor',
  'Regional',
  'published',
  true,
  '{"officeTitle":"Sócia Fundadora","seniority":"PARTNER","canSupervise":true,"canAssignCases":true,"canHire":true,"canFire":true}'::jsonb,
  '{"style":"formadora","pressure":"moderate","ethics":"high"}'::jsonb,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '{"canonical":true,"lawFirmSlug":"valente-advocacia","portraitSrc":"/personagens/dra-helena-valente.png","portrait":{"status":"READY","format":"png","transparentBackground":true,"url":"/personagens/dra-helena-valente.png"}}'::jsonb,
  now()
),
(
  'rafael-nogueira',
  'Dr. Rafael Nogueira',
  'LAWYER',
  'Advogado',
  'Direito Empresarial e Processo Civil',
  'Regional',
  'published',
  true,
  '{"officeTitle":"Sócio Diretor","seniority":"PARTNER","canSupervise":true,"canAssignCases":true,"canHire":true,"canFire":true}'::jsonb,
  '{"style":"competitivo","pressure":"high","ethics":"high"}'::jsonb,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '{"canonical":true,"lawFirmSlug":"nogueira-bastos-associados","portraitSrc":"/personagens/dr-rafael-nogueira.png","portrait":{"status":"READY","format":"png","transparentBackground":true,"url":"/personagens/dr-rafael-nogueira.png"}}'::jsonb,
  now()
),
(
  'renata-prado',
  'Dra. Renata Prado',
  'LAWYER',
  'Advogada',
  'Contencioso Estratégico e Ética Profissional',
  'Nacional',
  'published',
  true,
  '{"officeTitle":"Sócia Administradora","seniority":"PARTNER","canSupervise":true,"canAssignCases":true,"canHire":true,"canFire":true}'::jsonb,
  '{"style":"criteriosa","pressure":"high","ethics":"very_high"}'::jsonb,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '{"canonical":true,"lawFirmSlug":"prado-estrategia-juridica","portraitSrc":"/personagens/dra-renata-prado.png","portrait":{"status":"READY","format":"png","transparentBackground":true,"url":"/personagens/dra-renata-prado.png"}}'::jsonb,
  now()
)
on conflict (slug) do update
set
  name = excluded.name,
  status = 'published',
  is_active = true,
  professional_profile = public.npcs.professional_profile || excluded.professional_profile,
  personality = public.npcs.personality || excluded.personality,
  metadata = public.npcs.metadata || excluded.metadata,
  published_at = coalesce(public.npcs.published_at, excluded.published_at),
  updated_at = now();

-- =========================================================
-- ESCRITÓRIOS
-- =========================================================

insert into public.law_firms (
  slug, name, legal_name, description, status, is_active, version,
  market_tier, size_category, prestige, public_reputation, location_strategy,
  brand, location, culture, specialties, departments, recruitment,
  case_distribution, discipline, economy, metadata, published_at
)
values
(
  'valente-advocacia',
  'Valente Advocacia',
  'Valente Advocacia Sociedade Individual',
  'Escritório regional de perfil formador, com forte atuação cível e consumerista. É uma porta de reentrada profissional mais acessível para advogados que precisam reconstruir a carreira.',
  'published', true, 1,
  'REGIONAL', 'SMALL', 52, 64, 'PLAYER_BASE_CITY',
  '{"shortName":"Valente","primaryColor":"#315F73","secondaryColor":"#11171A","mapMarker":"V"}'::jsonb,
  '{"strategy":"PLAYER_BASE_CITY","headquarters":{"country":"Brasil","district":"Centro"},"branches":[]}'::jsonb,
  '{"ethics":82,"pressure":48,"training":88,"technology":72,"competitiveness":45,"workLifeBalance":72,"clientPressure":50}'::jsonb,
  '[
    {"slug":"civil","name":"Direito Civil","weight":95},
    {"slug":"consumidor","name":"Direito do Consumidor","weight":90},
    {"slug":"familia-sucessoes","name":"Família e Sucessões","weight":65}
  ]'::jsonb,
  '[
    {"slug":"direcao","name":"Direção","specialty":null},
    {"slug":"civil","name":"Núcleo Cível","specialty":"civil"},
    {"slug":"consumidor","name":"Núcleo do Consumidor","specialty":"consumidor"}
  ]'::jsonb,
  '{
    "recruitmentSchemaVersion":1,
    "internshipRecruitment":{"enabled":false,"roleCode":"ESTAGIARIO","minimumReputation":0,"minimumXp":0,"minimumCasesSolved":0,"minimumEthics":0},
    "postOabOffer":{"enabled":true,"roleCode":"ADVOGADO_CONTRATADO","minimumReputation":20,"minimumXp":400,"minimumCasesSolved":1,"minimumEthics":40,"requiredSpecialties":[]},
    "continuity":{"enabled":false,"internshipPerformanceWeight":70,"minimumPerformance":50,"guaranteedPerformance":80},
    "headhunting":{"enabled":true,"eligibleRoleCodes":["ADVOGADO_CONTRATADO","ADVOGADO_SENIOR"],"minimumReputation":55,"minimumXp":3000,"minimumCasesSolved":8,"minimumEthics":55,"requiredSpecialties":[],"evaluationChance":0.10,"cooldownGameDays":90},
    "applications":{"enabled":true,"eligibleRoleCodes":["ADVOGADO_CONTRATADO"],"minimumReputation":20,"minimumXp":400,"minimumCasesSolved":1,"minimumEthics":40,"requiredSpecialties":[],"cooldownGameDays":30},
    "postTermination":{"enabled":true,"eligibleRoleCodes":["ADVOGADO_CONTRATADO"],"minimumReputation":15,"minimumXp":500,"minimumCasesSolved":1,"minimumEthics":40,"requiredSpecialties":[],"cooldownGameDays":15}
  }'::jsonb,
  '{"assignmentMode":"COORDINATION","maximumSimultaneousCases":1}'::jsonb,
  '{"warningLimit":2,"ethicsWeight":0.35}'::jsonb,
  '{"salaryPolicy":"FIXED","bonusByCase":true}'::jsonb,
  '{"canonical":true,"marketSeed":"POST_RAMOS_V1"}'::jsonb,
  now()
),
(
  'nogueira-bastos-associados',
  'Nogueira, Bastos & Associados',
  'Nogueira, Bastos & Associados Sociedade de Advogados',
  'Escritório regional de médio porte, competitivo e orientado a resultado, com carteira empresarial e contencioso cível de maior complexidade.',
  'published', true, 1,
  'REGIONAL', 'MEDIUM', 68, 72, 'PLAYER_BASE_CITY',
  '{"shortName":"Nogueira & Bastos","primaryColor":"#5C4A36","secondaryColor":"#151311","mapMarker":"NB"}'::jsonb,
  '{"strategy":"PLAYER_BASE_CITY","headquarters":{"country":"Brasil","district":"Centro Empresarial"},"branches":[]}'::jsonb,
  '{"ethics":78,"pressure":74,"training":72,"technology":84,"competitiveness":82,"workLifeBalance":48,"clientPressure":76}'::jsonb,
  '[
    {"slug":"empresarial","name":"Direito Empresarial","weight":95},
    {"slug":"civil","name":"Direito Civil","weight":80},
    {"slug":"processo-civil","name":"Processo Civil","weight":92}
  ]'::jsonb,
  '[
    {"slug":"direcao","name":"Direção","specialty":null},
    {"slug":"empresarial","name":"Empresarial","specialty":"empresarial"},
    {"slug":"contencioso","name":"Contencioso Estratégico","specialty":"processo-civil"}
  ]'::jsonb,
  '{
    "recruitmentSchemaVersion":1,
    "internshipRecruitment":{"enabled":false,"roleCode":"ESTAGIARIO","minimumReputation":0,"minimumXp":0,"minimumCasesSolved":0,"minimumEthics":0},
    "postOabOffer":{"enabled":true,"roleCode":"ADVOGADO_CONTRATADO","minimumReputation":35,"minimumXp":1200,"minimumCasesSolved":2,"minimumEthics":50,"requiredSpecialties":[]},
    "continuity":{"enabled":false,"internshipPerformanceWeight":70,"minimumPerformance":55,"guaranteedPerformance":85},
    "headhunting":{"enabled":true,"eligibleRoleCodes":["ADVOGADO_CONTRATADO","ADVOGADO_SENIOR"],"minimumReputation":65,"minimumXp":4500,"minimumCasesSolved":10,"minimumEthics":60,"requiredSpecialties":[],"evaluationChance":0.12,"cooldownGameDays":90},
    "applications":{"enabled":true,"eligibleRoleCodes":["ADVOGADO_CONTRATADO","ADVOGADO_SENIOR"],"minimumReputation":35,"minimumXp":1200,"minimumCasesSolved":2,"minimumEthics":50,"requiredSpecialties":[],"cooldownGameDays":30},
    "postTermination":{"enabled":true,"eligibleRoleCodes":["ADVOGADO_CONTRATADO"],"minimumReputation":30,"minimumXp":1500,"minimumCasesSolved":3,"minimumEthics":55,"requiredSpecialties":[],"cooldownGameDays":20}
  }'::jsonb,
  '{"assignmentMode":"PERFORMANCE","maximumSimultaneousCases":2}'::jsonb,
  '{"warningLimit":2,"ethicsWeight":0.30}'::jsonb,
  '{"salaryPolicy":"FIXED_PLUS_PERFORMANCE","bonusByCase":true}'::jsonb,
  '{"canonical":true,"marketSeed":"POST_RAMOS_V1"}'::jsonb,
  now()
),
(
  'prado-estrategia-juridica',
  'Prado Estratégia Jurídica',
  'Prado Estratégia Jurídica Sociedade de Advogados',
  'Boutique nacional de contencioso estratégico. Seleciona profissionais com histórico consistente, reputação elevada e forte padrão ético.',
  'published', true, 1,
  'NATIONAL', 'MEDIUM', 82, 86, 'PLAYER_BASE_CITY',
  '{"shortName":"Prado","primaryColor":"#493E67","secondaryColor":"#111016","mapMarker":"P"}'::jsonb,
  '{"strategy":"PLAYER_BASE_CITY","headquarters":{"country":"Brasil","district":"Centro Jurídico"},"branches":[]}'::jsonb,
  '{"ethics":94,"pressure":82,"training":76,"technology":90,"competitiveness":86,"workLifeBalance":42,"clientPressure":84}'::jsonb,
  '[
    {"slug":"processo-civil","name":"Processo Civil","weight":95},
    {"slug":"criminal","name":"Direito Criminal","weight":78},
    {"slug":"empresarial","name":"Direito Empresarial","weight":82}
  ]'::jsonb,
  '[
    {"slug":"direcao","name":"Direção","specialty":null},
    {"slug":"estrategico","name":"Contencioso Estratégico","specialty":"processo-civil"},
    {"slug":"criminal","name":"Criminal Empresarial","specialty":"criminal"}
  ]'::jsonb,
  '{
    "recruitmentSchemaVersion":1,
    "internshipRecruitment":{"enabled":false,"roleCode":"ESTAGIARIO","minimumReputation":0,"minimumXp":0,"minimumCasesSolved":0,"minimumEthics":0},
    "postOabOffer":{"enabled":true,"roleCode":"ADVOGADO_CONTRATADO","minimumReputation":50,"minimumXp":2500,"minimumCasesSolved":4,"minimumEthics":65,"requiredSpecialties":[]},
    "continuity":{"enabled":false,"internshipPerformanceWeight":70,"minimumPerformance":65,"guaranteedPerformance":90},
    "headhunting":{"enabled":true,"eligibleRoleCodes":["ADVOGADO_CONTRATADO","ADVOGADO_SENIOR"],"minimumReputation":75,"minimumXp":6000,"minimumCasesSolved":12,"minimumEthics":75,"requiredSpecialties":[],"evaluationChance":0.08,"cooldownGameDays":120},
    "applications":{"enabled":true,"eligibleRoleCodes":["ADVOGADO_CONTRATADO","ADVOGADO_SENIOR"],"minimumReputation":50,"minimumXp":2500,"minimumCasesSolved":4,"minimumEthics":65,"requiredSpecialties":[],"cooldownGameDays":45},
    "postTermination":{"enabled":true,"eligibleRoleCodes":["ADVOGADO_CONTRATADO"],"minimumReputation":45,"minimumXp":3000,"minimumCasesSolved":5,"minimumEthics":70,"requiredSpecialties":[],"cooldownGameDays":30}
  }'::jsonb,
  '{"assignmentMode":"MERIT","maximumSimultaneousCases":2}'::jsonb,
  '{"warningLimit":2,"ethicsWeight":0.45}'::jsonb,
  '{"salaryPolicy":"PREMIUM","bonusByCase":true}'::jsonb,
  '{"canonical":true,"marketSeed":"POST_RAMOS_V1"}'::jsonb,
  now()
)
on conflict (slug) do update
set
  name = excluded.name,
  legal_name = excluded.legal_name,
  description = excluded.description,
  status = 'published',
  is_active = true,
  market_tier = excluded.market_tier,
  size_category = excluded.size_category,
  prestige = excluded.prestige,
  public_reputation = excluded.public_reputation,
  location_strategy = excluded.location_strategy,
  brand = excluded.brand,
  location = excluded.location,
  culture = excluded.culture,
  specialties = excluded.specialties,
  departments = excluded.departments,
  recruitment = excluded.recruitment,
  case_distribution = excluded.case_distribution,
  discipline = excluded.discipline,
  economy = excluded.economy,
  metadata = public.law_firms.metadata || excluded.metadata,
  published_at = coalesce(public.law_firms.published_at, excluded.published_at),
  updated_at = now();

-- =========================================================
-- CARGOS
-- =========================================================

with firms as (
  select id, slug from public.law_firms
  where slug in ('valente-advocacia','nogueira-bastos-associados','prado-estrategia-juridica')
),
roles as (
  select * from (values
    ('valente-advocacia','ADVOGADO_CONTRATADO','Advogado Contratado','ADVOGADO_CONTRATADO',2,5400::numeric,40,false,'MISTO',
      '{"socialJuridico":{"included":true,"plan":"PRO","owner":"LAW_FIRM","revokedOnTermination":true}}'::jsonb),
    ('valente-advocacia','ADVOGADO_SENIOR','Advogado Sênior','ADVOGADO_SENIOR',3,7800::numeric,40,false,'MISTO',
      '{"socialJuridico":{"included":true,"plan":"PRO","owner":"LAW_FIRM","revokedOnTermination":true}}'::jsonb),
    ('nogueira-bastos-associados','ADVOGADO_CONTRATADO','Advogado Associado','ADVOGADO_CONTRATADO',2,6700::numeric,44,true,'MISTO',
      '{"socialJuridico":{"included":true,"plan":"ENTERPRISE","owner":"LAW_FIRM","revokedOnTermination":true}}'::jsonb),
    ('nogueira-bastos-associados','ADVOGADO_SENIOR','Advogado Sênior','ADVOGADO_SENIOR',3,9500::numeric,44,true,'MISTO',
      '{"socialJuridico":{"included":true,"plan":"ENTERPRISE","owner":"LAW_FIRM","revokedOnTermination":true}}'::jsonb),
    ('prado-estrategia-juridica','ADVOGADO_CONTRATADO','Advogado de Contencioso Estratégico','ADVOGADO_CONTRATADO',2,8200::numeric,45,true,'HIBRIDO',
      '{"socialJuridico":{"included":true,"plan":"ENTERPRISE","owner":"LAW_FIRM","revokedOnTermination":true}}'::jsonb),
    ('prado-estrategia-juridica','ADVOGADO_SENIOR','Advogado Sênior de Contencioso','ADVOGADO_SENIOR',3,12500::numeric,45,true,'HIBRIDO',
      '{"socialJuridico":{"included":true,"plan":"ENTERPRISE","owner":"LAW_FIRM","revokedOnTermination":true}}'::jsonb)
  ) as r(firm_slug,code,title,maps_to_career_tier,hierarchy_level,salary_monthly_jr,weekly_hours,exclusive_dedication,work_regime,benefits)
)
insert into public.law_firm_roles (
  law_firm_id, code, title, maps_to_career_tier, role_type, hierarchy_level,
  requires_oab, employment_type, salary_monthly_jr, weekly_hours,
  exclusive_dedication, contract, requirements, benefits, case_access,
  promotion, termination_rules, status, is_active, metadata
)
select
  firms.id,
  roles.code,
  roles.title,
  roles.maps_to_career_tier,
  'LAWYER',
  roles.hierarchy_level,
  true,
  'EMPLOYED',
  roles.salary_monthly_jr,
  roles.weekly_hours,
  roles.exclusive_dedication,
  jsonb_build_object(
    'salaryMonthlyJR', roles.salary_monthly_jr,
    'weeklyHours', roles.weekly_hours,
    'exclusiveDedication', roles.exclusive_dedication,
    'workRegime', roles.work_regime
  ),
  '{}'::jsonb,
  roles.benefits,
  '{"canReceiveCases":true,"maximumSimultaneousCases":2}'::jsonb,
  '{}'::jsonb,
  '{"warningLimit":2}'::jsonb,
  'published',
  true,
  '{"canonical":true,"marketSeed":"POST_RAMOS_V1"}'::jsonb
from roles
join firms on firms.slug = roles.firm_slug
on conflict (law_firm_id, code) do update
set
  title = excluded.title,
  maps_to_career_tier = excluded.maps_to_career_tier,
  hierarchy_level = excluded.hierarchy_level,
  salary_monthly_jr = excluded.salary_monthly_jr,
  weekly_hours = excluded.weekly_hours,
  exclusive_dedication = excluded.exclusive_dedication,
  contract = excluded.contract,
  benefits = excluded.benefits,
  status = 'published',
  is_active = true,
  updated_at = now();

-- =========================================================
-- MEMBROS FUNDADORES
-- =========================================================

insert into public.law_firm_members (
  law_firm_id, npc_id, role_id, department_slug, office_title,
  permissions, is_active, metadata
)
select
  firm.id,
  npc.id,
  null,
  'direcao',
  data.office_title,
  '{"canSupervise":true,"canAssignCases":true,"canHire":true}'::jsonb,
  true,
  '{"canonical":true,"marketSeed":"POST_RAMOS_V1"}'::jsonb
from (
  values
    ('valente-advocacia','helena-valente','Sócia Fundadora'),
    ('nogueira-bastos-associados','rafael-nogueira','Sócio Diretor'),
    ('prado-estrategia-juridica','renata-prado','Sócia Administradora')
) as data(firm_slug,npc_slug,office_title)
join public.law_firms firm on firm.slug = data.firm_slug
join public.npcs npc on npc.slug = data.npc_slug
on conflict (law_firm_id, npc_id, office_title) do update
set is_active = true,
    metadata = public.law_firm_members.metadata || excluded.metadata,
    updated_at = now();

commit;
