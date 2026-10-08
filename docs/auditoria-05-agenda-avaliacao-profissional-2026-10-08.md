# Auditoria 5 — Agenda e avaliação profissional

**Status:** Correções principais implementadas na `main`; **AGUARDANDO LINT, BUILD E HOMOLOGAÇÃO FUNCIONAL**.

## Escopo
Atividades jurídicas supervisionadas, entregas, desafios, diálogos com Mariana, eventos de expediente, avaliação periódica pelo Dr. Roberto, recompensas, histórico e persistência na nuvem.

## Correções realizadas
1. **Entrega segura:** `InternOfficeTaskModal` espera `onComplete(taskId): Promise<boolean>` antes de fechar. Caso a entrega seja recusada por estudos, horário, localização, requisitos ou falha de rede, o modal permanece aberto e apresenta erro.
2. **Checkpoint de desafios:** o JSON da carreira armazena `officeTaskProgress[taskId] = {stepIndex, completedStepIds}`. Cada resposta correta e cada avanço solicitam confirmação de `persistPlayerCloudSave`. Ao reabrir o desafio, as etapas podem ser restauradas. Uma entrega concluída remove o checkpoint.
3. **Recompensas:** a função de conclusão calcula XP, JR$, progresso, promoção e horário, confirmando o estado final no Supabase antes de atualizar o jogador no cliente. Trava `officeTaskInFlightRef` impede duas conclusões simultâneas.
4. **Variação:** alternativas são embaralhadas deterministicamente pelo `avatarSeed` do personagem e ID da etapa, preservando correção e retomada do desafio.
5. **Periodicidade:** `getPeriodicReview` disponibiliza uma reunião por ciclo de cinco expedientes registrados, em lugar de liberar uma avaliação a cada novo dia após o quinto. O identificador passa a ser `review:cycle:N`.
6. **Deduplicação de avaliação:** IDs de reuniões pontuadas ficam em `processedOfficeReviewIds` do save. A rotina da reunião é registrada em `internship_routines.meetings`, com recuperação de sincronização parcial.
7. **Transparência:** o painel explica média das cinco competências e descontos por faltas e atrasos, e mostra as cinco reuniões mais recentes com nota e resumo.
8. **Eventos do escritório:** proteção contra múltiplos cliques e registro do ID em `handledOfficeEventKeys`, junto às consequências no save da carreira. Um diálogo da Mariana apresenta o resultado e a reflexão após a escolha.
9. **Distribuição diária:** após alocar tarefas no registro de presença, o fluxo solicita confirmação no Supabase antes do briefing (falhas exibem aviso).

## Banco
Não houve migrações de esquema. `officeTaskProgress`, `processedOfficeReviewIds` e `handledOfficeEventKeys` ficam no `game_saves.game_state` existente; `internship_routines` já registra tarefas diárias, frequência, diálogos e reuniões.

## Limitações e revisão pendente
- **Justificativas de faltas:** a aprovação é automática no fluxo legado. É necessário definir quais motivos/documentos o jogo aceita e o processo de análise do Dr. Roberto antes de redesenhar essa decisão. Não foi alterada nesta rodada.
- **Transações:** gravações do estado de carreira, relações NPC e rotina podem ocorrer em operações separadas. Idempotência no JSON reduz repetição, mas não substitui uma transação SQL em servidor para consistência estrita entre tabelas; deve entrar no hardening antes do beta aberto.
- **Distribuição diária após mudança de data:** a seleção é determinística e sincronizada via evento; conferir comportamento na troca rápida entre dispositivos.
- **Avaliações existentes:** reuniões legadas com identificadores antigos continuam no histórico; a nova sequência usa `review:cycle:N`.
- **Sem execução de lint/build e testes ponta a ponta nesta conversa.** O GitHub não apresentou status checks para o último commit consultado.

## Checklist de homologação
- `git pull origin main && npm run lint && npm run build`.
- Concluir desafio completo, testar falha por falta de estudo/horário, reabrir e verificar preservação do progresso.
- Atualizar a página após uma resposta correta; repetir em outro navegador com a mesma conta.
- Tentar duas entregas simultâneas; validar ausência de XP/JR$ duplicados.
- Avançar cinco dias úteis, abrir avaliação, concluir, recarregar; assegurar uma única pontuação. Avançar o sexto e sétimo dias, verificar que nova avaliação não aparece antes do décimo dia.
- Em evento de escritório, tentar resposta dupla e recarga; validar consequência sem duplicação.
- Conferir histórico de avaliações e reunião no Supabase.
- Testar o estágio sênior, desafios de etapa, promoções e regras de horário.

**Sem homologação automática: aguarda testes do responsável e resolução dos pontos pendentes de integridade antes da liberação geral.**

### Compatibilidade com reuniões antigas
A periodicidade considera agora também reuniões preexistentes com IDs legados `review:YYYY-MM-DD`, impedindo que a alteração para `review:cycle:N` gere novas avaliações para ciclos já pontuados.
