# Edge Functions — Rota da Justiça

Estas funções executam lógica frequente/sensível no Supabase, evitando transformar a Vercel em backend do jogo.

## Funções

### `resolve-npc-action`

Motor determinístico inicial dos NPCs jurídicos.

Recebe uma ação autenticada do jogador, valida a carreira, carrega NPC/caso/progresso, calcula a decisão com base em prova, qualidade jurídica, integridade, urgência, personalidade e memória relacional, e grava:

- `legal_actions`
- `legal_decisions`
- `npc_interactions`
- `npc_player_state`
- `npc_memories`

Não usa IA externa no runtime.

### `purchase-item`

Recebe `careerId` + `itemId` e chama a RPC atômica `purchase_catalog_item` usando o JWT do jogador.

O banco valida saldo, item e propriedade da carreira antes de alterar carteira/inventário.

### `claim-reward`

Valida condições de uma `reward_definition` e aplica a recompensa através da RPC server-only `apply_reward_definition`.

Políticas de claim suportadas inicialmente:

- `once`
- `per_case`
- `daily`

## Deploy manual

Depois de vincular o Supabase CLI ao projeto correto do Rota:

```bash
supabase functions deploy resolve-npc-action
supabase functions deploy purchase-item
supabase functions deploy claim-reward
```

As funções usam automaticamente os secrets padrão do projeto:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Não coloque estas chaves no frontend do jogo.

## Ordem de banco

Antes de publicar as Edge Functions, aplique:

```text
20260901040000_create_admin_universe.sql
20260901040100_add_reward_claims.sql
```
