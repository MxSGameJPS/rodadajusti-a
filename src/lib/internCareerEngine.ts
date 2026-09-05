import type {
  CareerTierId,
  JudicialAssessment,
  OfficeDisciplineState,
  OfficePerformanceEvaluation,
  OfficePerformanceState,
  SupervisorReview,
} from '../types/game';

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
