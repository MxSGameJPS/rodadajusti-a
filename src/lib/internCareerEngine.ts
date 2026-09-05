import type {
  CareerTierId,
  JudicialAssessment,
  OfficeDisciplineState,
  OfficePerformanceEvaluation,
  OfficePerformanceState,
  SupervisorReview,
} from '../types/game';

export interface OfficeTaskChallengeOption {
  id: string;
  label: string;
}

export interface OfficeTaskChallengeStep {
  id: string;
  context: string;
  prompt: string;
  options: OfficeTaskChallengeOption[];
  correctOptionId: string;
  successFeedback: string;
  retryFeedback: string;
}

export interface OfficeStageTask {
  id: string;
  stage: 'ESTAGIARIO' | 'ESTAGIARIO_SENIOR';
  title: string;
  description: string;
  supervisorNote: string;
  xpReward: number;
  moneyReward: number;
  deltas: {
    technique?: number;
    diligence?: number;
    ethics?: number;
    deadlineManagement?: number;
    supervisorTrust?: number;
  };
  challengeSteps: OfficeTaskChallengeStep[];
}

export interface PromotionRequirement {
  id: string;
  label: string;
  current: string;
  met: boolean;
}

export interface InternPromotionStatus {
  eligible: boolean;
  progressPercent: number;
  requirements: PromotionRequirement[];
}

export interface OabPreparationStatus {
  ready: boolean;
  progressPercent: number;
  requirements: PromotionRequirement[];
}

export const DEFAULT_OFFICE_PERFORMANCE: OfficePerformanceState = {
  technique: 50,
  diligence: 52,
  ethics: 85,
  deadlineManagement: 55,
  supervisorTrust: 50,
  completedTaskIds: [],
  evaluations: [],
};

export const OFFICE_STAGE_TASKS: OfficeStageTask[] = [
  {
    id: 'intern-prazos-agenda',
    stage: 'ESTAGIARIO',
    title: 'Conferir prazos e agenda processual',
    description: 'Revise a agenda do escritório, identifique vencimentos e organize os compromissos prioritários do dia.',
    supervisorNote: 'Prazo não se recupera com boa intenção. Quero ver método e atenção antes de autonomia.',
    xpReward: 55,
    moneyReward: 120,
    deltas: { diligence: 3, deadlineManagement: 4, supervisorTrust: 2 },
    challengeSteps: [
      {
        id: 'prazos-01',
        context: 'A agenda tem três compromissos: uma peça vence hoje às 18h e ainda aguarda documento do cliente; uma reunião interna é amanhã; uma pesquisa sem prazo definido foi solicitada para a semana.',
        prompt: 'Qual item deve receber prioridade imediata?',
        options: [
          { id: 'a', label: 'A reunião interna de amanhã, porque envolve toda a equipe.' },
          { id: 'b', label: 'A peça que vence hoje, confirmando também o documento pendente.' },
          { id: 'c', label: 'A pesquisa sem prazo, para adiantar trabalho futuro.' },
        ],
        correctOptionId: 'b',
        successFeedback: 'Correto. Você identificou o risco mais imediato e vinculou o prazo à pendência que pode impedir a entrega.',
        retryFeedback: 'O escritório precisa priorizar primeiro aquilo que pode perder utilidade hoje. Reavalie o impacto do vencimento.',
      },
      {
        id: 'prazos-02',
        context: 'Ao conferir a agenda, você percebe que o compromisso foi anotado, mas não há confirmação de quem ficará responsável pela conferência final.',
        prompt: 'Qual é a conduta mais segura?',
        options: [
          { id: 'a', label: 'Presumir que o advogado responsável já viu a agenda.' },
          { id: 'b', label: 'Apagar o compromisso e cadastrá-lo novamente depois.' },
          { id: 'c', label: 'Registrar a pendência e confirmar imediatamente o responsável pela entrega.' },
        ],
        correctOptionId: 'c',
        successFeedback: 'Boa. Agenda sem responsável definido ainda é risco. Você fechou a lacuna antes que ela virasse problema.',
        retryFeedback: 'Não basta o prazo estar cadastrado. Pense em como garantir que alguém assumiu efetivamente a responsabilidade.',
      },
    ],
  },
  {
    id: 'intern-jurisprudencia',
    stage: 'ESTAGIARIO',
    title: 'Pesquisa de jurisprudência',
    description: 'Faça uma pesquisa orientada e entregue ao supervisor uma síntese objetiva com precedentes úteis.',
    supervisorNote: 'Não basta achar decisão parecida. Você precisa entender por que ela serve para o caso.',
    xpReward: 70,
    moneyReward: 140,
    deltas: { technique: 4, diligence: 2, supervisorTrust: 2 },
    challengeSteps: [
      {
        id: 'juris-01',
        context: 'Você encontrou três julgados. Um tem palavras muito parecidas com o caso, mas trata de contexto jurídico diferente. Outro enfrenta diretamente a mesma controvérsia, embora use termos menos semelhantes. O terceiro é uma notícia sobre julgamento.',
        prompt: 'Qual material merece maior peso na pesquisa?',
        options: [
          { id: 'a', label: 'O julgado que enfrenta diretamente a mesma controvérsia jurídica.' },
          { id: 'b', label: 'O julgado com mais palavras iguais ao relato do cliente.' },
          { id: 'c', label: 'A notícia, porque é mais fácil de resumir.' },
        ],
        correctOptionId: 'a',
        successFeedback: 'Exato. A utilidade vem da razão jurídica aplicável ao problema, não apenas de coincidência de palavras.',
        retryFeedback: 'Procure o material que realmente resolve a controvérsia jurídica semelhante, e não apenas o que parece parecido visualmente.',
      },
      {
        id: 'juris-02',
        context: 'O Dr. Roberto pediu uma síntese de uma página. Você tem cinco decisões potencialmente úteis.',
        prompt: 'Como entregar uma pesquisa profissional?',
        options: [
          { id: 'a', label: 'Copiar longos trechos de todas as decisões sem comentar.' },
          { id: 'b', label: 'Selecionar os precedentes mais pertinentes e explicar, em poucas linhas, por que ajudam ou limitam a tese.' },
          { id: 'c', label: 'Entregar somente os links e deixar a leitura para o supervisor.' },
        ],
        correctOptionId: 'b',
        successFeedback: 'Correto. Pesquisa útil economiza tempo do supervisor e mostra o raciocínio por trás da seleção.',
        retryFeedback: 'A tarefa não é apenas localizar decisões; é transformar a pesquisa em informação útil para quem vai decidir a estratégia.',
      },
    ],
  },
  {
    id: 'intern-documentos',
    stage: 'ESTAGIARIO',
    title: 'Organizar documentos de um atendimento',
    description: 'Classifique documentos, elimine duplicidades e destaque o que ainda precisa ser solicitado ao cliente.',
    supervisorNote: 'Um processo bem instruído começa muito antes da petição. Organização também é trabalho jurídico.',
    xpReward: 50,
    moneyReward: 110,
    deltas: { diligence: 4, supervisorTrust: 2 },
    challengeSteps: [
      {
        id: 'docs-01',
        context: 'A pasta do cliente contém duas cópias idênticas de um comprovante, um documento legível e um arquivo sem identificação clara.',
        prompt: 'Qual é a melhor primeira organização?',
        options: [
          { id: 'a', label: 'Manter tudo como está para não correr risco de apagar nada.' },
          { id: 'b', label: 'Separar duplicidades, identificar o documento válido e marcar o arquivo duvidoso para conferência.' },
          { id: 'c', label: 'Excluir todo arquivo que não esteja perfeitamente nomeado.' },
        ],
        correctOptionId: 'b',
        successFeedback: 'Certo. Você preservou o que importa, reduziu ruído e deixou a dúvida claramente sinalizada para conferência.',
        retryFeedback: 'Organização não significa apagar indiscriminadamente nem aceitar duplicidade. O objetivo é clareza e rastreabilidade.',
      },
      {
        id: 'docs-02',
        context: 'Ao final da triagem, falta justamente um documento mencionado pelo cliente como essencial ao fato principal.',
        prompt: 'O que deve constar na entrega ao supervisor?',
        options: [
          { id: 'a', label: 'Nada. É melhor não destacar o que está faltando.' },
          { id: 'b', label: 'Uma pendência objetiva informando qual documento ainda precisa ser solicitado e por quê.' },
          { id: 'c', label: 'Um documento substituto criado a partir do relato do cliente.' },
        ],
        correctOptionId: 'b',
        successFeedback: 'Perfeito. A lacuna ficou visível antes da petição e poderá ser sanada pelo escritório.',
        retryFeedback: 'Uma pasta organizada também precisa deixar claro o que ainda não existe. Nunca se inventa documento para preencher lacuna.',
      },
    ],
  },
  {
    id: 'intern-minuta',
    stage: 'ESTAGIARIO',
    title: 'Preparar minuta supervisionada',
    description: 'Estruture uma minuta simples para revisão do Dr. Roberto Ramos, separando fatos, fundamentos e pedidos.',
    supervisorNote: 'Quero uma peça que eu consiga revisar, não uma peça que eu precise reescrever inteira.',
    xpReward: 80,
    moneyReward: 160,
    deltas: { technique: 4, diligence: 2, supervisorTrust: 3 },
    challengeSteps: [
      {
        id: 'minuta-01',
        context: 'Você recebeu relato do cliente, documentos básicos e a orientação jurídica do advogado responsável.',
        prompt: 'Qual estrutura torna a minuta mais fácil de revisar?',
        options: [
          { id: 'a', label: 'Misturar fatos, argumentos e pedidos em ordem cronológica livre.' },
          { id: 'b', label: 'Separar fatos relevantes, fundamentos jurídicos e pedidos de forma lógica.' },
          { id: 'c', label: 'Começar pelos pedidos e deixar os fatos para o final.' },
        ],
        correctOptionId: 'b',
        successFeedback: 'Boa estrutura. O supervisor consegue conferir se cada fundamento conversa com os fatos e com o que foi pedido.',
        retryFeedback: 'Pense na revisão: a peça precisa permitir que outra pessoa identifique rapidamente fatos, fundamento e conclusão.',
      },
      {
        id: 'minuta-02',
        context: 'Existe uma informação importante no relato do cliente, mas ela ainda não está comprovada pelos documentos disponíveis.',
        prompt: 'Como tratar isso na minuta?',
        options: [
          { id: 'a', label: 'Apresentar como fato incontroverso para fortalecer a peça.' },
          { id: 'b', label: 'Omitir definitivamente a informação do dossiê.' },
          { id: 'c', label: 'Sinalizar a informação e a necessidade de confirmação/prova antes da versão final.' },
        ],
        correctOptionId: 'c',
        successFeedback: 'Correto. Você não transformou uma alegação ainda não comprovada em certeza documental.',
        retryFeedback: 'Minuta supervisionada também serve para apontar riscos. Não trate como comprovado aquilo que ainda depende de confirmação.',
      },
    ],
  },
  {
    id: 'senior-instrucao-probatoria',
    stage: 'ESTAGIARIO_SENIOR',
    title: 'Revisar instrução probatória',
    description: 'Audite um dossiê antes do protocolo e identifique lacunas, inconsistências e documentos que exigem confirmação.',
    supervisorNote: 'Agora eu espero que você enxergue o problema antes que ele chegue à mesa do juiz.',
    xpReward: 95,
    moneyReward: 210,
    deltas: { technique: 2, diligence: 5, supervisorTrust: 3 },
    challengeSteps: [
      {
        id: 'instrucao-01',
        context: 'A tese depende de três fatos centrais. Dois estão bem documentados; o terceiro aparece apenas em uma mensagem sem contexto completo.',
        prompt: 'Qual é a conclusão mais responsável antes do protocolo?',
        options: [
          { id: 'a', label: 'A instrução está completa porque já existem várias páginas no dossiê.' },
          { id: 'b', label: 'Existe uma lacuna relevante; é preciso buscar confirmação do terceiro fato ou ajustar a estratégia.' },
          { id: 'c', label: 'Basta anexar a mensagem e deixar o juiz descobrir o contexto.' },
        ],
        correctOptionId: 'b',
        successFeedback: 'Isso. Quantidade de documentos não substitui prova do fato que realmente sustenta a tese.',
        retryFeedback: 'Auditoria probatória exige comparar cada ponto importante da tese com aquilo que efetivamente o demonstra.',
      },
      {
        id: 'instrucao-02',
        context: 'Você encontra dois documentos com datas incompatíveis entre si, ambos aparentemente relevantes.',
        prompt: 'Qual deve ser o próximo passo?',
        options: [
          { id: 'a', label: 'Anexar os dois sem comentar para aumentar o volume probatório.' },
          { id: 'b', label: 'Escolher o que favorece o cliente e ocultar o outro.' },
          { id: 'c', label: 'Interromper a conclusão, verificar a origem e esclarecer a inconsistência antes de usar o material.' },
        ],
        correctOptionId: 'c',
        successFeedback: 'Perfeito. Inconsistência detectada antes do protocolo é problema controlável; depois, pode comprometer a credibilidade da prova.',
        retryFeedback: 'Como Sênior, sua função é justamente impedir que contradições não verificadas avancem para o processo.',
      },
    ],
  },
  {
    id: 'senior-audiencia',
    stage: 'ESTAGIARIO_SENIOR',
    title: 'Preparar roteiro de audiência',
    description: 'Monte um roteiro com fatos controvertidos, perguntas úteis e riscos processuais para acompanhamento do advogado responsável.',
    supervisorNote: 'Audiência não é lugar para improvisar o que já poderia ter sido preparado no escritório.',
    xpReward: 105,
    moneyReward: 230,
    deltas: { technique: 4, deadlineManagement: 3, supervisorTrust: 3 },
    challengeSteps: [
      {
        id: 'audiencia-01',
        context: 'O dossiê tem dez fatos, mas apenas três estão realmente controvertidos entre as partes.',
        prompt: 'Como deve começar o roteiro?',
        options: [
          { id: 'a', label: 'Pelos três fatos controvertidos e pelo objetivo de esclarecimento de cada um.' },
          { id: 'b', label: 'Por perguntas genéricas sobre toda a vida das partes.' },
          { id: 'c', label: 'Por uma lista aleatória de perguntas para evitar previsibilidade.' },
        ],
        correctOptionId: 'a',
        successFeedback: 'Correto. O roteiro passa a ter finalidade: esclarecer exatamente o que ainda está em disputa.',
        retryFeedback: 'Audiência eficiente não é quantidade de perguntas; é foco nos fatos que precisam ser esclarecidos.',
      },
      {
        id: 'audiencia-02',
        context: 'Uma pergunta do roteiro já pressupõe que a testemunha concorda com um fato que ainda está em disputa.',
        prompt: 'Qual ajuste é mais adequado?',
        options: [
          { id: 'a', label: 'Manter a pergunta porque ela conduz à resposta desejada.' },
          { id: 'b', label: 'Reformular de modo claro, buscando o fato sem embutir a conclusão na própria pergunta.' },
          { id: 'c', label: 'Apagar todas as perguntas sobre esse tema.' },
        ],
        correctOptionId: 'b',
        successFeedback: 'Boa. A pergunta passa a buscar informação em vez de apenas confirmar uma narrativa pronta.',
        retryFeedback: 'O roteiro deve ajudar a esclarecer fatos, não apenas induzir respostas que parecem convenientes.',
      },
    ],
  },
  {
    id: 'senior-minuta-complexa',
    stage: 'ESTAGIARIO_SENIOR',
    title: 'Elaborar minuta de maior complexidade',
    description: 'Prepare uma peça com mais autonomia, justificando a estratégia e apontando quais provas sustentam cada pedido.',
    supervisorNote: 'No estágio sênior, eu não quero apenas texto correto. Quero raciocínio jurídico demonstrável.',
    xpReward: 120,
    moneyReward: 260,
    deltas: { technique: 5, diligence: 2, supervisorTrust: 4 },
    challengeSteps: [
      {
        id: 'complexa-01',
        context: 'A minuta possui três pedidos, mas somente dois têm indicação clara da prova que os sustenta.',
        prompt: 'Antes de enviar ao supervisor, o que você deve fazer?',
        options: [
          { id: 'a', label: 'Manter os três pedidos; a fundamentação jurídica basta.' },
          { id: 'b', label: 'Verificar a base fática/probatória do terceiro pedido e justificar sua manutenção ou retirá-lo.' },
          { id: 'c', label: 'Adicionar um quarto pedido para equilibrar a peça.' },
        ],
        correctOptionId: 'b',
        successFeedback: 'Correto. A autonomia do Sênior aparece quando ele consegue explicar por que cada pedido está no processo.',
        retryFeedback: 'Uma peça complexa não melhora com mais pedidos; melhora quando cada conclusão tem suporte identificável.',
      },
      {
        id: 'complexa-02',
        context: 'Há duas estratégias juridicamente possíveis. Uma é mais agressiva, mas depende de prova ainda frágil; a outra é mais conservadora e está bem sustentada pelo dossiê.',
        prompt: 'Como apresentar isso ao Dr. Roberto?',
        options: [
          { id: 'a', label: 'Escolher a mais agressiva sem mencionar o risco.' },
          { id: 'b', label: 'Apresentar as duas opções, apontar o risco probatório e justificar a recomendação.' },
          { id: 'c', label: 'Evitar tomar posição e pedir que ele faça toda a análise.' },
        ],
        correctOptionId: 'b',
        successFeedback: 'Exatamente. Sênior não é quem decide sozinho tudo; é quem consegue entregar análise, risco e recomendação fundamentada.',
        retryFeedback: 'Autonomia profissional inclui comunicar riscos e justificar a decisão proposta, não escondê-los nem transferir toda análise ao supervisor.',
      },
    ],
  },
  {
    id: 'senior-preparatorio-oab',
    stage: 'ESTAGIARIO_SENIOR',
    title: 'Simulado interno de preparação para a OAB',
    description: 'Faça uma revisão interna de ética, processo e matérias-base antes de enfrentar o Exame da Ordem do jogo.',
    supervisorNote: 'Você já está perto de deixar o estágio. Agora precisa provar que consegue transformar prática em conhecimento consolidado.',
    xpReward: 130,
    moneyReward: 0,
    deltas: { technique: 4, ethics: 2, supervisorTrust: 3 },
    challengeSteps: [
      {
        id: 'oab-interna-01',
        context: 'Durante a preparação de um caso, aparece um documento que favorece muito o cliente, mas sua origem não pode ser confirmada.',
        prompt: 'Qual é a postura profissional adequada?',
        options: [
          { id: 'a', label: 'Usar o documento porque ele favorece a tese.' },
          { id: 'b', label: 'Verificar autenticidade e origem antes de considerar seu uso processual.' },
          { id: 'c', label: 'Alterar o arquivo para eliminar os sinais de dúvida.' },
        ],
        correctOptionId: 'b',
        successFeedback: 'Correto. Técnica sem integridade probatória não é bom exercício profissional.',
        retryFeedback: 'A preparação para a OAB dentro do jogo também mede responsabilidade ética. Prova duvidosa precisa ser verificada, não aproveitada cegamente.',
      },
      {
        id: 'oab-interna-02',
        context: 'Você percebe que não sabe responder com segurança uma questão técnica importante da peça que está revisando.',
        prompt: 'Qual atitude demonstra maturidade profissional?',
        options: [
          { id: 'a', label: 'Inventar uma resposta plausível para não parecer inseguro.' },
          { id: 'b', label: 'Pesquisar fonte confiável e, se necessário, levar a dúvida ao supervisor antes da conclusão.' },
          { id: 'c', label: 'Ignorar a questão e finalizar a peça.' },
        ],
        correctOptionId: 'b',
        successFeedback: 'Boa. Saber identificar limite, pesquisar e validar é parte da competência profissional que o exame pretende consolidar.',
        retryFeedback: 'Maturidade não é fingir certeza. É reconhecer a dúvida e resolvê-la antes que vire erro profissional.',
      },
    ],
  },
];

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function normalizeOfficePerformance(value?: Partial<OfficePerformanceState> | null): OfficePerformanceState {
  return {
    ...DEFAULT_OFFICE_PERFORMANCE,
    ...(value || {}),
    technique: clamp(Number(value?.technique ?? DEFAULT_OFFICE_PERFORMANCE.technique)),
    diligence: clamp(Number(value?.diligence ?? DEFAULT_OFFICE_PERFORMANCE.diligence)),
    ethics: clamp(Number(value?.ethics ?? DEFAULT_OFFICE_PERFORMANCE.ethics)),
    deadlineManagement: clamp(Number(value?.deadlineManagement ?? DEFAULT_OFFICE_PERFORMANCE.deadlineManagement)),
    supervisorTrust: clamp(Number(value?.supervisorTrust ?? DEFAULT_OFFICE_PERFORMANCE.supervisorTrust)),
    completedTaskIds: Array.isArray(value?.completedTaskIds) ? value!.completedTaskIds : [],
    evaluations: Array.isArray(value?.evaluations) ? value!.evaluations.slice(0, 20) : [],
  };
}

function applyDeltas(
  current: OfficePerformanceState,
  deltas: OfficeStageTask['deltas'],
): OfficePerformanceState {
  return {
    ...current,
    technique: clamp(current.technique + (deltas.technique || 0)),
    diligence: clamp(current.diligence + (deltas.diligence || 0)),
    ethics: clamp(current.ethics + (deltas.ethics || 0)),
    deadlineManagement: clamp(current.deadlineManagement + (deltas.deadlineManagement || 0)),
    supervisorTrust: clamp(current.supervisorTrust + (deltas.supervisorTrust || 0)),
  };
}

export function getTasksForTier(tier: CareerTierId) {
  if (tier !== 'ESTAGIARIO' && tier !== 'ESTAGIARIO_SENIOR') return [];
  return OFFICE_STAGE_TASKS.filter((task) => task.stage === tier);
}

export function completeOfficeTask(params: {
  current: OfficePerformanceState;
  careerTier: CareerTierId;
  taskId: string;
  completedDate: string;
}) {
  const current = normalizeOfficePerformance(params.current);
  const task = OFFICE_STAGE_TASKS.find((item) => item.id === params.taskId);

  if (!task || task.stage !== params.careerTier || current.completedTaskIds.includes(task.id)) {
    return { performance: current, task: null as OfficeStageTask | null };
  }

  const updated = applyDeltas(current, task.deltas);
  const evaluation: OfficePerformanceEvaluation = {
    id: `task-${task.id}-${Date.now()}`,
    source: 'TASK',
    title: task.title,
    date: params.completedDate,
    techniqueDelta: task.deltas.technique || 0,
    diligenceDelta: task.deltas.diligence || 0,
    ethicsDelta: task.deltas.ethics || 0,
    deadlineManagementDelta: task.deltas.deadlineManagement || 0,
    supervisorTrustDelta: task.deltas.supervisorTrust || 0,
  };

  return {
    task,
    performance: {
      ...updated,
      completedTaskIds: [...current.completedTaskIds, task.id],
      evaluations: [evaluation, ...current.evaluations].slice(0, 20),
    },
  };
}

export function applyCasePerformance(params: {
  current: OfficePerformanceState;
  assessment: JudicialAssessment;
  success: boolean;
  supervisorReview?: SupervisorReview | null;
  caseId: string;
  caseTitle: string;
  completedDate: string;
}): OfficePerformanceState {
  const current = normalizeOfficePerformance(params.current);
  const { assessment, supervisorReview } = params;

  // Escalas do motor judicial: tese 0–25, investigação 0–15 e prazo 0–5.
  let techniqueDelta = assessment.strategyScore >= 22 ? 5 : assessment.strategyScore >= 16 ? 2 : -4;
  let diligenceDelta = assessment.investigationScore >= 13 ? 5 : assessment.investigationScore >= 9 ? 2 : -5;
  let ethicsDelta = assessment.falseEvidenceIds.length > 0 ? -3 : 1;
  let deadlineManagementDelta = assessment.issues.includes('DEADLINE_MISSED') ? -10 : 3;
  let supervisorTrustDelta = params.success ? 5 : -3;

  if (assessment.issues.includes('NO_INVESTIGATION')) diligenceDelta -= 5;
  if (assessment.issues.includes('NO_EVIDENCE')) diligenceDelta -= 3;
  if (assessment.issues.includes('MISSING_CRUCIAL_EVIDENCE')) diligenceDelta -= 2;
  if (assessment.issues.includes('WRONG_STRATEGY')) techniqueDelta -= 2;

  if (supervisorReview?.severity === 'GRAVE') supervisorTrustDelta -= 10;
  else if (supervisorReview?.severity === 'ADVERTENCIA') supervisorTrustDelta -= 6;
  else if (supervisorReview?.severity === 'ORIENTACAO') supervisorTrustDelta -= 2;

  const deltas = {
    technique: techniqueDelta,
    diligence: diligenceDelta,
    ethics: ethicsDelta,
    deadlineManagement: deadlineManagementDelta,
    supervisorTrust: supervisorTrustDelta,
  };
  const updated = applyDeltas(current, deltas);
  const evaluation: OfficePerformanceEvaluation = {
    id: `case-${params.caseId}-${Date.now()}`,
    source: 'CASE',
    title: params.caseTitle,
    date: params.completedDate,
    techniqueDelta,
    diligenceDelta,
    ethicsDelta,
    deadlineManagementDelta,
    supervisorTrustDelta,
  };

  return {
    ...updated,
    evaluations: [evaluation, ...current.evaluations].slice(0, 20),
  };
}

function completedTasksForStage(performance: OfficePerformanceState, stage: 'ESTAGIARIO' | 'ESTAGIARIO_SENIOR') {
  const stageIds = new Set(OFFICE_STAGE_TASKS.filter((task) => task.stage === stage).map((task) => task.id));
  return performance.completedTaskIds.filter((id) => stageIds.has(id)).length;
}

export function getInternPromotionStatus(params: {
  casesSolved: number;
  xp: number;
  performance: OfficePerformanceState;
  discipline: OfficeDisciplineState;
}): InternPromotionStatus {
  const performance = normalizeOfficePerformance(params.performance);
  const internTasks = completedTasksForStage(performance, 'ESTAGIARIO');
  const requirements: PromotionRequirement[] = [
    { id: 'cases', label: 'Casos concluídos com êxito', current: `${params.casesSolved}/2`, met: params.casesSolved >= 2 },
    { id: 'xp', label: 'Experiência prática', current: `${params.xp}/350 XP`, met: params.xp >= 350 },
    { id: 'tasks', label: 'Tarefas supervisionadas', current: `${internTasks}/2`, met: internTasks >= 2 },
    { id: 'diligence', label: 'Diligência profissional', current: `${performance.diligence}/58`, met: performance.diligence >= 58 },
    { id: 'trust', label: 'Confiança do Dr. Roberto', current: `${performance.supervisorTrust}/58`, met: performance.supervisorTrust >= 58 },
    {
      id: 'discipline',
      label: 'Vínculo com o escritório',
      current: params.discipline.employmentStatus === 'ACTIVE' ? `${params.discipline.warningCount}/2 advertências` : 'Contrato encerrado',
      met: params.discipline.employmentStatus === 'ACTIVE' && params.discipline.warningCount < 2,
    },
  ];
  const metCount = requirements.filter((item) => item.met).length;
  return {
    eligible: metCount === requirements.length,
    progressPercent: Math.round((metCount / requirements.length) * 100),
    requirements,
  };
}

export function getOabPreparationStatus(params: {
  casesSolved: number;
  performance: OfficePerformanceState;
  discipline: OfficeDisciplineState;
}): OabPreparationStatus {
  const performance = normalizeOfficePerformance(params.performance);
  const seniorTasks = completedTasksForStage(performance, 'ESTAGIARIO_SENIOR');
  const requirements: PromotionRequirement[] = [
    { id: 'cases', label: 'Casos concluídos com êxito', current: `${params.casesSolved}/4`, met: params.casesSolved >= 4 },
    { id: 'tasks', label: 'Responsabilidades de Sênior', current: `${seniorTasks}/2`, met: seniorTasks >= 2 },
    { id: 'technique', label: 'Técnica profissional', current: `${performance.technique}/60`, met: performance.technique >= 60 },
    { id: 'trust', label: 'Confiança do supervisor', current: `${performance.supervisorTrust}/65`, met: performance.supervisorTrust >= 65 },
    { id: 'discipline', label: 'Contrato ativo', current: params.discipline.employmentStatus === 'ACTIVE' ? 'Ativo' : 'Encerrado', met: params.discipline.employmentStatus === 'ACTIVE' },
  ];
  const metCount = requirements.filter((item) => item.met).length;
  return {
    ready: metCount === requirements.length,
    progressPercent: Math.round((metCount / requirements.length) * 100),
    requirements,
  };
}
