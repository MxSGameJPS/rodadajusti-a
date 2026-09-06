import type { CareerTierId, LegalCase } from '../types/game';
import {
  REPERCUSSION_CONFIG,
  asProceduralCase,
  getAppealDeadlineDays,
  getCaseRepercussionLevel,
  getProceduralStage,
} from './caseMetadata';

const CAREER_ORDER: CareerTierId[] = [
  'ESTAGIARIO',
  'ESTAGIARIO_SENIOR',
  'ADVOGADO_CONTRATADO',
  'ADVOGADO_SENIOR',
  'SOCIO_ESCRITORIO',
  'DONO_ESCRITORIO',
  'MAGISTRADO_SUBSTITUTO',
  'JUIZ_TITULAR',
  'DESEMBARGADOR',
  'MINISTRO_STF',
];

const XP_BASE_BY_DIFFICULTY: Record<LegalCase['difficulty'], number> = {
  Iniciante: 80,
  Intermediário: 180,
  Avançado: 320,
  Complexo: 500,
};

const XP_STEP_BY_DIFFICULTY: Record<LegalCase['difficulty'], number> = {
  Iniciante: 20,
  Intermediário: 35,
  Avançado: 55,
  Complexo: 80,
};

type BalancedCaseMarker = LegalCase & {
  baseXpReward?: number;
  baseReputationReward?: number;
  rewardBalanceApplied?: boolean;
};

export function getCareerRank(tier: CareerTierId): number {
  const rank = CAREER_ORDER.indexOf(tier);
  return rank === -1 ? 0 : rank;
}

export function isCaseUnlockedForCareer(caseItem: LegalCase, currentTier: CareerTierId): boolean {
  return getCareerRank(caseItem.minCareerTier) <= getCareerRank(currentTier);
}

export function getAvailableCasesForCareer(cases: LegalCase[], currentTier: CareerTierId): LegalCase[] {
  return cases.filter((caseItem) => isCaseUnlockedForCareer(caseItem, currentTier));
}

export function getBalancedCaseXp(caseItem: LegalCase): number {
  const base = XP_BASE_BY_DIFFICULTY[caseItem.difficulty] ?? 80;
  const step = XP_STEP_BY_DIFFICULTY[caseItem.difficulty] ?? 20;
  const starOffset = Math.max(0, caseItem.difficultyStars - 1);
  return base + starOffset * step;
}

export function getCaseRewardBreakdown(caseItem: LegalCase) {
  const marked = caseItem as BalancedCaseMarker;
  const repercussionLevel = getCaseRepercussionLevel(caseItem);
  const config = REPERCUSSION_CONFIG[repercussionLevel];
  const configuredBaseXp = marked.rewardBalanceApplied
    ? Number(marked.baseXpReward)
    : Number(caseItem.xpReward);
  const baseXp = Number.isFinite(configuredBaseXp) && configuredBaseXp > 0
    ? Math.round(configuredBaseXp)
    : getBalancedCaseXp(caseItem);
  const totalXp = Math.max(baseXp, Math.round(baseXp * config.xpMultiplier));
  const configuredReputation = marked.rewardBalanceApplied
    ? Number(marked.baseReputationReward)
    : Number(caseItem.reputationReward);
  const baseReputation = Number.isFinite(configuredReputation) ? Math.round(configuredReputation) : 0;
  const totalReputation = baseReputation + config.reputationBonus;

  return {
    repercussionLevel,
    repercussionLabel: config.label,
    xpMultiplier: config.xpMultiplier,
    baseXp,
    repercussionXpBonus: Math.max(0, totalXp - baseXp),
    totalXp,
    baseReputation,
    repercussionReputationBonus: config.reputationBonus,
    totalReputation,
  };
}

export function normalizeCaseBalance(caseItem: LegalCase): LegalCase {
  const metadata = asProceduralCase(caseItem);
  const rewards = getCaseRewardBreakdown(caseItem);

  return {
    ...caseItem,
    xpReward: rewards.totalXp,
    reputationReward: rewards.totalReputation,
    baseXpReward: rewards.baseXp,
    baseReputationReward: rewards.baseReputation,
    rewardBalanceApplied: true,
    repercussionLevel: rewards.repercussionLevel,
    proceduralStage: getProceduralStage(caseItem),
    processKey: metadata.processKey || null,
    appealOfCaseId: metadata.appealOfCaseId || null,
    appealType: metadata.appealType || null,
    appealTrigger: metadata.appealTrigger || null,
    appealDeadlineDays: getAppealDeadlineDays(caseItem),
    courtName: metadata.courtName || null,
  } as LegalCase;
}

export function normalizeCaseCatalog(cases: LegalCase[]): LegalCase[] {
  return cases.map(normalizeCaseBalance);
}
