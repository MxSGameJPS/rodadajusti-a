import type { CareerTierId, LegalCase } from '../types/game';

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

export function normalizeCaseBalance(caseItem: LegalCase): LegalCase {
  return {
    ...caseItem,
    xpReward: getBalancedCaseXp(caseItem),
  };
}

export function normalizeCaseCatalog(cases: LegalCase[]): LegalCase[] {
  return cases.map(normalizeCaseBalance);
}
