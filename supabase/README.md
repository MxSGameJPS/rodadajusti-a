# Banco do Rota da Justiça

## Aplicação das migrations

As migrations ficam em `supabase/migrations/` e devem ser executadas em ordem pelo nome do arquivo. Para uma instalação nova, a sequência atual é:

1. `20260901023500_create_game_core.sql`
2. `20260901030000_create_cases_catalog.sql`
3. `20260901030100_seed_legacy_cases.sql`
4. `20260901040000_create_admin_universe.sql`
5. `20260901040100_add_reward_claims.sql`
6. `20260901190000_create_professional_exams.sql`
7. `20260901190100_seed_oab_46_2026_exam.sql`
8. `20260901190101` até `20260901190108` — questões da OAB
9. `20260901210000_expand_academic_and_special_careers.sql`
10. `20260901210100_progression_exam_runtime.sql`
11. `20260901220000_oab_exam_modes.sql`
12. `20260905043000_create_character_portraits_bucket.sql`
13. `20260905084500_repair_submit_exam_attempt_rpc.sql`
14. `20260906023500_case_repercussion_and_appeals.sql`
15. `20260906120000_create_law_firm_market_runtime.sql`
16. `20260906130000_seed_ramos_associados.sql`

A migration do Mercado de Trabalho precisa rodar **antes** do seed do Ramos & Associados, porque o seed utiliza `law_firms`, `law_firm_roles` e `law_firm_members`.

## Seed dos casos legados

`20260901030100_seed_legacy_cases.sql` é gerado automaticamente a partir do acervo TypeScript existente (`src/data/cases.ts` + `src/data/casesExpansion.ts`). Antes de reaplicar o seed, execute na raiz:

```bash
npm run db:generate-cases-seed
```

O seed usa UPSERT e pode ser reaplicado sem duplicar casos.

## Estrutura principal

`20260901023500_create_game_core.sql` cria a base persistente do jogador:

- `profiles`
- `careers`
- `game_saves`
- `case_progress`
- `career_events`

Também configura índices, `updated_at`, criação automática/backfill de perfis e Row Level Security.

## Catálogo e universo administrável

`public.cases` guarda os metadados indexáveis do caso em colunas, enquanto investigação, locais, pistas e estratégias ficam no conteúdo JSONB.

O universo administrável acrescenta NPCs persistentes, relações NPC↔caso, memória/interações, recompensas e estruturas consumidas pelo Rota Admin.

## Mercado de Trabalho

`20260906120000_create_law_firm_market_runtime.sql` fecha o contrato entre o Rota Admin e o jogo para empregos jurídicos.

Ela cria/versiona:

- `law_firms`
- `law_firm_roles`
- `law_firm_members`
- `career_law_firm_offers`
- vínculo atual da carreira com escritório/cargo
- políticas RLS para leitura do universo publicado e manipulação das próprias propostas

Tipos oficiais de oferta do Recruitment V1:

- `POST_OAB`
- `CONTINUITY`
- `HEADHUNTING`
- `APPLICATION_APPROVED`
- `POST_TERMINATION`
- `COUNTEROFFER`
- `RETURN`

Se houver propostas legadas com tipos fora desse contrato, a migration interrompe a execução e pede revisão manual em vez de converter silenciosamente.

## Compatibilidade e fallback

O jogo continua usando cache/localStorage em partes do runtime para permitir recuperação e funcionamento parcial quando a rede estiver indisponível. Catálogo de casos e Mercado de Trabalho tentam usar o Supabase primeiro e mantêm fallback onde isso não compromete a integridade do fluxo.

## Aplicação manual

O conector administrativo disponível nesta conversa não está apontando para o projeto Supabase do Rota da Justiça. Portanto estas migrations estão versionadas no repositório, mas precisam ser aplicadas no projeto correto pelo SQL Editor/Supabase CLI antes de testar o Mercado de Trabalho em produção.
