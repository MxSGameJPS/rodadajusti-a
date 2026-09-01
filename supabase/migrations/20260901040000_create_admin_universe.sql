-- Rota da Justiça — universo administrável, NPCs e economia server-authoritative
-- Conteúdo é publicado pelo rota-admin local. Estado do jogador é alterado apenas
-- por funções/Edge Functions do Supabase, nunca por APIs da Vercel.

begin;

-- =========================================================
-- NPCS E CONTEÚDO DO UNIVERSO
-- =========================================================

create table if not exists public.npcs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role_type text not null,
  profession text not null,
  specialization text not null,
  jurisdiction text not null default '',
  status text not null default 'draft',
  is_active boolean not null default true,
  version integer not null default 1,
  decision_engine_version integer not null default 1,
  professional_profile jsonb not null default '{}'::jsonb,
  personality jsonb not null default '{}'::jsonb,
  base_memories jsonb not null default '[]'::jsonb,
  dialogue_library jsonb not null default '[]'::jsonb,
  decision_rules jsonb not null default '[]'::jsonb,
  relationships jsonb not null default '[]'::jsonb,
  knowledge jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint npcs_slug_not_blank check (char_length(trim(slug)) > 0),
  constraint npcs_name_not_blank check (char_length(trim(name)) > 0),
  constraint npcs_status_valid check (status in ('draft', 'published', 'archived')),
  constraint npcs_version_positive check (version >= 1),
  constraint npcs_profile_object check (jsonb_typeof(professional_profile) = 'object'),
  constraint npcs_personality_object check (jsonb_typeof(personality) = 'object'),
  constraint npcs_base_memories_array check (jsonb_typeof(base_memories) = 'array'),
  constraint npcs_dialogue_library_array check (jsonb_typeof(dialogue_library) = 'array'),
  constraint npcs_decision_rules_array check (jsonb_typeof(decision_rules) = 'array'),
  constraint npcs_relationships_array check (jsonb_typeof(relationships) = 'array'),
  constraint npcs_knowledge_array check (jsonb_typeof(knowledge) = 'array'),
  constraint npcs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.case_npcs (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references public.cases(id) on delete cascade,
  npc_id uuid not null references public.npcs(id) on delete cascade,
  role_in_case text not null,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint case_npcs_role_not_blank check (char_length(trim(role_in_case)) > 0),
  constraint case_npcs_configuration_object check (jsonb_typeof(configuration) = 'object'),
  constraint case_npcs_unique unique (case_id, npc_id, role_in_case)
);

-- Estado dinâmico de um NPC em relação a uma carreira específica.
create table if not exists public.npc_player_state (
  id uuid primary key default gen_random_uuid(),
  npc_id uuid not null references public.npcs(id) on delete cascade,
  career_id uuid not null references public.careers(id) on delete cascade,
  affinity integer not null default 0,
  trust integer not null default 0,
  respect integer not null default 0,
  flags jsonb not null default '{}'::jsonb,
  memory_summary jsonb not null default '{}'::jsonb,
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint npc_state_affinity_range check (affinity between -100 and 100),
  constraint npc_state_trust_range check (trust between -100 and 100),
  constraint npc_state_respect_range check (respect between -100 and 100),
  constraint npc_state_flags_object check (jsonb_typeof(flags) = 'object'),
  constraint npc_state_memory_object check (jsonb_typeof(memory_summary) = 'object'),
  constraint npc_state_unique unique (npc_id, career_id)
);

create table if not exists public.npc_memories (
  id uuid primary key default gen_random_uuid(),
  npc_id uuid not null references public.npcs(id) on delete cascade,
  career_id uuid not null references public.careers(id) on delete cascade,
  case_id text references public.cases(id) on delete set null,
  memory_type text not null default 'interaction',
  summary text not null,
  importance smallint not null default 5,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint npc_memories_importance_range check (importance between 1 and 10),
  constraint npc_memories_summary_not_blank check (char_length(trim(summary)) > 0),
  constraint npc_memories_context_object check (jsonb_typeof(context) = 'object')
);

create table if not exists public.npc_interactions (
  id uuid primary key default gen_random_uuid(),
  npc_id uuid not null references public.npcs(id) on delete cascade,
  career_id uuid not null references public.careers(id) on delete cascade,
  case_id text references public.cases(id) on delete set null,
  interaction_type text not null,
  player_action jsonb not null default '{}'::jsonb,
  npc_response jsonb not null default '{}'::jsonb,
  outcome jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint npc_interactions_type_not_blank check (char_length(trim(interaction_type)) > 0),
  constraint npc_interactions_player_object check (jsonb_typeof(player_action) = 'object'),
  constraint npc_interactions_response_object check (jsonb_typeof(npc_response) = 'object'),
  constraint npc_interactions_outcome_object check (jsonb_typeof(outcome) = 'object')
);

-- =========================================================
-- AÇÕES E DECISÕES JURÍDICAS
-- =========================================================

create table if not exists public.legal_actions (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.careers(id) on delete cascade,
  case_id text not null references public.cases(id) on delete cascade,
  npc_id uuid references public.npcs(id) on delete set null,
  action_type text not null,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint legal_actions_type_not_blank check (char_length(trim(action_type)) > 0),
  constraint legal_actions_status_valid check (status in ('pending', 'resolved', 'rejected', 'cancelled')),
  constraint legal_actions_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint legal_actions_result_object check (jsonb_typeof(result) = 'object')
);

create table if not exists public.legal_decisions (
  id uuid primary key default gen_random_uuid(),
  legal_action_id uuid not null references public.legal_actions(id) on delete cascade,
  npc_id uuid not null references public.npcs(id) on delete restrict,
  decision_type text not null,
  outcome text not null,
  score numeric(6,2),
  threshold numeric(6,2),
  score_breakdown jsonb not null default '{}'::jsonb,
  reasoning_template text,
  rendered_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint legal_decisions_type_not_blank check (char_length(trim(decision_type)) > 0),
  constraint legal_decisions_outcome_not_blank check (char_length(trim(outcome)) > 0),
  constraint legal_decisions_breakdown_object check (jsonb_typeof(score_breakdown) = 'object'),
  constraint legal_decisions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

-- =========================================================
-- ECONOMIA, LOJA E RECOMPENSAS
-- =========================================================

create table if not exists public.game_currencies (
  id text primary key,
  name text not null,
  symbol text not null,
  currency_type text not null default 'common',
  status text not null default 'draft',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_currencies_status_valid check (status in ('draft', 'published', 'archived')),
  constraint game_currencies_type_valid check (currency_type in ('common', 'premium', 'special')),
  constraint game_currencies_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.catalog_items (
  id text primary key,
  sku text not null unique,
  type text not null,
  name text not null,
  description text not null,
  rarity text not null default 'comum',
  price_currency text not null references public.game_currencies(id) on update cascade,
  price_amount bigint not null default 0,
  status text not null default 'draft',
  is_active boolean not null default true,
  version integer not null default 1,
  effects jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_items_price_nonnegative check (price_amount >= 0),
  constraint catalog_items_status_valid check (status in ('draft', 'published', 'archived')),
  constraint catalog_items_version_positive check (version >= 1),
  constraint catalog_items_effects_object check (jsonb_typeof(effects) = 'object'),
  constraint catalog_items_content_object check (jsonb_typeof(content) = 'object'),
  constraint catalog_items_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.reward_definitions (
  id text primary key,
  name text not null,
  trigger_type text not null,
  status text not null default 'draft',
  is_active boolean not null default true,
  version integer not null default 1,
  conditions jsonb not null default '{}'::jsonb,
  reward jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_definitions_status_valid check (status in ('draft', 'published', 'archived')),
  constraint reward_definitions_conditions_object check (jsonb_typeof(conditions) = 'object'),
  constraint reward_definitions_reward_object check (jsonb_typeof(reward) = 'object'),
  constraint reward_definitions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.player_wallets (
  career_id uuid not null references public.careers(id) on delete cascade,
  currency_id text not null references public.game_currencies(id) on update cascade,
  balance bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (career_id, currency_id),
  constraint player_wallets_balance_nonnegative check (balance >= 0)
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.careers(id) on delete cascade,
  currency_id text not null references public.game_currencies(id) on update cascade,
  amount bigint not null,
  transaction_type text not null,
  reference_type text,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint wallet_transactions_amount_nonzero check (amount <> 0),
  constraint wallet_transactions_type_not_blank check (char_length(trim(transaction_type)) > 0),
  constraint wallet_transactions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.player_inventory (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.careers(id) on delete cascade,
  catalog_item_id text not null references public.catalog_items(id) on delete restrict,
  quantity integer not null default 1,
  equipped boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  acquired_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_inventory_quantity_positive check (quantity > 0),
  constraint player_inventory_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint player_inventory_unique unique (career_id, catalog_item_id)
);

-- =========================================================
-- FEATURES, SETTINGS, VERSIONAMENTO E AUDITORIA
-- =========================================================

create table if not exists public.game_features (
  id text primary key,
  name text not null,
  description text not null default '',
  status text not null default 'draft',
  is_active boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_features_status_valid check (status in ('draft', 'published', 'archived')),
  constraint game_features_config_object check (jsonb_typeof(config) = 'object')
);

create table if not exists public.game_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  is_public boolean not null default false,
  description text not null default '',
  updated_at timestamptz not null default now(),
  constraint game_settings_status_valid check (status in ('draft', 'published', 'archived'))
);

create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  version integer not null,
  snapshot jsonb not null,
  created_by text not null default 'rota-admin',
  created_at timestamptz not null default now(),
  constraint content_versions_version_positive check (version >= 1),
  constraint content_versions_snapshot_object check (jsonb_typeof(snapshot) = 'object'),
  constraint content_versions_unique unique (entity_type, entity_id, version)
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_audit_logs_payload_object check (jsonb_typeof(payload) = 'object')
);

-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists idx_npcs_public on public.npcs(status, is_active, role_type);
create index if not exists idx_npcs_specialization on public.npcs(specialization);
create index if not exists idx_case_npcs_case on public.case_npcs(case_id, sort_order);
create index if not exists idx_case_npcs_npc on public.case_npcs(npc_id);
create index if not exists idx_npc_state_career on public.npc_player_state(career_id);
create index if not exists idx_npc_memories_lookup on public.npc_memories(npc_id, career_id, created_at desc);
create index if not exists idx_npc_interactions_lookup on public.npc_interactions(npc_id, career_id, created_at desc);
create index if not exists idx_legal_actions_career on public.legal_actions(career_id, created_at desc);
create index if not exists idx_legal_decisions_npc on public.legal_decisions(npc_id, created_at desc);
create index if not exists idx_catalog_public on public.catalog_items(status, is_active, type, rarity);
create index if not exists idx_rewards_public on public.reward_definitions(status, is_active, trigger_type);
create index if not exists idx_wallet_transactions_career on public.wallet_transactions(career_id, created_at desc);
create index if not exists idx_inventory_career on public.player_inventory(career_id);
create index if not exists idx_content_versions_entity on public.content_versions(entity_type, entity_id, version desc);
create index if not exists idx_admin_audit_entity on public.admin_audit_logs(entity_type, entity_id, created_at desc);

-- =========================================================
-- UPDATED_AT
-- =========================================================

drop trigger if exists npcs_set_updated_at on public.npcs;
create trigger npcs_set_updated_at before update on public.npcs for each row execute function public.set_updated_at();
drop trigger if exists npc_player_state_set_updated_at on public.npc_player_state;
create trigger npc_player_state_set_updated_at before update on public.npc_player_state for each row execute function public.set_updated_at();
drop trigger if exists game_currencies_set_updated_at on public.game_currencies;
create trigger game_currencies_set_updated_at before update on public.game_currencies for each row execute function public.set_updated_at();
drop trigger if exists catalog_items_set_updated_at on public.catalog_items;
create trigger catalog_items_set_updated_at before update on public.catalog_items for each row execute function public.set_updated_at();
drop trigger if exists reward_definitions_set_updated_at on public.reward_definitions;
create trigger reward_definitions_set_updated_at before update on public.reward_definitions for each row execute function public.set_updated_at();
drop trigger if exists player_inventory_set_updated_at on public.player_inventory;
create trigger player_inventory_set_updated_at before update on public.player_inventory for each row execute function public.set_updated_at();
drop trigger if exists game_features_set_updated_at on public.game_features;
create trigger game_features_set_updated_at before update on public.game_features for each row execute function public.set_updated_at();
drop trigger if exists game_settings_set_updated_at on public.game_settings;
create trigger game_settings_set_updated_at before update on public.game_settings for each row execute function public.set_updated_at();

-- =========================================================
-- RLS: CONTEÚDO PUBLICADO É LEITURA; ESTADO DO PLAYER É SOMENTE DELE
-- Escrita administrativa ocorre via service_role do rota-admin local.
-- =========================================================

alter table public.npcs enable row level security;
alter table public.case_npcs enable row level security;
alter table public.npc_player_state enable row level security;
alter table public.npc_memories enable row level security;
alter table public.npc_interactions enable row level security;
alter table public.legal_actions enable row level security;
alter table public.legal_decisions enable row level security;
alter table public.game_currencies enable row level security;
alter table public.catalog_items enable row level security;
alter table public.reward_definitions enable row level security;
alter table public.player_wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.player_inventory enable row level security;
alter table public.game_features enable row level security;
alter table public.game_settings enable row level security;
alter table public.content_versions enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "published npcs are readable" on public.npcs;
create policy "published npcs are readable" on public.npcs for select to anon, authenticated using (status = 'published' and is_active = true);

drop policy if exists "published case npcs are readable" on public.case_npcs;
create policy "published case npcs are readable" on public.case_npcs for select to anon, authenticated using (
  exists (select 1 from public.cases c where c.id = case_id and c.status = 'published' and c.is_active = true)
  and exists (select 1 from public.npcs n where n.id = npc_id and n.status = 'published' and n.is_active = true)
);

drop policy if exists "own npc state is readable" on public.npc_player_state;
create policy "own npc state is readable" on public.npc_player_state for select to authenticated using (
  exists (select 1 from public.careers c where c.id = career_id and c.user_id = auth.uid())
);
drop policy if exists "own npc memories are readable" on public.npc_memories;
create policy "own npc memories are readable" on public.npc_memories for select to authenticated using (
  exists (select 1 from public.careers c where c.id = career_id and c.user_id = auth.uid())
);
drop policy if exists "own npc interactions are readable" on public.npc_interactions;
create policy "own npc interactions are readable" on public.npc_interactions for select to authenticated using (
  exists (select 1 from public.careers c where c.id = career_id and c.user_id = auth.uid())
);
drop policy if exists "own legal actions are readable" on public.legal_actions;
create policy "own legal actions are readable" on public.legal_actions for select to authenticated using (
  exists (select 1 from public.careers c where c.id = career_id and c.user_id = auth.uid())
);
drop policy if exists "own legal decisions are readable" on public.legal_decisions;
create policy "own legal decisions are readable" on public.legal_decisions for select to authenticated using (
  exists (
    select 1 from public.legal_actions a
    join public.careers c on c.id = a.career_id
    where a.id = legal_action_id and c.user_id = auth.uid()
  )
);

drop policy if exists "published currencies are readable" on public.game_currencies;
create policy "published currencies are readable" on public.game_currencies for select to anon, authenticated using (status = 'published' and is_active = true);
drop policy if exists "published catalog is readable" on public.catalog_items;
create policy "published catalog is readable" on public.catalog_items for select to anon, authenticated using (status = 'published' and is_active = true);
drop policy if exists "published rewards are readable" on public.reward_definitions;
create policy "published rewards are readable" on public.reward_definitions for select to anon, authenticated using (status = 'published' and is_active = true);

drop policy if exists "own wallets are readable" on public.player_wallets;
create policy "own wallets are readable" on public.player_wallets for select to authenticated using (
  exists (select 1 from public.careers c where c.id = career_id and c.user_id = auth.uid())
);
drop policy if exists "own wallet transactions are readable" on public.wallet_transactions;
create policy "own wallet transactions are readable" on public.wallet_transactions for select to authenticated using (
  exists (select 1 from public.careers c where c.id = career_id and c.user_id = auth.uid())
);
drop policy if exists "own inventory is readable" on public.player_inventory;
create policy "own inventory is readable" on public.player_inventory for select to authenticated using (
  exists (select 1 from public.careers c where c.id = career_id and c.user_id = auth.uid())
);

drop policy if exists "published features are readable" on public.game_features;
create policy "published features are readable" on public.game_features for select to anon, authenticated using (status = 'published' and is_active = true);
drop policy if exists "public settings are readable" on public.game_settings;
create policy "public settings are readable" on public.game_settings for select to anon, authenticated using (status = 'published' and is_public = true);

-- content_versions e admin_audit_logs não recebem policy pública: somente service_role.

-- =========================================================
-- COMPRA ATÔMICA — EXECUTADA NO SUPABASE, NÃO NA VERCEL
-- =========================================================

create or replace function public.purchase_catalog_item(p_career_id uuid, p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_currency text;
  v_price bigint;
  v_balance bigint;
begin
  select user_id into v_user_id from public.careers where id = p_career_id;
  if v_user_id is null or v_user_id <> auth.uid() then
    raise exception 'career_not_owned';
  end if;

  select price_currency, price_amount into v_currency, v_price
  from public.catalog_items
  where id = p_item_id and status = 'published' and is_active = true;

  if v_currency is null then
    raise exception 'item_unavailable';
  end if;

  select balance into v_balance
  from public.player_wallets
  where career_id = p_career_id and currency_id = v_currency
  for update;

  if v_balance is null or v_balance < v_price then
    raise exception 'insufficient_balance';
  end if;

  update public.player_wallets
  set balance = balance - v_price, updated_at = now()
  where career_id = p_career_id and currency_id = v_currency;

  insert into public.wallet_transactions(career_id, currency_id, amount, transaction_type, reference_type, reference_id)
  values (p_career_id, v_currency, -v_price, 'purchase', 'catalog_item', p_item_id);

  insert into public.player_inventory(career_id, catalog_item_id, quantity)
  values (p_career_id, p_item_id, 1)
  on conflict (career_id, catalog_item_id)
  do update set quantity = public.player_inventory.quantity + 1, updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'item_id', p_item_id,
    'currency', v_currency,
    'spent', v_price,
    'balance', v_balance - v_price
  );
end;
$$;

revoke all on function public.purchase_catalog_item(uuid, text) from public;
grant execute on function public.purchase_catalog_item(uuid, text) to authenticated;

-- =========================================================
-- SEEDS ADMINISTRATIVOS INICIAIS
-- =========================================================

insert into public.game_currencies(id, name, symbol, currency_type, status, is_active, metadata)
values ('creditos', 'Créditos', 'CR', 'common', 'published', true, '{"system":true}'::jsonb)
on conflict (id) do nothing;

insert into public.game_features(id, name, description, status, is_active, config)
values
  ('sj_evidence_shield', 'Blindagem de Provas', 'Simulação gamificada de preservação e integridade de evidências digitais.', 'draft', false, '{}'::jsonb),
  ('sj_digital_signature', 'Assinatura Digital', 'Fluxo gamificado de assinatura e formalização de documentos.', 'draft', false, '{}'::jsonb),
  ('sj_extrajudicial_notice', 'Notificação Extrajudicial', 'Envio e acompanhamento simulados de notificações extrajudiciais.', 'draft', false, '{}'::jsonb),
  ('sj_crm', 'CRM Jurídico', 'Experiência simulada de relacionamento, tarefas e acompanhamento do cliente.', 'draft', false, '{}'::jsonb)
on conflict (id) do nothing;

comment on table public.npcs is 'NPCs persistentes do universo. Conteúdo-base criado pelo rota-admin; memória dinâmica fica em npc_memories/npc_player_state.';
comment on table public.legal_decisions is 'Decisões determinísticas de NPCs produzidas pelo motor server-side do Supabase.';
comment on table public.catalog_items is 'Catálogo administrável de skins, cosméticos, utilidades e itens do jogo.';
comment on table public.content_versions is 'Snapshots de conteúdo antes da publicação, permitindo rollback futuro.';
comment on table public.admin_audit_logs is 'Auditoria das mutações realizadas pelo painel local.';

commit;
