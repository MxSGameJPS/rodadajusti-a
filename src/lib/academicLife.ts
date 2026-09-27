export type LegalKnowledgeArea =
  | 'CIVIL' | 'PROCESSO_CIVIL' | 'PENAL' | 'PROCESSO_PENAL'
  | 'CONSTITUCIONAL' | 'TRABALHO' | 'ADMINISTRATIVO' | 'ETICA';

export type LegalKnowledgeState = Record<LegalKnowledgeArea, number>;

export const DEFAULT_LEGAL_KNOWLEDGE: LegalKnowledgeState = {
  CIVIL: 8, PROCESSO_CIVIL: 6, PENAL: 6, PROCESSO_PENAL: 5,
  CONSTITUCIONAL: 8, TRABALHO: 5, ADMINISTRATIVO: 5, ETICA: 10,
};

export function normalizeLegalKnowledge(value?: Partial<LegalKnowledgeState> | null): LegalKnowledgeState {
  return Object.fromEntries(
    Object.entries(DEFAULT_LEGAL_KNOWLEDGE).map(([key, base]) => [
      key, Math.max(0, Math.min(100, Number(value?.[key as LegalKnowledgeArea] ?? base) || 0)),
    ]),
  ) as LegalKnowledgeState;
}

export function addLegalKnowledge(
  current: Partial<LegalKnowledgeState> | null | undefined,
  gains: Partial<LegalKnowledgeState>,
): LegalKnowledgeState {
  const next = normalizeLegalKnowledge(current);
  for (const [area, amount] of Object.entries(gains)) {
    const key = area as LegalKnowledgeArea;
    next[key] = Math.max(0, Math.min(100, next[key] + (Number(amount) || 0)));
  }
  return next;
}

export const LEGAL_KNOWLEDGE_LABELS: Record<LegalKnowledgeArea, string> = {
  CIVIL:'Civil', PROCESSO_CIVIL:'Processo Civil', PENAL:'Penal',
  PROCESSO_PENAL:'Processo Penal', CONSTITUCIONAL:'Constitucional',
  TRABALHO:'Trabalho', ADMINISTRATIVO:'Administrativo', ETICA:'Ética',
};

export type CampusActivityId = 'CLASS' | 'LIBRARY' | 'STUDY_GROUP' | 'CANTEEN';

export const CAMPUS_ACTIVITIES = [
  { id:'CLASS' as const, title:'Assistir aula', minutes:180, study:24, energy:-10, hunger:-8, gains:{ CIVIL:2, PROCESSO_CIVIL:2, CONSTITUCIONAL:1 } },
  { id:'LIBRARY' as const, title:'Estudar na biblioteca', minutes:120, study:18, energy:-6, hunger:-4, gains:{ CIVIL:1, PENAL:1, CONSTITUCIONAL:1, ETICA:1 } },
  { id:'STUDY_GROUP' as const, title:'Grupo de estudos', minutes:90, study:14, energy:-5, hunger:-3, gains:{ PROCESSO_CIVIL:1, PROCESSO_PENAL:1, ETICA:1 } },
] as const;

export function campusIsOpen(gameMinutes:number) {
  const hour = Math.floor((((gameMinutes % 1440) + 1440) % 1440) / 60);
  return hour >= 7 && hour < 23;
}

export function classIsAvailable(gameMinutes:number) {
  const hour = Math.floor((((gameMinutes % 1440) + 1440) % 1440) / 60);
  return (hour >= 8 && hour < 12) || (hour >= 18 && hour < 22);
}
