# Auditoria 2 — Entrada da carreira e assinatura do estágio

Data: 2026-10-08. Branch: `main`.

## Escopo
Pós-vídeo, introdução narrativa, cidade/UF, residência, área jurídica, aceite do estágio, primeiro diálogo com Mariana Duarte.

## Implementação
- `CareerOriginGate` consulta e registra cidade/UF por `auth.uid()` na nova tabela `player_onboarding`. Uma chave local de outro jogador deixa de determinar a origem de conta nova.
- Nova migração: `supabase/migrations/20261008093000_create_player_onboarding_city.sql`, aplicada ao projeto `ibbfwxqpowcwpuasxxdl`; FK `auth.users` com `ON DELETE CASCADE`, RLS por `auth.uid() = user_id`.
- `NewGameModal` restaura cidade/UF a partir do Supabase. Se o endereço informado diferir da cidade escolhida, solicita confirmação antes de alterar a cidade-base. Não persiste a proposta assinada em localStorage.
- A área `initialFocus` escolhida é transferida à carreira no estado persistido e à coluna `careers.main_area` preexistente.
- `handleStartNewGame` aguarda `persistPlayerCloudSave` antes da abertura de `OfficeWelcomeDialog`. Em falhas, o usuário permanece no formulário e recebe erro; a confirmação visual não implica sucesso antes da resposta do banco.
- A carreira recebe `onboardingStage: WELCOME_PENDING` ao aceitar o contrato e `COMPLETE` somente após concluir Mariana e persistir novamente. Na atualização de página enquanto Mariana aparece, a carreira é recuperada do Supabase e seu diálogo pode reiniciar; o contrato não é assinado outra vez.
- O contrato recebe a opção de foco e mantém a escolha afetiva e endereço com a carreira.

## Observações
- `player_onboarding` armazena apenas cidade/UF por conta antes da criação da carreira; após contratação, o estado completo é salvo em `game_saves`.
- A engine ainda usa cache local em outros módulos. A correção isola **este onboarding**; não equivale à migração completa do armazenamento do jogo.
- O nome da cidade da proposta e a geocodificação são dependentes de serviços externos; conferir falha/retry em dispositivos móveis.
- Nenhuma carteira ou save existente foi apagado por estas alterações.

## Homologação pendente
Executar localmente: `npm run lint` e `npm run build`; testar contas A/B no mesmo navegador, completar a origem, cancelar troca de município, validar endereço, assinar contrato, recarregar durante Mariana, retomar com segundo navegador, concluir o diálogo, verificar que não repete e checar `careers.main_area` e `game_saves.game_state.onboardingStage` no banco.

Status: **IMPLEMENTADO — TESTE FUNCIONAL PENDENTE**. Não marcar homologada sem build e testes em produção.

## Complementos aplicados
- Segunda migração: `supabase/migrations/20261008094000_add_player_onboarding_intro_checkpoint.sql` (aplicada), coluna `intro_seen`, para não reiniciar a narrativa depois de concluída na mesma conta.
- Contrato agora mostra o nome do jogador, supervisão, valor da bolsa e natureza fictícia; o aceite exige marcação explícita.
- Quando há alteração da cidade no formulário de residência, exige confirmação e atualiza `player_onboarding` antes de criar a carreira.
- Após criar a carreira em nuvem, a cidade-base volta a inicializar o perfil do mapa.
- `careers.main_area` é sincronizada na inserção e nas atualizações.
- Falhas na leitura do checkpoint exibem ação de tentar novamente, sem iniciar etapas com estado desconhecido.
- Schema e RLS de `player_onboarding` conferidos diretamente por SQL no projeto remoto.

**Nota:** ambiente de execução desta conversa não conseguiu acessar o servidor GitHub para clonar o repositório (`Could not resolve host: github.com`), portanto build/lint ainda não foram executados e a etapa depende do teste do proprietário.
