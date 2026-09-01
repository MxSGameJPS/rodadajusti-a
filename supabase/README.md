# Banco do Rota da Justiça

A migration principal do MVP está em:

`supabase/migrations/20260901023500_create_game_core.sql`

Ela cria:

- `profiles`
- `careers`
- `game_saves`
- `case_progress`
- `career_events`

Também configura:

- índices para consultas por usuário, carreira, caso e data;
- `updated_at` automático;
- criação automática de `profiles` para novos usuários do Supabase Auth;
- backfill de usuários já existentes;
- Row Level Security (RLS);
- bloqueio de acesso para `anon`;
- acesso dos usuários autenticados somente aos próprios dados.

## Aplicação manual

Enquanto o conector administrativo não estiver apontando para a organização correta do Supabase do jogo, copie o conteúdo da migration e execute no SQL Editor do projeto do Rota da Justiça.

Após executar, confirme no Table Editor que as cinco tabelas foram criadas e que RLS está habilitado em todas elas.

## Próxima etapa

Depois da migration aplicada, conectar o estado atual salvo em `localStorage` à tabela `game_saves`, mantendo `localStorage` como cache/fallback offline e o Supabase como persistência principal.
