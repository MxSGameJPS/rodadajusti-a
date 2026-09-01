# Banco do Rota da Justiça

## Ordem de aplicação no SQL Editor

1. `supabase/migrations/20260901023500_create_game_core.sql`
2. `supabase/migrations/20260901030000_create_cases_catalog.sql`
3. `supabase/migrations/20260901030100_seed_legacy_cases.sql`

As duas primeiras migrations já ficam versionadas no repositório.

O terceiro arquivo é gerado automaticamente a partir de todo o acervo TypeScript existente (`src/data/cases.ts` + `src/data/casesExpansion.ts`). Antes de abrir o SQL Editor, execute na raiz do projeto:

```bash
npm run db:generate-cases-seed
```

Isso cria/atualiza:

```text
supabase/migrations/20260901030100_seed_legacy_cases.sql
```

O seed usa UPSERT, então pode ser executado novamente sem duplicar casos.

## Estrutura principal

A migration `20260901023500_create_game_core.sql` cria:

- `profiles`
- `careers`
- `game_saves`
- `case_progress`
- `career_events`

Também configura índices, `updated_at` automático, criação automática/backfill de `profiles` e Row Level Security para que cada jogador só acesse os próprios dados.

## Catálogo de casos

`public.cases` guarda os metadados indexáveis do caso em colunas — carreira mínima, dificuldade, XP, recompensa, ordem, status e versão — enquanto a investigação completa fica em `content JSONB`.

Essa arquitetura foi preparada para o painel administrativo futuro: o painel poderá criar, editar, publicar, arquivar e versionar casos sem precisar fazer novo deploy do jogo. Jogadores possuem apenas leitura de casos publicados; escrita fica reservada ao backend/service role do painel.

## Compatibilidade durante a migração

O web game tenta carregar o catálogo publicado do Supabase. Se a tabela ainda não existir, estiver vazia ou houver falha de rede, ele usa o cache local e por último o acervo TypeScript legado. Portanto a preparação do banco não quebra o MVP.

## Aplicação manual

Enquanto o conector administrativo desta conversa não estiver apontando para a organização correta do Supabase do jogo, copie cada migration na ordem acima e execute no SQL Editor do projeto Rota da Justiça.
