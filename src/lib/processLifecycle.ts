import type { CaseHistoryRecord, LegalCase, PlayerProfile } from '../types/game';
import { getCareerRank } from './caseRules';
import {
  STAGE_CONFIG,
  getAppealDeadlineDays,
  getAppealOfCaseId,
  getAppealTrigger,
  getAppealType,
  getProceduralStage,
  getShortStageLabel,
} from './caseMetadata';

export type ProcessStatus =
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_TRANSITO'
  | 'PRAZO_RECURSAL_ABERTO'
  | 'RECURSO_PARTE_CONTRARIA'
  | 'RECURSO_EM_TRAMITACAO'
  | 'AGUARDANDO_CAPACIDADE'
  | 'TRANSITO_EM_JULGADO';

export type ProcessStatusInfo = {
  status: ProcessStatus;
  label: string;
  description: string;
  tone: 'neutral' | 'warning' | 'info' | 'success' | 'danger';
  appealCase: LegalCase | null;
  appealDeadlineLabel: string | null;
  appealTypeLabel: string | null;
};

const APPEAL_TYPE_LABELS: Record<string, string> = {
  APELACAO: 'Apelação',
  AGRAVO_INSTRUMENTO: 'Agravo de instrumento',
  AGRAVO_INTERNO: 'Agravo interno',
  RECURSO_ESPECIAL: 'Recurso especial',
  RECURSO_EXTRAORDINARIO: 'Recurso extraordinário',
  AGRAVO_RECURSO_ESPECIAL: 'Agravo em recurso especial',
  AGRAVO_RECURSO_EXTRAORDINARIO: 'Agravo em recurso extraordinário',
  OUTRO: 'Recurso',
};

function parseGameDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function playerGameDate(player: PlayerProfile): Date {
  return new Date(Date.UTC(player.gameCurrentYear, player.gameCurrentMonth - 1, player.gameCurrentDay));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(date: Date) {
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

function isTriggerSatisfied(appealCase: LegalCase, record: CaseHistoryRecord) {
  const trigger = getAppealTrigger(appealCase) || 'PLAYER_LOSS';
  if (trigger === 'ANY_RESULT') return true;
  if (trigger === 'PLAYER_WIN_OPPONENT_APPEALS') return record.success;
  return !record.success;
}

function isStageCareerEligible(caseItem: LegalCase, player: PlayerProfile) {
  const stage = getProceduralStage(caseItem);
  const explicitRank = getCareerRank(caseItem.minCareerTier);
  const stageRank = getCareerRank(STAGE_CONFIG[stage].minimumCareerTier);
  return getCareerRank(player.careerTier) >= Math.max(explicitRank, stageRank);
}

function deadlineFromCase(record: CaseHistoryRecord, caseItem: LegalCase) {
  const completedAt = parseGameDate(record.completedDate);
  return completedAt ? addDays(completedAt, getAppealDeadlineDays(caseItem)) : null;
}

function isOwnAppealDeadlineOpen(record: CaseHistoryRecord, appealCase: LegalCase, player: PlayerProfile) {
  const trigger = getAppealTrigger(appealCase) || 'PLAYER_LOSS';
  if (trigger !== 'PLAYER_LOSS') return true;
  const deadline = deadlineFromCase(record, appealCase);
  if (!deadline) return true;
  return playerGameDate(player).getTime() <= deadline.getTime();
}

export function getAppealTypeLabel(caseItem: LegalCase) {
  const type = getAppealType(caseItem);
  return type ? APPEAL_TYPE_LABELS[type] || 'Recurso' : 'Recurso';
}

export function getContinuationCases(
  record: CaseHistoryRecord,
  player: PlayerProfile,
  catalog: LegalCase[],
  options?: { includeCareerLocked?: boolean; includeExpired?: boolean },
) {
  const completedIds = new Set(player.history.map((item) => item.caseId));

  return catalog.filter((caseItem) => {
    if (getAppealOfCaseId(caseItem) !== record.caseId) return false;
    if (completedIds.has(caseItem.id) || player.activeCase?.caseId === caseItem.id) return false;
    if (!isTriggerSatisfied(caseItem, record)) return false;
    if (!options?.includeCareerLocked && !isStageCareerEligible(caseItem, player)) return false;
    if (!options?.includeExpired && !isOwnAppealDeadlineOpen(record, caseItem, player)) return false;
    return true;
  });
}

export function getEligibleAppealCases(player: PlayerProfile, catalog: LegalCase[]) {
  const result: Array<{ caseItem: LegalCase; predecessor: CaseHistoryRecord }> = [];

  for (const record of player.history) {
    for (const caseItem of getContinuationCases(record, player, catalog)) {
      result.push({ caseItem, predecessor: record });
    }
  }

  return result.sort((left, right) => {
    const leftStage = getProceduralStage(left.caseItem);
    const rightStage = getProceduralStage(right.caseItem);
    const leftPriority = leftStage === 'STF' || leftStage === 'STJ' ? 3 : leftStage === 'SEGUNDA_INSTANCIA' ? 2 : 1;
    const rightPriority = rightStage === 'STF' || rightStage === 'STJ' ? 3 : rightStage === 'SEGUNDA_INSTANCIA' ? 2 : 1;
    if (leftPriority !== rightPriority) return rightPriority - leftPriority;
    return player.history.indexOf(left.predecessor) - player.history.indexOf(right.predecessor);
  });
}

export function getProfessionalAssignedCase(player: PlayerProfile, catalog: LegalCase[]) {
  if (player.activeCase) return null;
  const handled = new Set(player.history.map((record) => record.caseId));
  const lawyerRank = getCareerRank('ADVOGADO_CONTRATADO');
  const currentRank = getCareerRank(player.careerTier);

  const continuation = getEligibleAppealCases(player, catalog)[0]?.caseItem || null;
  if (continuation) return continuation;

  return catalog.find((caseItem) => {
    if (getAppealOfCaseId(caseItem)) return false;
    if (handled.has(caseItem.id)) return false;
    const minRank = getCareerRank(caseItem.minCareerTier);
    return minRank >= lawyerRank && minRank <= currentRank && isStageCareerEligible(caseItem, player);
  }) || null;
}

function findDirectContinuation(record: CaseHistoryRecord, player: PlayerProfile, catalog: LegalCase[]) {
  const candidates = getContinuationCases(record, player, catalog, {
    includeCareerLocked: true,
    includeExpired: true,
  });
  return candidates[0] || null;
}

export function getProcessStatusInfo(
  record: CaseHistoryRecord,
  player: PlayerProfile,
  catalog: LegalCase[],
): ProcessStatusInfo {
  const currentPhase = catalog.find((caseItem) => caseItem.id === record.caseId) || null;
  const activeContinuation = catalog.find(
    (caseItem) => player.activeCase?.caseId === caseItem.id && getAppealOfCaseId(caseItem) === record.caseId,
  );
  if (activeContinuation) {
    return {
      status: 'RECURSO_EM_TRAMITACAO',
      label: 'Recurso em tramitação',
      description: `O processo continua em ${getShortStageLabel(activeContinuation)}. Ainda não houve trânsito em julgado.`,
      tone: 'info',
      appealCase: activeContinuation,
      appealDeadlineLabel: null,
      appealTypeLabel: getAppealTypeLabel(activeContinuation),
    };
  }

  const completedContinuation = catalog.find(
    (caseItem) =>
      getAppealOfCaseId(caseItem) === record.caseId &&
      player.history.some((historyItem) => historyItem.caseId === caseItem.id),
  );
  if (completedContinuation) {
    return {
      status: 'RECURSO_EM_TRAMITACAO',
      label: 'Processo prosseguiu em grau recursal',
      description: `Esta decisão foi sucedida por uma nova etapa em ${getShortStageLabel(completedContinuation)}. Consulte a decisão mais recente do mesmo processo.`,
      tone: 'info',
      appealCase: completedContinuation,
      appealDeadlineLabel: null,
      appealTypeLabel: getAppealTypeLabel(completedContinuation),
    };
  }

  const continuation = findDirectContinuation(record, player, catalog);
  if (!continuation) {
    if (currentPhase) {
      const finalityDeadline = deadlineFromCase(record, currentPhase);
      if (finalityDeadline && playerGameDate(player).getTime() <= finalityDeadline.getTime()) {
        return {
          status: 'AGUARDANDO_TRANSITO',
          label: 'Aguardando trânsito em julgado',
          description: 'A decisão já foi proferida, mas o processo ainda não está definitivamente encerrado. Não há recurso jogável configurado nesta fase; o trânsito em julgado ocorrerá após o decurso do prazo simulado.',
          tone: 'neutral',
          appealCase: null,
          appealDeadlineLabel: formatDate(finalityDeadline),
          appealTypeLabel: null,
        };
      }
    }

    return {
      status: 'TRANSITO_EM_JULGADO',
      label: 'Trânsito em julgado',
      description: 'A decisão tornou-se definitiva. O processo está encerrado e esta fase não pode ser repetida. Reabertura por prova nova não faz parte desta versão do jogo.',
      tone: 'success',
      appealCase: null,
      appealDeadlineLabel: null,
      appealTypeLabel: null,
    };
  }

  const trigger = getAppealTrigger(continuation) || 'PLAYER_LOSS';
  const deadline = deadlineFromCase(record, continuation);
  const deadlineOpen = isOwnAppealDeadlineOpen(record, continuation, player);
  const careerEligible = isStageCareerEligible(continuation, player);

  if (trigger === 'PLAYER_LOSS' && !deadlineOpen) {
    return {
      status: 'TRANSITO_EM_JULGADO',
      label: 'Trânsito em julgado',
      description: 'O prazo recursal transcorreu sem a interposição do recurso. A decisão tornou-se definitiva e o processo foi encerrado.',
      tone: 'danger',
      appealCase: null,
      appealDeadlineLabel: deadline ? formatDate(deadline) : null,
      appealTypeLabel: getAppealTypeLabel(continuation),
    };
  }

  if (!careerEligible) {
    return {
      status: 'AGUARDANDO_CAPACIDADE',
      label: trigger === 'PLAYER_WIN_OPPONENT_APPEALS' ? 'Recurso da parte contrária' : 'Recurso sob responsabilidade do escritório',
      description: trigger === 'PLAYER_WIN_OPPONENT_APPEALS'
        ? `A parte contrária levou o processo a ${getShortStageLabel(continuation)}. Ele poderá retornar ao jogador quando o nível profissional exigido for alcançado.`
        : 'Existe medida recursal cabível, mas esta etapa exige nível profissional superior. O processo permanece sob responsabilidade do escritório.',
      tone: 'warning',
      appealCase: continuation,
      appealDeadlineLabel: deadline ? formatDate(deadline) : null,
      appealTypeLabel: getAppealTypeLabel(continuation),
    };
  }

  if (trigger === 'PLAYER_WIN_OPPONENT_APPEALS') {
    return {
      status: 'RECURSO_PARTE_CONTRARIA',
      label: 'Recurso da parte contrária',
      description: `A decisão favorável não encerrou o processo. A parte contrária recorreu e o processo seguirá para ${getShortStageLabel(continuation)}.`,
      tone: 'info',
      appealCase: continuation,
      appealDeadlineLabel: null,
      appealTypeLabel: getAppealTypeLabel(continuation),
    };
  }

  return {
    status: 'PRAZO_RECURSAL_ABERTO',
    label: 'Prazo recursal em aberto',
    description: `A decisão ainda não é definitiva. Você pode interpor ${getAppealTypeLabel(continuation).toLowerCase()} e levar o processo a ${getShortStageLabel(continuation)}.`,
    tone: 'warning',
    appealCase: continuation,
    appealDeadlineLabel: deadline ? formatDate(deadline) : null,
    appealTypeLabel: getAppealTypeLabel(continuation),
  };
}

export function getAssignmentContext(caseItem: LegalCase, player: PlayerProfile) {
  const predecessorId = getAppealOfCaseId(caseItem);
  if (!predecessorId) {
    return {
      isAppeal: false,
      title: 'Novo caso',
      description: 'Novo atendimento distribuído pelo escritório.',
      actionLabel: 'Aceitar caso no CRM',
    };
  }

  const predecessor = player.history.find((record) => record.caseId === predecessorId) || null;
  const trigger = getAppealTrigger(caseItem) || 'PLAYER_LOSS';
  const typeLabel = getAppealTypeLabel(caseItem);

  if (trigger === 'PLAYER_WIN_OPPONENT_APPEALS') {
    return {
      isAppeal: true,
      title: 'Processo retornou em recurso',
      description: `A parte contrária recorreu da decisão anterior. ${typeLabel} em ${getShortStageLabel(caseItem)}.`,
      actionLabel: 'Assumir recurso no CRM',
      predecessor,
    };
  }

  return {
    isAppeal: true,
    title: 'Recurso disponível',
    description: `Decisão desfavorável na etapa anterior. ${typeLabel} disponível para ${getShortStageLabel(caseItem)}.`,
    actionLabel: 'Interpor recurso',
    predecessor,
  };
}
