import type { CareerTierId, LegalCase } from '../types/game';

export type CaseRepercussionLevel = 'COMUM' | 'RELEVANTE' | 'GRANDE_REPERCUSSAO' | 'NACIONAL';
export type ProceduralStage = 'PRIMEIRA_INSTANCIA' | 'SEGUNDA_INSTANCIA' | 'STJ' | 'STF';
export type AppealTrigger = 'PLAYER_LOSS' | 'PLAYER_WIN_OPPONENT_APPEALS' | 'ANY_RESULT';
export type AppealType =
  | 'APELACAO'
  | 'AGRAVO_INSTRUMENTO'
  | 'AGRAVO_INTERNO'
  | 'RECURSO_ESPECIAL'
  | 'RECURSO_EXTRAORDINARIO'
  | 'AGRAVO_RECURSO_ESPECIAL'
  | 'AGRAVO_RECURSO_EXTRAORDINARIO'
  | 'OUTRO';

export type ProceduralCaseMetadata = {
  repercussionLevel?: CaseRepercussionLevel;
  proceduralStage?: ProceduralStage;
  processKey?: string | null;
  appealOfCaseId?: string | null;
  appealType?: AppealType | null;
  appealTrigger?: AppealTrigger | null;
  appealDeadlineDays?: number | null;
  courtName?: string | null;
};

export type ProceduralLegalCase = LegalCase & ProceduralCaseMetadata;

const REPERCUSSION_LEVELS = new Set<CaseRepercussionLevel>([
  'COMUM',
  'RELEVANTE',
  'GRANDE_REPERCUSSAO',
  'NACIONAL',
]);
const PROCEDURAL_STAGES = new Set<ProceduralStage>([
  'PRIMEIRA_INSTANCIA',
  'SEGUNDA_INSTANCIA',
  'STJ',
  'STF',
]);
const APPEAL_TRIGGERS = new Set<AppealTrigger>([
  'PLAYER_LOSS',
  'PLAYER_WIN_OPPONENT_APPEALS',
  'ANY_RESULT',
]);
const APPEAL_TYPES = new Set<AppealType>([
  'APELACAO',
  'AGRAVO_INSTRUMENTO',
  'AGRAVO_INTERNO',
  'RECURSO_ESPECIAL',
  'RECURSO_EXTRAORDINARIO',
  'AGRAVO_RECURSO_ESPECIAL',
  'AGRAVO_RECURSO_EXTRAORDINARIO',
  'OUTRO',
]);

export const REPERCUSSION_CONFIG: Record<
  CaseRepercussionLevel,
  { label: string; xpMultiplier: number; reputationBonus: number }
> = {
  COMUM: { label: 'Caso comum', xpMultiplier: 1, reputationBonus: 0 },
  RELEVANTE: { label: 'Caso relevante', xpMultiplier: 1.25, reputationBonus: 2 },
  GRANDE_REPERCUSSAO: { label: 'Grande repercussão', xpMultiplier: 1.75, reputationBonus: 6 },
  NACIONAL: { label: 'Repercussão nacional', xpMultiplier: 2.5, reputationBonus: 10 },
};

export const STAGE_CONFIG: Record<
  ProceduralStage,
  { label: string; shortLabel: string; minimumCareerTier: CareerTierId }
> = {
  PRIMEIRA_INSTANCIA: {
    label: '1ª instância',
    shortLabel: '1ª instância',
    minimumCareerTier: 'ESTAGIARIO',
  },
  SEGUNDA_INSTANCIA: {
    label: '2ª instância • Tribunal de Justiça',
    shortLabel: '2ª instância',
    minimumCareerTier: 'ADVOGADO_CONTRATADO',
  },
  STJ: {
    label: 'Tribunal Superior • STJ',
    shortLabel: 'STJ',
    minimumCareerTier: 'ADVOGADO_SENIOR',
  },
  STF: {
    label: 'Tribunal Superior • STF',
    shortLabel: 'STF',
    minimumCareerTier: 'ADVOGADO_SENIOR',
  },
};

export function asProceduralCase(caseItem: LegalCase): ProceduralLegalCase {
  return caseItem as ProceduralLegalCase;
}

export function getCaseRepercussionLevel(caseItem: LegalCase): CaseRepercussionLevel {
  const value = asProceduralCase(caseItem).repercussionLevel;
  return value && REPERCUSSION_LEVELS.has(value) ? value : 'COMUM';
}

export function getProceduralStage(caseItem: LegalCase): ProceduralStage {
  const value = asProceduralCase(caseItem).proceduralStage;
  return value && PROCEDURAL_STAGES.has(value) ? value : 'PRIMEIRA_INSTANCIA';
}

export function getAppealTrigger(caseItem: LegalCase): AppealTrigger | null {
  const value = asProceduralCase(caseItem).appealTrigger;
  return value && APPEAL_TRIGGERS.has(value) ? value : null;
}

export function getAppealType(caseItem: LegalCase): AppealType | null {
  const value = asProceduralCase(caseItem).appealType;
  return value && APPEAL_TYPES.has(value) ? value : null;
}

export function getAppealDeadlineDays(caseItem: LegalCase): number {
  const value = Number(asProceduralCase(caseItem).appealDeadlineDays);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 15;
}

export function getAppealOfCaseId(caseItem: LegalCase): string | null {
  const value = asProceduralCase(caseItem).appealOfCaseId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getCaseProcessKey(caseItem: LegalCase): string {
  const value = asProceduralCase(caseItem).processKey;
  return typeof value === 'string' && value.trim() ? value.trim() : caseItem.id;
}

export function getCourtName(caseItem: LegalCase): string | null {
  const value = asProceduralCase(caseItem).courtName;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getRepercussionLabel(caseItem: LegalCase): string {
  return REPERCUSSION_CONFIG[getCaseRepercussionLevel(caseItem)].label;
}

export function getStageLabel(caseItem: LegalCase): string {
  return STAGE_CONFIG[getProceduralStage(caseItem)].label;
}

export function getShortStageLabel(caseItem: LegalCase): string {
  return STAGE_CONFIG[getProceduralStage(caseItem)].shortLabel;
}
