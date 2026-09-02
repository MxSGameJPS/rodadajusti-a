import type { PlayerProfile } from '../types/game';
import {
  getEffectiveAttributeLevel,
  getProfessionalOwnerKey,
  loadProfessionalProfile,
  saveProfessionalProfile,
  type ProfessionalAttributeId,
  type ProfessionalRpgProfile,
  type ProfessionalTrait,
} from './professionalRpg';

export type DisciplinaryProfessionalStatus =
  | 'REGULAR'
  | 'UNDER_INVESTIGATION'
  | 'CENSURED'
  | 'SUSPENDED'
  | 'DISBARRED'
  | 'INCARCERATED';

export type DisciplinaryStage = 'NOTICE' | 'DEFENSE' | 'DECIDED';
export type DisciplinaryOutcome = 'ARCHIVED' | 'CENSURE' | 'SUSPENSION' | 'DISBARMENT' | 'INCARCERATION';
export type DefenseStrategyId = 'TECHNICAL_DEFENSE' | 'EVIDENCE_CHALLENGE' | 'INSTITUTIONAL_DEFENSE';

export interface DisciplinaryIncident {
  id: string;
  title: string;
  description: string;
  severity: 1 | 2 | 3 | 4 | 5;
  evidenceWeight: number;
  sourceCaseId?: string;
  createdAt: string;
}

export interface DisciplinaryDefenseRecord {
  strategyId: DefenseStrategyId;
  strategyTitle: string;
  primaryAttribute: ProfessionalAttributeId;
  secondaryAttribute: ProfessionalAttributeId;
  defenseScore: number;
  uncertaintyRoll: number;
  submittedAt: string;
}

export interface DisciplinaryDecision {
  outcome: DisciplinaryOutcome;
  title: string;
  description: string;
  professionalStatus: DisciplinaryProfessionalStatus;
  reputationPenalty: number;
  ethicsDelta: number;
  characterDelta: number;
  decidedAt: string;
}

export interface DisciplinaryProceeding {
  id: string;
  openedAt: string;
  authority: string;
  barAuthority: string;
  allegedOffenses: string[];
  severity: 1 | 2 | 3 | 4 | 5;
  stage: DisciplinaryStage;
  ethicsSnapshot: number;
  characterSnapshot: number;
  exposureSnapshot: number;
  incidentIds: string[];
  defense?: DisciplinaryDefenseRecord;
  decision?: DisciplinaryDecision;
}

export interface ProfessionalDisciplinaryState {
  version: 1;
  ownerKey: string;
  professionalStatus: DisciplinaryProfessionalStatus;
  incidents: DisciplinaryIncident[];
  activeProceeding: DisciplinaryProceeding | null;
  proceedingHistory: DisciplinaryProceeding[];
}

export interface RegisterDisciplinaryIncidentInput {
  title: string;
  description: string;
  severity?: 1 | 2 | 3 | 4 | 5;
  evidenceWeight?: number;
  sourceCaseId?: string;
}

export const ETHICS_INVESTIGATION_THRESHOLD = 35;
export const CHARACTER_INVESTIGATION_THRESHOLD = 35;

const STORAGE_PREFIX = 'rota_disciplinary_v1:';

const DEFENSE_STRATEGIES: Record<DefenseStrategyId, {
  title: string;
  description: string;
  primaryAttribute: ProfessionalAttributeId;
  secondaryAttribute: ProfessionalAttributeId;
}> = {
  TECHNICAL_DEFENSE: {
    title: 'Defesa técnica e colaboração',
    description: 'Organizar uma defesa jurídica consistente, responder formalmente às acusações e enfrentar o procedimento com autocontrole.',
    primaryAttribute: 'LEGAL_KNOWLEDGE',
    secondaryAttribute: 'SELF_CONTROL',
  },
  EVIDENCE_CHALLENGE: {
    title: 'Contestar a consistência das provas',
    description: 'Examinar contradições, fragilidades e coerência do material reunido no procedimento disciplinar.',
    primaryAttribute: 'INVESTIGATION',
    secondaryAttribute: 'PERCEPTION',
  },
  INSTITUTIONAL_DEFENSE: {
    title: 'Defesa institucional e negociação',
    description: 'Usar argumentação, reputação profissional e interlocução institucional para buscar uma resposta disciplinar menos severa.',
    primaryAttribute: 'PERSUASION',
    secondaryAttribute: 'INFLUENCE',
  },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function storageKey(player: Pick<PlayerProfile, 'cloudCareerId' | 'name'>) {
  return `${STORAGE_PREFIX}${getProfessionalOwnerKey(player)}`;
}

function createEmptyState(player: Pick<PlayerProfile, 'cloudCareerId' | 'name'>): ProfessionalDisciplinaryState {
  return {
    version: 1,
    ownerKey: getProfessionalOwnerKey(player),
    professionalStatus: 'REGULAR',
    incidents: [],
    activeProceeding: null,
    proceedingHistory: [],
  };
}

export function getDefenseStrategies() {
  return DEFENSE_STRATEGIES;
}

export function loadDisciplinaryState(player: Pick<PlayerProfile, 'cloudCareerId' | 'name'>): ProfessionalDisciplinaryState {
  try {
    const raw = localStorage.getItem(storageKey(player));
    if (!raw) return createEmptyState(player);
    const parsed = JSON.parse(raw) as ProfessionalDisciplinaryState;
    if (parsed?.version !== 1) return createEmptyState(player);
    return {
      ...createEmptyState(player),
      ...parsed,
      incidents: Array.isArray(parsed.incidents) ? parsed.incidents : [],
      proceedingHistory: Array.isArray(parsed.proceedingHistory) ? parsed.proceedingHistory : [],
    };
  } catch {
    return createEmptyState(player);
  }
}

export function saveDisciplinaryState(
  player: Pick<PlayerProfile, 'cloudCareerId' | 'name'>,
  state: ProfessionalDisciplinaryState,
) {
  localStorage.setItem(storageKey(player), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('rota:disciplinary-state-updated', { detail: state }));
}

export function registerDisciplinaryIncident(
  player: PlayerProfile,
  input: RegisterDisciplinaryIncidentInput,
): ProfessionalDisciplinaryState {
  const state = loadDisciplinaryState(player);
  const incident: DisciplinaryIncident = {
    id: `incident-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    description: input.description,
    severity: input.severity ?? 2,
    evidenceWeight: clamp(input.evidenceWeight ?? 35, 0, 100),
    sourceCaseId: input.sourceCaseId,
    createdAt: new Date().toISOString(),
  };

  const next = { ...state, incidents: [...state.incidents, incident] };
  saveDisciplinaryState(player, next);
  return next;
}

function calculateProceedingSeverity(profile: ProfessionalRpgProfile, state: ProfessionalDisciplinaryState): 1 | 2 | 3 | 4 | 5 {
  const ethicsPressure = Math.max(0, ETHICS_INVESTIGATION_THRESHOLD - profile.ethics);
  const characterPressure = Math.max(0, CHARACTER_INVESTIGATION_THRESHOLD - profile.character);
  const incidentPressure = state.incidents.reduce(
    (sum, incident) => sum + incident.severity * 4 + incident.evidenceWeight * 0.08,
    0,
  );
  const score = ethicsPressure * 1.5 + characterPressure * 1.7 + profile.exposure * 0.55 + incidentPressure;

  if (score >= 120) return 5;
  if (score >= 85) return 4;
  if (score >= 55) return 3;
  if (score >= 30) return 2;
  return 1;
}

function allegedOffensesFromState(state: ProfessionalDisciplinaryState): string[] {
  const offenses = state.incidents.map((incident) => incident.title).filter(Boolean);
  if (offenses.length > 0) return [...new Set(offenses)].slice(0, 6);
  return ['Fraude processual e infrações disciplinares relacionadas à conduta profissional'];
}

export function shouldOpenDisciplinaryProceeding(profile: ProfessionalRpgProfile, state: ProfessionalDisciplinaryState): boolean {
  if (state.activeProceeding) return false;
  if (state.professionalStatus === 'DISBARRED' || state.professionalStatus === 'INCARCERATED') return false;
  return profile.ethics <= ETHICS_INVESTIGATION_THRESHOLD || profile.character <= CHARACTER_INVESTIGATION_THRESHOLD;
}

export function evaluateAndOpenDisciplinaryProceeding(
  player: PlayerProfile,
  profile: ProfessionalRpgProfile,
): ProfessionalDisciplinaryState {
  const state = loadDisciplinaryState(player);
  if (!shouldOpenDisciplinaryProceeding(profile, state)) return state;

  const proceeding: DisciplinaryProceeding = {
    id: `disciplinary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    openedAt: new Date().toISOString(),
    authority: 'Ministério Público Estadual',
    barAuthority: 'Tribunal de Ética e Disciplina da OAB',
    allegedOffenses: allegedOffensesFromState(state),
    severity: calculateProceedingSeverity(profile, state),
    stage: 'NOTICE',
    ethicsSnapshot: profile.ethics,
    characterSnapshot: profile.character,
    exposureSnapshot: profile.exposure,
    incidentIds: state.incidents.map((incident) => incident.id),
  };

  const next: ProfessionalDisciplinaryState = {
    ...state,
    professionalStatus: 'UNDER_INVESTIGATION',
    activeProceeding: proceeding,
  };
  saveDisciplinaryState(player, next);
  window.dispatchEvent(new CustomEvent('rota:disciplinary-proceeding-opened', { detail: proceeding }));
  return next;
}

export function beginDisciplinaryDefense(
  player: PlayerProfile,
  state: ProfessionalDisciplinaryState,
): ProfessionalDisciplinaryState {
  if (!state.activeProceeding || state.activeProceeding.stage !== 'NOTICE') return state;
  const next = {
    ...state,
    activeProceeding: { ...state.activeProceeding, stage: 'DEFENSE' as const },
  };
  saveDisciplinaryState(player, next);
  return next;
}

function buildDecision(
  outcome: DisciplinaryOutcome,
  severity: number,
): DisciplinaryDecision {
  const now = new Date().toISOString();
  if (outcome === 'ARCHIVED') {
    return {
      outcome,
      title: 'Procedimento arquivado',
      description: 'A defesa foi suficiente para impedir a aplicação de sanção profissional neste procedimento. O histórico da investigação permanece registrado no universo do jogo.',
      professionalStatus: 'REGULAR',
      reputationPenalty: Math.max(0, severity - 1) * 2,
      ethicsDelta: 2,
      characterDelta: 1,
      decidedAt: now,
    };
  }
  if (outcome === 'CENSURE') {
    return {
      outcome,
      title: 'Censura disciplinar',
      description: 'A OAB aplicou censura ao personagem. A inscrição permanece ativa, mas a carreira passa a carregar um histórico disciplinar.',
      professionalStatus: 'CENSURED',
      reputationPenalty: 10 + severity * 2,
      ethicsDelta: -2,
      characterDelta: -1,
      decidedAt: now,
    };
  }
  if (outcome === 'SUSPENSION') {
    return {
      outcome,
      title: 'Suspensão profissional',
      description: 'O personagem foi suspenso do exercício da advocacia no universo do jogo. Novos atos profissionais ficam bloqueados enquanto a sanção estiver ativa.',
      professionalStatus: 'SUSPENDED',
      reputationPenalty: 20 + severity * 3,
      ethicsDelta: -4,
      characterDelta: -3,
      decidedAt: now,
    };
  }
  if (outcome === 'DISBARMENT') {
    return {
      outcome,
      title: 'Inscrição OAB cassada',
      description: 'A sanção resultou na exclusão do personagem dos quadros profissionais do jogo. A carreira de advocacia fica interrompida.',
      professionalStatus: 'DISBARRED',
      reputationPenalty: 45 + severity * 4,
      ethicsDelta: -8,
      characterDelta: -7,
      decidedAt: now,
    };
  }
  return {
    outcome,
    title: 'Condenação criminal e perda da OAB',
    description: 'Além da perda da inscrição profissional, as irregularidades apuradas resultaram em condenação criminal do personagem e prisão dentro do universo fictício do jogo.',
    professionalStatus: 'INCARCERATED',
    reputationPenalty: 70,
    ethicsDelta: -12,
    characterDelta: -12,
    decidedAt: now,
  };
}

function resolveOutcome(
  profile: ProfessionalRpgProfile,
  proceeding: DisciplinaryProceeding,
  strategyId: DefenseStrategyId,
): { defense: DisciplinaryDefenseRecord; decision: DisciplinaryDecision } {
  const strategy = DEFENSE_STRATEGIES[strategyId];
  const primary = getEffectiveAttributeLevel(profile, strategy.primaryAttribute);
  const secondary = getEffectiveAttributeLevel(profile, strategy.secondaryAttribute);
  const uncertaintyRoll = Math.floor(Math.random() * 26);
  const incidentPenalty = proceeding.incidentIds.length * 3;
  const severityPenalty = proceeding.severity * 8;
  const exposurePenalty = proceeding.exposureSnapshot * 0.45;
  const integritySupport = profile.ethics * 0.12 + profile.character * 0.08;

  const defenseScore = Math.round(
    primary * 6.5 +
      secondary * 4.5 +
      integritySupport +
      uncertaintyRoll -
      severityPenalty -
      exposurePenalty -
      incidentPenalty,
  );

  let outcome: DisciplinaryOutcome;
  if (defenseScore >= 58) outcome = 'ARCHIVED';
  else if (defenseScore >= 40) outcome = 'CENSURE';
  else if (defenseScore >= 23) outcome = 'SUSPENSION';
  else if (defenseScore >= 5) outcome = 'DISBARMENT';
  else outcome = proceeding.severity >= 4 || proceeding.exposureSnapshot >= 70 ? 'INCARCERATION' : 'DISBARMENT';

  const defense: DisciplinaryDefenseRecord = {
    strategyId,
    strategyTitle: strategy.title,
    primaryAttribute: strategy.primaryAttribute,
    secondaryAttribute: strategy.secondaryAttribute,
    defenseScore,
    uncertaintyRoll,
    submittedAt: new Date().toISOString(),
  };

  return { defense, decision: buildDecision(outcome, proceeding.severity) };
}

function disciplinaryTrait(decision: DisciplinaryDecision): ProfessionalTrait | null {
  if (decision.outcome === 'ARCHIVED') return null;
  return {
    id: `historico-disciplinar-${decision.outcome.toLowerCase()}`,
    name: decision.outcome === 'CENSURE' ? 'Histórico Disciplinar' : 'Marcado pela Corregedoria',
    description: decision.outcome === 'CENSURE'
      ? 'O personagem já recebeu uma sanção disciplinar da OAB no universo do jogo.'
      : 'Uma investigação grave passou a integrar permanentemente a trajetória profissional do personagem.',
    polarity: decision.outcome === 'CENSURE' ? 'mixed' : 'negative',
    source: 'Procedimento disciplinar',
    acquiredAt: new Date().toISOString(),
  };
}

export function submitDisciplinaryDefense(
  player: PlayerProfile,
  strategyId: DefenseStrategyId,
): ProfessionalDisciplinaryState {
  const profile = loadProfessionalProfile(player);
  const state = loadDisciplinaryState(player);
  const proceeding = state.activeProceeding;
  if (!profile || !proceeding || proceeding.stage !== 'DEFENSE') return state;

  const { defense, decision } = resolveOutcome(profile, proceeding, strategyId);
  const decidedProceeding: DisciplinaryProceeding = {
    ...proceeding,
    stage: 'DECIDED',
    defense,
    decision,
  };

  const trait = disciplinaryTrait(decision);
  const updatedProfile: ProfessionalRpgProfile = {
    ...profile,
    ethics: clamp(profile.ethics + decision.ethicsDelta, 0, 100),
    character: clamp(profile.character + decision.characterDelta, 0, 100),
    traits: trait && !profile.traits.some((item) => item.id === trait.id)
      ? [...profile.traits, trait]
      : profile.traits,
  };
  saveProfessionalProfile(player, updatedProfile);

  const next: ProfessionalDisciplinaryState = {
    ...state,
    professionalStatus: decision.professionalStatus,
    activeProceeding: decidedProceeding,
    proceedingHistory: [decidedProceeding, ...state.proceedingHistory],
  };
  saveDisciplinaryState(player, next);
  window.dispatchEvent(new CustomEvent('rota:disciplinary-decision', { detail: decision }));
  return next;
}

export function waiveDisciplinaryDefense(player: PlayerProfile): ProfessionalDisciplinaryState {
  const state = loadDisciplinaryState(player);
  const proceeding = state.activeProceeding;
  const profile = loadProfessionalProfile(player);
  if (!proceeding || proceeding.stage !== 'NOTICE' || !profile) return state;

  const forcedOutcome: DisciplinaryOutcome = proceeding.severity >= 4 ? 'DISBARMENT' : 'SUSPENSION';
  const decision = buildDecision(forcedOutcome, proceeding.severity);
  const decidedProceeding: DisciplinaryProceeding = {
    ...proceeding,
    stage: 'DECIDED',
    decision,
  };
  const next = {
    ...state,
    professionalStatus: decision.professionalStatus,
    activeProceeding: decidedProceeding,
    proceedingHistory: [decidedProceeding, ...state.proceedingHistory],
  };
  saveDisciplinaryState(player, next);
  return next;
}

export function acknowledgeDisciplinaryDecision(player: PlayerProfile): ProfessionalDisciplinaryState {
  const state = loadDisciplinaryState(player);
  if (!state.activeProceeding || state.activeProceeding.stage !== 'DECIDED') return state;
  const next = { ...state, activeProceeding: null };
  saveDisciplinaryState(player, next);
  return next;
}

export function isProfessionalPracticeBlocked(status: DisciplinaryProfessionalStatus): boolean {
  return status === 'SUSPENDED' || status === 'DISBARRED' || status === 'INCARCERATED';
}
