import type { PlayerProfile } from '../types/game';
import { getInternPromotionStatus, getOabPreparationStatus, normalizeOfficePerformance } from './internCareerEngine';

export type ActOneStageId =
  | 'ARRIVAL'
  | 'FIRST_DAY'
  | 'INTERN_FOUNDATIONS'
  | 'FIRST_CASES'
  | 'PROMOTION_REVIEW'
  | 'SENIOR_AUTONOMY'
  | 'OAB_PREPARATION'
  | 'ACT_ONE_COMPLETE';

export interface ActOneMilestone {
  id: ActOneStageId;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

export interface EarlyCareerSnapshot {
  stage: ActOneStageId;
  title: string;
  objective: string;
  progressPercent: number;
  milestones: ActOneMilestone[];
  strengths: string[];
  risks: string[];
  professionalIdentity: string;
}

function completedInternTasks(player: PlayerProfile) {
  return player.officePerformance.completedTaskIds.filter((id) => id.startsWith('intern-')).length;
}

function completedSeniorTasks(player: PlayerProfile) {
  return player.officePerformance.completedTaskIds.filter((id) => id.startsWith('senior-')).length;
}

function professionalIdentity(player: PlayerProfile) {
  const p = normalizeOfficePerformance(player.officePerformance);
  const values = [
    ['Técnico(a)', p.technique],
    ['Diligente', p.diligence],
    ['Ético(a)', p.ethics],
    ['Organizado(a) com prazos', p.deadlineManagement],
    ['Confiável para a equipe', p.supervisorTrust],
  ] as const;
  const sorted = [...values].sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] < 60) return 'Em formação';
  if (sorted[0][1] - sorted[1][1] <= 4) return `${sorted[0][0]} e ${sorted[1][0].toLowerCase()}`;
  return sorted[0][0];
}

export function getEarlyCareerSnapshot(player: PlayerProfile): EarlyCareerSnapshot {
  const performance = normalizeOfficePerformance(player.officePerformance);
  const internTasks = completedInternTasks(player);
  const seniorTasks = completedSeniorTasks(player);
  const promotion = getInternPromotionStatus({
    casesSolved: player.casesSolved,
    xp: player.xp,
    performance,
    discipline: player.officeDiscipline,
  });
  const oab = getOabPreparationStatus({
    casesSolved: player.casesSolved,
    performance,
    discipline: player.officeDiscipline,
  });

  const isSenior = player.careerTier === 'ESTAGIARIO_SENIOR';
  const actOneComplete = Boolean(player.oabRegistration)
    || !['ESTAGIARIO', 'ESTAGIARIO_SENIOR'].includes(player.careerTier);

  let stage: ActOneStageId = 'ARRIVAL';
  let title = 'Chegada ao Ramos & Associados';
  let objective = 'Conheça a rotina do escritório e comece a construir sua reputação profissional.';

  if (actOneComplete) {
    stage = 'ACT_ONE_COMPLETE';
    title = 'Ato 1 concluído';
    objective = 'Sua formação inicial terminou. As escolhas feitas no estágio agora acompanham sua carreira.';
  } else if (isSenior && oab.ready) {
    stage = 'OAB_PREPARATION';
    title = 'Preparação para a OAB';
    objective = 'Consolide sua preparação e enfrente o Exame da Ordem quando estiver pronto(a).';
  } else if (isSenior) {
    stage = 'SENIOR_AUTONOMY';
    title = 'Autonomia supervisionada';
    objective = 'Assuma responsabilidades de Sênior, fortaleça técnica e conquiste a confiança final do escritório.';
  } else if (promotion.progressPercent >= 84) {
    stage = 'PROMOTION_REVIEW';
    title = 'Avaliação para promoção';
    objective = 'Feche os requisitos restantes para que o Dr. Roberto faça sua avaliação de promoção.';
  } else if (player.casesSolved >= 1 || player.history.length >= 1) {
    stage = 'FIRST_CASES';
    title = 'Primeiros casos reais';
    objective = 'Transforme teoria em prática: investigue, cuide dos prazos e entregue trabalho que o supervisor possa confiar.';
  } else if (internTasks >= 1) {
    stage = 'INTERN_FOUNDATIONS';
    title = 'Construindo sua base profissional';
    objective = 'Conclua tarefas supervisionadas e prepare-se para assumir casos do escritório.';
  } else {
    stage = 'FIRST_DAY';
    title = 'Primeiro dia de estágio';
    objective = 'Comece pelas atividades supervisionadas e conheça como o Ramos & Associados trabalha.';
  }

  const milestones: ActOneMilestone[] = [
    { id: 'ARRIVAL', title: 'Contratação', description: 'Entrada no Ramos & Associados.', completed: Boolean(player.name), current: stage === 'ARRIVAL' },
    { id: 'FIRST_DAY', title: 'Primeiro dia', description: 'Conhecer a rotina e iniciar atividades.', completed: internTasks >= 1 || player.history.length >= 1 || isSenior || actOneComplete, current: stage === 'FIRST_DAY' },
    { id: 'INTERN_FOUNDATIONS', title: 'Fundamentos', description: 'Tarefas supervisionadas do estágio.', completed: internTasks >= 2 || isSenior || actOneComplete, current: stage === 'INTERN_FOUNDATIONS' },
    { id: 'FIRST_CASES', title: 'Casos do escritório', description: 'Participação prática em casos reais.', completed: player.casesSolved >= 2 || isSenior || actOneComplete, current: stage === 'FIRST_CASES' },
    { id: 'PROMOTION_REVIEW', title: 'Avaliação', description: 'Requisitos para Estagiário Sênior.', completed: isSenior || actOneComplete, current: stage === 'PROMOTION_REVIEW' },
    { id: 'SENIOR_AUTONOMY', title: 'Estágio Sênior', description: 'Mais autonomia e responsabilidade.', completed: seniorTasks >= 2 && oab.ready || actOneComplete, current: stage === 'SENIOR_AUTONOMY' },
    { id: 'OAB_PREPARATION', title: 'OAB', description: 'Encerramento do primeiro arco.', completed: actOneComplete, current: stage === 'OAB_PREPARATION' || stage === 'ACT_ONE_COMPLETE' },
  ];

  const strengths: string[] = [];
  const risks: string[] = [];
  const metrics = [
    ['Técnica', performance.technique],
    ['Diligência', performance.diligence],
    ['Ética', performance.ethics],
    ['Prazos', performance.deadlineManagement],
    ['Confiança', performance.supervisorTrust],
  ] as const;

  metrics.forEach(([label, value]) => {
    if (value >= 70) strengths.push(`${label} ${value}`);
    if (value < 45) risks.push(`${label} ${value}`);
  });
  if (player.officeDiscipline.warningCount > 0) risks.push(`${player.officeDiscipline.warningCount} advertência(s)`);
  if (player.household.needs.study < 25) risks.push('Rotina de estudos baixa');
  if (player.household.needs.energy < 25) risks.push('Energia crítica');

  return {
    stage,
    title,
    objective,
    progressPercent: actOneComplete
      ? 100
      : isSenior
        ? Math.min(95, 68 + Math.round(oab.progressPercent * 0.27))
        : Math.min(67, Math.round(promotion.progressPercent * 0.67)),
    milestones,
    strengths: strengths.slice(0, 3),
    risks: risks.slice(0, 3),
    professionalIdentity: professionalIdentity(player),
  };
}
