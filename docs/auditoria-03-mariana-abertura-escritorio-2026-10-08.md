# Auditoria 3 — Mariana Duarte e abertura do escritório

Status: **IMPLEMENTADA — AGUARDANDO HOMOLOGAÇÃO FUNCIONAL**.

## Escopo
Primeiro diálogo de Mariana após assinatura, orientações sobre escritório e mecânicas do jogo, retomada do diálogo e primeira abertura do escritório.

## Alterações
- O diálogo foi ampliado de 6 para 8 etapas, com nome e cidade do jogador, interesse inicial em Direito e orientações para Dr. Roberto Ramos, agenda, presença, tarefas, casos, mapa, faculdade, necessidades e ética.
- A carreira armazena `welcomeDialogueStep` no JSON `game_saves.game_state`, atualizado e confirmado antes de avançar de etapa; ao recarregar com `onboardingStage=WELCOME_PENDING`, o diálogo retoma na etapa salva.
- Botões de avançar e finalizar ficam bloqueados durante operações assíncronas. Falhas de gravação mantêm a etapa atual, com mensagem e tentativa de novo envio.
- O encerramento da conversa persiste `onboardingStage=COMPLETE` antes de liberar o escritório (mecanismo implementado na Auditoria 2).
- No primeiro ingresso no escritório, o jogador recebe guia visual curto com Agenda, Casos e Vida Pessoal. A confirmação só fecha o guia após persistir `officeTutorialSeen=true` na carreira; a Agenda abre como primeira tarefa, respeitando as validações existentes de presença e horário.
- Este guia não se repete quando `officeTutorialSeen` está marcado na carreira.
- O processo introduz transição visual de acolhimento para a rotina por meio do painel guiado de primeira visita, sem modificar diretamente horários nem conceder recompensas.

## Banco de dados
Não foi necessária migração SQL nesta etapa: os campos `welcomeDialogueStep` e `officeTutorialSeen` são armazenados em `game_saves.game_state` (JSONB) já existente. A origem da cidade e o vínculo com a conta seguem as migrações da Auditoria 2.

## Testes de homologação requeridos
1. `npm run lint` e `npm run build`.
2. Assinar um novo estágio e verificar apresentação personalizada.
3. Avançar três falas de Mariana, atualizar página; garantir retomada na quarta.
4. Interromper conexão durante um avanço; verificar que não pula fala.
5. Concluir Mariana e verificar abertura do guia de primeira entrada.
6. Tentar desligar conexão ao confirmar guia; garantir que não fecha sem salvar.
7. Confirmar guia e verificar abertura da Agenda.
8. Voltar depois com navegador diferente; Mariana e guia não devem reaparecer.
9. Conferir responsividade e acessibilidade com movimento reduzido.
10. Validar Supabase `game_saves.game_state.welcomeDialogueStep`, `onboardingStage`, `officeTutorialSeen`.

Os testes manuais e a compilação precisam ser realizados no ambiente do jogo antes de considerar a Auditoria 3 homologada.
