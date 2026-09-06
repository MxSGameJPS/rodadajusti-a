-- Rota da Justiça — seed canônico do Ramos & Associados
-- Pressupõe a infraestrutura law_firms/law_firm_roles/law_firm_members já criada.
-- Idempotente: pode ser reaplicado sem duplicar o escritório, cargos ou membros.

begin;

-- =========================================================
-- NPCS CANÔNICOS DO RAMOS & ASSOCIADOS
-- =========================================================
-- Os NPCs são inseridos apenas se ainda não existirem pelo slug. Quando já
-- existem, preservamos o conteúdo rico anterior e apenas garantimos os dados
-- mínimos necessários para o vínculo institucional.

insert into public.npcs (
  slug,
  name,
  role_type,
  profession,
  specialization,
  jurisdiction,
  status,
  is_active,
  professional_profile,
  personality,
  base_memories,
  dialogue_library,
  decision_rules,
  relationships,
  knowledge,
  metadata,
  published_at
)
values
(
  'roberto-ramos',
  'Dr. Roberto Ramos',
  'LAWYER',
  'Advogado',
  'Gestão jurídica e Direito Civil',
  'Regional',
  'published',
  true,
  '{"officeTitle":"Sócio Responsável","seniority":"PARTNER","canSupervise":true,"canAssignCases":true,"canHire":true,"canFire":true}'::jsonb,
  '{}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{"canonical":true,"lawFirmSlug":"ramos-associados","portrait":"/personagens/dr-roberto-ramos.png"}'::jsonb,
  now()
),
(
  'helena-ramos',
  'Dra. Helena Ramos',
  'LAWYER',
  'Advogada',
  'Direito do Trabalho',
  'Regional',
  'published',
  true,
  '{"officeTitle":"Sócia Coordenadora","seniority":"PARTNER","department":"trabalhista","canSupervise":true,"canAssignCases":true}'::jsonb,
  '{}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{"canonical":true,"lawFirmSlug":"ramos-associados"}'::jsonb,
  now()
),
(
  'mariana-duarte',
  'Mariana Duarte',
  'ADMINISTRATIVE',
  'Secretária Executiva',
  'Operações Jurídicas',
  'Regional',
  'published',
  true,
  '{"officeTitle":"Secretária do Escritório","department":"administrativo","canOperateCrm":true}'::jsonb,
  '{}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{"canonical":true,"lawFirmSlug":"ramos-associados","portrait":"/personagens/mariana-duarte.png"}'::jsonb,
  now()
)
on conflict (slug) do update
set
  name = excluded.name,
  status = 'published',
  is_active = true,
  professional_profile = public.npcs.professional_profile || excluded.professional_profile,
  metadata = public.npcs.metadata || excluded.metadata,
  published_at = coalesce(public.npcs.published_at, excluded.published_at),
  updated_at = now();

-- =========================================================
-- ESCRITÓRIO
-- =========================================================

insert into public.law_firms (
  slug,
  name,
  legal_name,
  description,
  status,
  is_active,
  version,
  market_tier,
  size_category,
  prestige,
  public_reputation,
  location_strategy,
  brand,
  location,
  culture,
  specialties,
  departments,
  recruitment,
  case_distribution,
  discipline,
  economy,
  metadata,
  published_at
)
values (
  'ramos-associados',
  'Ramos & Associados',
  'Ramos & Associados Sociedade de Advogados',
  'Escritório tradicional de advocacia com atuação multidisciplinar, formação de jovens profissionais e carteira diversificada de clientes.',
  'published',
  true,
  1,
  'REGIONAL',
  'MEDIUM',
  65,
  70,
  'PLAYER_BASE_CITY',
  '{
    "shortName":"Ramos",
    "logoUrl":null,
    "coverUrl":null,
    "primaryColor":"#C5A059",
    "secondaryColor":"#161618",
    "mapMarker":"R"
  }'::jsonb,
  '{
    "strategy":"PLAYER_BASE_CITY",
    "headquarters":{
      "name":"Ramos & Associados",
      "city":null,
      "state":null,
      "country":"Brasil",
      "district":"Centro",
      "address":null,
      "mapPlacement":"VIRTUAL_CENTRAL_REGION"
    },
    "branches":[]
  }'::jsonb,
  '{
    "ethics":85,
    "pressure":65,
    "training":90,
    "technology":80,
    "competitiveness":60,
    "workLifeBalance":55,
    "clientPressure":65
  }'::jsonb,
  '[
    {"slug":"civil","name":"Direito Civil","weight":90},
    {"slug":"imobiliario","name":"Direito Imobiliário","weight":75},
    {"slug":"trabalhista","name":"Direito do Trabalho","weight":85},
    {"slug":"familia-sucessoes","name":"Família e Sucessões","weight":75},
    {"slug":"criminal","name":"Direito Criminal","weight":55},
    {"slug":"processo-civil","name":"Processo Civil","weight":80},
    {"slug":"processo-penal","name":"Processo Penal","weight":55}
  ]'::jsonb,
  '[
    {"slug":"direcao","name":"Direção","specialty":null},
    {"slug":"civil","name":"Núcleo Cível","specialty":"civil"},
    {"slug":"imobiliario","name":"Núcleo Imobiliário","specialty":"imobiliario"},
    {"slug":"trabalhista","name":"Núcleo Trabalhista","specialty":"trabalhista"},
    {"slug":"familia-sucessoes","name":"Família e Sucessões","specialty":"familia-sucessoes"},
    {"slug":"criminal","name":"Núcleo Criminal","specialty":"criminal"},
    {"slug":"administrativo","name":"Administrativo","specialty":null}
  ]'::jsonb,
  '{
    "acceptsApplications":true,
    "initialGameOffer":{
      "enabled":true,
      "roleCode":"ESTAGIARIO",
      "priority":100,
      "requirements":{
        "requiresOab":false,
        "minimumReputation":0,
        "minimumXp":0,
        "minimumCasesSolved":0
      }
    },
    "postOabOffer":{
      "enabled":true,
      "roleCode":"ADVOGADO_CONTRATADO",
      "requirements":{
        "requiresOab":true,
        "minimumReputation":20
      }
    },
    "headhunting":{
      "enabled":true,
      "eligibleCareerTiers":["ADVOGADO_CONTRATADO","ADVOGADO_SENIOR"],
      "minimumReputation":40,
      "minimumCasesSolved":3,
      "cooldownGameDays":90,
      "evaluationChance":0.12
    },
    "postTerminationApplication":{
      "enabled":true,
      "cooldownGameDays":30
    },
    "rehire":{
      "enabled":false
    }
  }'::jsonb,
  '{
    "enabled":true,
    "source":"LAW_FIRM",
    "assignmentNpcSlug":"roberto-ramos",
    "crmOperatorNpcSlug":"mariana-duarte",
    "requiresActiveEmployment":true,
    "terminationHandling":{
      "blockNewCasesImmediately":true,
      "revokePendingAssignments":true,
      "activeCases":"HANDOFF_TO_LAW_FIRM"
    }
  }'::jsonb,
  '{
    "enabled":true,
    "warningsEnabled":true,
    "performanceEvaluation":true,
    "terminationPossible":true
  }'::jsonb,
  '{
    "salaryEnabled":true,
    "profitSharingEnabled":true,
    "bonusesEnabled":true
  }'::jsonb,
  '{
    "starterFirm":true,
    "canonical":true,
    "schemaVersion":1,
    "source":"game-migration"
  }'::jsonb,
  now()
)
on conflict (slug) do update
set
  name = excluded.name,
  legal_name = excluded.legal_name,
  description = excluded.description,
  status = excluded.status,
  is_active = excluded.is_active,
  version = greatest(public.law_firms.version, excluded.version),
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
-- CARGOS DO RAMOS & ASSOCIADOS
-- =========================================================

with firm as (
  select id from public.law_firms where slug = 'ramos-associados'
)
insert into public.law_firm_roles (
  law_firm_id,
  code,
  title,
  maps_to_career_tier,
  role_type,
  hierarchy_level,
  requires_oab,
  employment_type,
  salary_monthly_jr,
  weekly_hours,
  exclusive_dedication,
  contract,
  requirements,
  benefits,
  case_access,
  promotion,
  termination_rules,
  status,
  is_active,
  metadata
)
select
  firm.id,
  role.code,
  role.title,
  role.maps_to_career_tier,
  role.role_type,
  role.hierarchy_level,
  role.requires_oab,
  role.employment_type,
  role.salary_monthly_jr,
  role.weekly_hours,
  role.exclusive_dedication,
  role.contract,
  role.requirements,
  role.benefits,
  role.case_access,
  role.promotion,
  role.termination_rules,
  'published',
  true,
  role.metadata
from firm
cross join (
  values
  (
    'ESTAGIARIO'::text,
    'Estagiário de Direito'::text,
    'ESTAGIARIO'::text,
    'INTERN'::text,
    5::smallint,
    false,
    'INTERNSHIP'::text,
    1200::bigint,
    30::smallint,
    false,
    '{"workRegime":"PRESENCIAL_OU_MISTO"}'::jsonb,
    '{"minimumReputation":0,"minimumXp":0,"minimumCasesSolved":0,"minimumEthics":0,"requiredSpecialties":[]}'::jsonb,
    '{"socialJuridico":{"included":false,"plan":null,"owner":null,"revokedOnTermination":true},"professionalNotebook":false,"professionalPhone":false}'::jsonb,
    '{"enabled":true,"supervisionRequired":true,"maximumSimultaneousCases":1}'::jsonb,
    '{"targetRoleCode":"ESTAGIARIO_SENIOR","automatic":false}'::jsonb,
    '{"canBeTerminated":true,"losesFirmCaseAccess":true}'::jsonb,
    '{"canonical":true}'::jsonb
  ),
  (
    'ESTAGIARIO_SENIOR',
    'Estagiário Sênior',
    'ESTAGIARIO_SENIOR',
    'INTERN',
    4::smallint,
    false,
    'INTERNSHIP',
    2100::bigint,
    30::smallint,
    false,
    '{"workRegime":"MISTO"}'::jsonb,
    '{"minimumReputation":30,"minimumXp":400,"minimumCasesSolved":2,"minimumEthics":0,"requiredSpecialties":[]}'::jsonb,
    '{"socialJuridico":{"included":false,"plan":null,"owner":null,"revokedOnTermination":true},"professionalNotebook":false,"professionalPhone":false}'::jsonb,
    '{"enabled":true,"supervisionRequired":true,"maximumSimultaneousCases":1}'::jsonb,
    '{"targetRoleCode":"ADVOGADO_CONTRATADO","automatic":false,"requiresOab":true}'::jsonb,
    '{"canBeTerminated":true,"losesFirmCaseAccess":true}'::jsonb,
    '{"canonical":true}'::jsonb
  ),
  (
    'ADVOGADO_CONTRATADO',
    'Advogado Contratado',
    'ADVOGADO_CONTRATADO',
    'LAWYER',
    3::smallint,
    true,
    'EMPLOYEE',
    5800::bigint,
    40::smallint,
    true,
    '{"workRegime":"MIXED","exclusiveDedication":true,"honorariumParticipationPercent":20}'::jsonb,
    '{"minimumReputation":20,"minimumXp":0,"minimumCasesSolved":0,"minimumEthics":0,"requiredSpecialties":[]}'::jsonb,
    '{"socialJuridico":{"included":true,"plan":"ENTERPRISE","owner":"LAW_FIRM","revokedOnTermination":true},"professionalNotebook":true,"professionalPhone":true}'::jsonb,
    '{"enabled":true,"supervisionRequired":false,"maximumSimultaneousCases":1}'::jsonb,
    '{"targetRoleCode":"ADVOGADO_SENIOR","automatic":false}'::jsonb,
    '{"canBeTerminated":true,"losesFirmCaseAccess":true,"revokesFirmBenefits":true}'::jsonb,
    '{"canonical":true,"contractSource":"post-oab-employment"}'::jsonb
  ),
  (
    'ADVOGADO_SENIOR',
    'Advogado Sênior',
    'ADVOGADO_SENIOR',
    'LAWYER',
    2::smallint,
    true,
    'EMPLOYEE',
    12000::bigint,
    40::smallint,
    true,
    '{"workRegime":"MIXED","exclusiveDedication":true,"honorariumParticipationPercent":35}'::jsonb,
    '{"minimumReputation":70,"minimumXp":2600,"minimumCasesSolved":9,"minimumEthics":0,"requiredSpecialties":[]}'::jsonb,
    '{"socialJuridico":{"included":true,"plan":"ENTERPRISE","owner":"LAW_FIRM","revokedOnTermination":true},"professionalNotebook":true,"professionalPhone":true}'::jsonb,
    '{"enabled":true,"supervisionRequired":false,"maximumSimultaneousCases":2}'::jsonb,
    '{"targetRoleCode":"SOCIO","automatic":false}'::jsonb,
    '{"canBeTerminated":true,"losesFirmCaseAccess":true,"revokesFirmBenefits":true}'::jsonb,
    '{"canonical":true}'::jsonb
  ),
  (
    'SOCIO',
    'Sócio do Escritório',
    'SOCIO_ESCRITORIO',
    'PARTNER',
    1::smallint,
    true,
    'PARTNERSHIP',
    28000::bigint,
    null::smallint,
    true,
    '{"workRegime":"PARTNERSHIP","profitSharing":true}'::jsonb,
    '{"minimumReputation":85,"minimumXp":5000,"minimumCasesSolved":14,"minimumEthics":0,"requiredSpecialties":[]}'::jsonb,
    '{"socialJuridico":{"included":true,"plan":"ENTERPRISE","owner":"LAW_FIRM","revokedOnTermination":true},"professionalNotebook":true,"professionalPhone":true,"profitSharing":true}'::jsonb,
    '{"enabled":true,"supervisionRequired":false,"maximumSimultaneousCases":3}'::jsonb,
    '{"targetRoleCode":null,"automatic":false}'::jsonb,
    '{"canBeTerminated":false,"partnershipExitRequired":true}'::jsonb,
    '{"canonical":true,"compensationType":"PRO_LABORE_PLUS_DIVIDENDS"}'::jsonb
  )
) as role(
  code,
  title,
  maps_to_career_tier,
  role_type,
  hierarchy_level,
  requires_oab,
  employment_type,
  salary_monthly_jr,
  weekly_hours,
  exclusive_dedication,
  contract,
  requirements,
  benefits,
  case_access,
  promotion,
  termination_rules,
  metadata
)
on conflict (law_firm_id, code) do update
set
  title = excluded.title,
  maps_to_career_tier = excluded.maps_to_career_tier,
  role_type = excluded.role_type,
  hierarchy_level = excluded.hierarchy_level,
  requires_oab = excluded.requires_oab,
  employment_type = excluded.employment_type,
  salary_monthly_jr = excluded.salary_monthly_jr,
  weekly_hours = excluded.weekly_hours,
  exclusive_dedication = excluded.exclusive_dedication,
  contract = excluded.contract,
  requirements = excluded.requirements,
  benefits = excluded.benefits,
  case_access = excluded.case_access,
  promotion = excluded.promotion,
  termination_rules = excluded.termination_rules,
  status = 'published',
  is_active = true,
  metadata = public.law_firm_roles.metadata || excluded.metadata,
  updated_at = now();

-- =========================================================
-- MEMBROS DO ESCRITÓRIO
-- =========================================================

with firm as (
  select id from public.law_firms where slug = 'ramos-associados'
),
partner_role as (
  select r.id
  from public.law_firm_roles r
  join firm f on f.id = r.law_firm_id
  where r.code = 'SOCIO'
),
member_source as (
  select
    n.id as npc_id,
    case when n.slug in ('roberto-ramos', 'helena-ramos') then (select id from partner_role) else null end as role_id,
    case
      when n.slug = 'roberto-ramos' then 'direcao'
      when n.slug = 'helena-ramos' then 'trabalhista'
      when n.slug = 'mariana-duarte' then 'administrativo'
    end as department_slug,
    case
      when n.slug = 'roberto-ramos' then 'Sócio Responsável'
      when n.slug = 'helena-ramos' then 'Sócia Coordenadora'
      when n.slug = 'mariana-duarte' then 'Secretária do Escritório'
    end as office_title,
    case
      when n.slug = 'roberto-ramos' then '{"canHire":true,"canFire":true,"canPromote":true,"canAssignCases":true,"canEvaluateEmployees":true,"canOperateCrm":false}'::jsonb
      when n.slug = 'helena-ramos' then '{"canHire":false,"canFire":false,"canPromote":false,"canAssignCases":true,"canEvaluateEmployees":true,"canOperateCrm":false}'::jsonb
      when n.slug = 'mariana-duarte' then '{"canHire":false,"canFire":false,"canPromote":false,"canAssignCases":false,"canEvaluateEmployees":false,"canOperateCrm":true}'::jsonb
    end as permissions
  from public.npcs n
  where n.slug in ('roberto-ramos', 'helena-ramos', 'mariana-duarte')
)
insert into public.law_firm_members (
  law_firm_id,
  npc_id,
  role_id,
  department_slug,
  office_title,
  permissions,
  is_active,
  metadata
)
select
  firm.id,
  member_source.npc_id,
  member_source.role_id,
  member_source.department_slug,
  member_source.office_title,
  member_source.permissions,
  true,
  '{"canonical":true}'::jsonb
from firm
cross join member_source
on conflict (law_firm_id, npc_id) do update
set
  role_id = excluded.role_id,
  department_slug = excluded.department_slug,
  office_title = excluded.office_title,
  permissions = excluded.permissions,
  is_active = true,
  metadata = public.law_firm_members.metadata || excluded.metadata,
  updated_at = now();

commit;
