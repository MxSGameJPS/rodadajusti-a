# Auditoria 4 — Registro de entrada e briefing da Mariana

Status: **CORREÇÕES IMPLEMENTADAS — AGUARDANDO HOMOLOGAÇÃO** (2026-10-08).

## Modificações
- `prepareOfficeArrival` valida expediente com `getOfficeAccessDecision` (segunda a sexta, das 08h às 14h) e verifica se o dia já possui presença. A função constrói o registro sem efetuar escrita local.
- `commitInternshipRoutine` confirma a gravação no Supabase (tabela `internship_routines`) antes de salvar o cache local e permitir avaliação profissional, relacionamento e briefing.
- A operação de chegada possui trava contra acionamento simultâneo; falha de gravação resulta em mensagem e nenhuma consequência de presença.
- A checagem de saída antecipada recupera a saída prévia ANTES de registrar a nova saída.
- Mariana possui fala especial para o primeiro expediente, com indicação objetiva de abrir a Agenda e escolher tarefa supervisionada.
- Progresso por etapa do briefing é gravado no JSON `senior_state.briefingProgress` da rotina em nuvem, indexado pelo dia do jogo; o componente `NpcGuidanceDialog` suporta `initialStep`, `onStepChange` e bloqueia o avanço enquanto persiste.
- O encerramento do briefing grava `greetedWorkdays` no Supabase antes de fechar. Após carregar a rotina em outro acesso, caso a presença exista mas o briefing não tenha sido concluído, a conversa é apresentada novamente.

## Banco
Nenhuma migração de esquema foi necessária. O estado adicional ocupa JSONB já existente em `internship_routines.senior_state`.

## Limitações a verificar
- O processo de presença/efeitos é composto por múltiplas operações; a confirmação da presença está no banco antes dos efeitos, mas **a execução conjunta ainda não é transacional**.
- O registro de saída ainda usa código legado e deverá receber verificação de persistência prioritária em auditoria de saída.
- Testar recuperação no navegador de outro dispositivo, reação em dia não útil, fechamento de expediente, presença às 08h10/08h11/12h00, rede offline, duplo clique e recarga na etapa intermediária do diálogo.
- Lint, build e teste ponta a ponta ainda não foram executados nesta conversa.

## Homologação
Executar `npm run lint` e `npm run build`, testar o primeiro expediente, atualizar o navegador após a segunda fala, validar ausência de duplicidade de presença e inspeção de `internship_routines.attendance` e `senior_state.briefingProgress`.

## Homologação funcional — informada pelo responsável
Em 2026-10-08 o responsável confirmou testes e aprovou o registro de entrada e o diálogo de Mariana. **AUDITORIA 4 HOMOLOGADA FUNCIONALMENTE**. Esta aprovação não substitui lint/build nem a auditoria abrangente da Agenda e das Avaliações (Auditoria 5).
