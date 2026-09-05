import type { ActiveCaseState, DialogueOption, LegalCase } from '../types/game';

const ACTIVE_ACCOUNT_KEY = 'rota_da_justica_active_account_v1';
const WORKING_SAVE_KEY = 'rota_da_justica_save_v1';
const STORE_PREFIX = 'rota_reactive_world_v1:';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

export interface NpcRelationshipMemory {
  id: string;
  caseId: string;
  text: string;
  createdAt: string;
}

export interface NpcRelationshipState {
  npcKey: string;
  name: string;
  role: string;
  trust: number;
  respect: number;
  familiarity: number;
  memories: NpcRelationshipMemory[];
}

export interface ResolvedCaseEvent {
  eventId: string;
  choiceId: string;
  title: string;
  choiceLabel: string;
  scoreModifier: number;
  timePenaltyHours: number;
  professionalRisk: number;
  resolution: string;
  resolvedAt: string;
}

export interface PlayableHearingAnswer {
  roundId: string;
  choiceId: string;
  impact: number;
}

export interface PlayableHearingResult {
  caseId: string;
  attemptKey?: string;
  scoreModifier: number;
  performancePercent: number;
  correctAnswers: number;
  totalRounds: number;
  summary: string;
  answers: PlayableHearingAnswer[];
  completedAt: string;
}

export interface ReactiveCaseOutcome {
  resolvedEventIds: string[];
  scoreModifier: number;
  timePenaltyHours: number;
  professionalRisk: number;
  events: ResolvedCaseEvent[];
  hearing: PlayableHearingResult | null;
}

export interface UnexpectedCaseEventChoice {
  id: string;
  label: string;
  description: string;
  scoreModifier: number;
  timePenaltyHours: number;
  professionalRisk: number;
  resolution: string;
}

export interface UnexpectedCaseEvent {
  id: string;
  caseId: string;
  attemptKey: string;
  eyebrow: string;
  title: string;
  description: string;
  sourceLabel: string;
  relatedClueId?: string | null;
  triggerMinActions: number;
  triggerDeadlineRatio: number | null;
  choices: UnexpectedCaseEventChoice[];
}

export interface CaseSpecificHearingChoice {
  id: string;
  label: string;
  explanation: string;
  impact: number;
}

export interface CaseSpecificHearingRound {
  id: string;
  speaker: string;
  title: string;
  prompt: string;
  relatedClueId?: string | null;
  choices: CaseSpecificHearingChoice[];
}

export interface CaseSpecificHearingConfig {
  enabled: boolean;
  title: string;
  intro: string;
  rounds: CaseSpecificHearingRound[];
}

export interface CaseReactiveWorldConfig {
  version: 1;
  events: Array<{
    id: string;
    eyebrow: string;
    title: string;
    description: string;
    sourceLabel: string;
    relatedClueId?: string | null;
    trigger?: {
      minActions?: number;
      deadlineRatio?: number | null;
    };
    choices: UnexpectedCaseEventChoice[];
  }>;
  hearing: CaseSpecificHearingConfig | null;
}

interface ReactiveWorldState {
  version: 1;
  relationships: Record<string, NpcRelationshipState>;
  cases: Record<string, ReactiveCaseOutcome>;
}

const EMPTY_CASE_OUTCOME: ReactiveCaseOutcome = {
  resolvedEventIds: [],
  scoreModifier: 0,
  timePenaltyHours: 0,
  professionalRisk: 0,
  events: [],
  hearing: null,
};

function activeScope() {
  if (typeof window === 'undefined') return 'server';
  try {
    return localStorage.getItem(ACTIVE_ACCOUNT_KEY) || 'legacy';
  } catch {
    return 'legacy';
  }
}

function storageKey() {
  return `${STORE_PREFIX}${activeScope()}`;
}

function readState(): ReactiveWorldState {
  if (typeof window === 'undefined') {
    return { version: 1, relationships: {}, cases: {} };
  }

  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return { version: 1, relationships: {}, cases: {} };
    const parsed = JSON.parse(raw) as Partial<ReactiveWorldState>;
    return {
      version: 1,
      relationships: parsed.relationships && typeof parsed.relationships === 'object' ? parsed.relationships : {},
      cases: parsed.cases && typeof parsed.cases === 'object' ? parsed.cases : {},
    };
  } catch {
    return { version: 1, relationships: {}, cases: {} };
  }
}

function writeState(state: ReactiveWorldState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(), JSON.stringify(state));
  } catch {
    // O jogo continua funcional mesmo quando o navegador bloqueia persistência local.
  }
}

function activeCaseFromWorkingSave(caseId: string): ActiveCaseState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WORKING_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { activeCase?: ActiveCaseState | null };
    return parsed.activeCase?.caseId === caseId ? parsed.activeCase : null;
  } catch {
    return null;
  }
}

export function getCaseAttemptKey(caseId: string, activeState?: ActiveCaseState | null) {
  const resolvedActiveState = activeState || activeCaseFromWorkingSave(caseId);
  const firstLogId = resolvedActiveState?.logs?.[0]?.id;
  return `${caseId}:${firstLogId || 'legacy'}`;
}

export function getNpcRelationship(npcKey: string, name = 'NPC', role = 'Contato profissional'): NpcRelationshipState {
  const state = readState();
  return state.relationships[npcKey] || {
    npcKey,
    name,
    role,
    trust: 50,
    respect: 50,
    familiarity: 0,
    memories: [],
  };
}

export function getRelationshipLabel(relationship: NpcRelationshipState) {
  const average = Math.round((relationship.trust + relationship.respect) / 2);
  if (relationship.familiarity === 0) return 'Primeiro contato';
  if (average >= 82) return 'Confiança elevada';
  if (average >= 68) return 'Boa relação profissional';
  if (average >= 48) return 'Relação profissional';
  if (average >= 32) return 'Relação cautelosa';
  return 'Relação desgastada';
}

export function recordNpcInteraction(params: {
  npcKey: string;
  name: string;
  role: string;
  caseId: string;
  memory: string;
  trustDelta?: number;
  respectDelta?: number;
  familiarityDelta?: number;
}) {
  const state = readState();
  const current = getNpcRelationship(params.npcKey, params.name, params.role);
  const memory: NpcRelationshipMemory = {
    id: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    caseId: params.caseId,
    text: params.memory,
    createdAt: new Date().toISOString(),
  };

  const updated: NpcRelationshipState = {
    ...current,
    name: params.name,
    role: params.role,
    trust: clamp(current.trust + (params.trustDelta || 0)),
    respect: clamp(current.respect + (params.respectDelta || 0)),
    familiarity: clamp(current.familiarity + (params.familiarityDelta ?? 6)),
    memories: [memory, ...current.memories].slice(0, 12),
  };

  state.relationships[params.npcKey] = updated;
  writeState(state);
  return updated;
}

export function relationshipDeltaFromDialogue(option: DialogueOption) {
  switch (option.attitude) {
    case 'cooperativo':
      return { trustDelta: 3, respectDelta: 2, familiarityDelta: 8 };
    case 'suspeito':
      return { trustDelta: -2, respectDelta: 1, familiarityDelta: 7 };
    case 'nervoso':
      return { trustDelta: -1, respectDelta: 1, familiarityDelta: 7 };
    default:
      return { trustDelta: 1, respectDelta: 1, familiarityDelta: 6 };
  }
}

export function getCaseReactiveOutcome(caseId: string, activeState?: ActiveCaseState | null): ReactiveCaseOutcome {
  const state = readState();
  const attemptKey = getCaseAttemptKey(caseId, activeState);
  const current = state.cases[attemptKey] || (attemptKey.endsWith(':legacy') ? state.cases[caseId] : undefined);
  if (!current) return { ...EMPTY_CASE_OUTCOME, resolvedEventIds: [], events: [] };
  return {
    ...EMPTY_CASE_OUTCOME,
    ...current,
    resolvedEventIds: Array.isArray(current.resolvedEventIds) ? current.resolvedEventIds : [],
    events: Array.isArray(current.events) ? current.events : [],
    hearing: current.hearing || null,
  };
}

function actionCount(activeState: ActiveCaseState) {
  return (
    activeState.askedDialogueIds.length +
    activeState.inspectedSpotIds.length +
    (activeState.socialJuridicoActions?.length || 0)
  );
}

export function getCaseReactiveWorldConfig(currentCase: LegalCase): CaseReactiveWorldConfig | null {
  const raw = (currentCase as LegalCase & { reactiveWorld?: CaseReactiveWorldConfig | null }).reactiveWorld;
  if (!raw || raw.version !== 1 || !Array.isArray(raw.events)) return null;
  return raw;
}

export function getCaseSpecificHearingConfig(currentCase: LegalCase) {
  return getCaseReactiveWorldConfig(currentCase)?.hearing || null;
}

function genericCaseEvents(currentCase: LegalCase, attemptKey: string): UnexpectedCaseEvent[] {
  return [
    {
      id: `${currentCase.id}:client-new-info`,
      caseId: currentCase.id,
      attemptKey,
      eyebrow: 'Contato inesperado',
      title: `${currentCase.client.name} acrescentou uma informação que não estava no primeiro relato`,
      description: 'O cliente entrou em contato dizendo que lembrou de um fato que pode alterar a leitura do caso. O dado ainda não foi confirmado por documento ou por outra fonte.',
      sourceLabel: 'Cliente',
      triggerMinActions: 2,
      triggerDeadlineRatio: null,
      choices: [
        {
          id: 'verify-first',
          label: 'Registrar e confrontar a informação com o que já foi apurado',
          description: 'Tratar o novo relato como hipótese e verificar coerência antes de utilizá-lo.',
          scoreModifier: 2,
          timePenaltyHours: 1,
          professionalRisk: 0,
          resolution: 'Você registrou a nova versão sem tratá-la como verdade automática e revisou a coerência da investigação.',
        },
        {
          id: 'request-support',
          label: 'Pedir documento ou outra fonte que confirme o novo fato',
          description: 'Consumirá mais tempo, mas reduz o risco de construir a tese sobre uma lembrança não confirmada.',
          scoreModifier: 3,
          timePenaltyHours: 2,
          professionalRisk: 0,
          resolution: 'A cautela probatória fortaleceu a preparação do caso, embora tenha consumido tempo adicional.',
        },
        {
          id: 'ignore-client',
          label: 'Ignorar porque a informação não constava no briefing inicial',
          description: 'Seguir sem avaliar se o novo fato pode afetar a estratégia.',
          scoreModifier: -4,
          timePenaltyHours: 0,
          professionalRisk: 2,
          resolution: 'Você desconsiderou uma informação potencialmente relevante sem ao menos verificar sua utilidade ou risco.',
        },
      ],
    },
    {
      id: `${currentCase.id}:witness-hesitation`,
      caseId: currentCase.id,
      attemptKey,
      eyebrow: 'Mudança de comportamento',
      title: 'Uma pessoa importante para a instrução demonstrou receio de colaborar',
      description: 'Depois das primeiras diligências, uma fonte que poderia contribuir com o esclarecimento dos fatos passou a evitar contato. A forma de abordagem pode preservar ou destruir a cooperação.',
      sourceLabel: 'Diligência',
      triggerMinActions: 4,
      triggerDeadlineRatio: null,
      choices: [
        {
          id: 'respectful-contact',
          label: 'Explicar a importância do depoimento sem pressionar',
          description: 'Tentar recuperar a cooperação com abordagem profissional e transparente.',
          scoreModifier: 2,
          timePenaltyHours: 1,
          professionalRisk: 0,
          resolution: 'A abordagem respeitosa preservou a credibilidade da investigação e reduziu o risco de um depoimento contaminado por pressão.',
        },
        {
          id: 'seek-alternative-proof',
          label: 'Buscar prova documental alternativa',
          description: 'Aceitar a hesitação e tentar sustentar o fato por outra via probatória.',
          scoreModifier: 1,
          timePenaltyHours: 2,
          professionalRisk: 0,
          resolution: 'Você não forçou a fonte e redirecionou a investigação para elementos mais objetivos.',
        },
        {
          id: 'pressure-source',
          label: 'Pressionar para que a pessoa confirme a versão esperada',
          description: 'Uma decisão rápida, mas profissionalmente perigosa.',
          scoreModifier: -5,
          timePenaltyHours: 0.5,
          professionalRisk: 4,
          resolution: 'A pressão sobre a fonte criou risco de credibilidade e de questionamento da forma como a prova foi produzida.',
        },
      ],
    },
    {
      id: `${currentCase.id}:opposing-document`,
      caseId: currentCase.id,
      attemptKey,
      eyebrow: 'Intercorrência processual',
      title: 'Surgiu um documento novo apresentado pela parte contrária',
      description: 'A informação chegou perto da fase de protocolo. Ela pode ser irrelevante, autêntica ou capaz de enfraquecer parte da tese. Você precisa decidir quanto tempo investir na análise.',
      sourceLabel: 'Parte contrária',
      triggerMinActions: 6,
      triggerDeadlineRatio: 0.55,
      choices: [
        {
          id: 'deep-review',
          label: 'Analisar autenticidade, contexto e impacto antes de seguir',
          description: 'Fazer uma revisão completa mesmo com o prazo correndo.',
          scoreModifier: 3,
          timePenaltyHours: 2,
          professionalRisk: 0,
          resolution: 'Você incorporou a intercorrência ao raciocínio jurídico e reduziu a chance de ser surpreendido na audiência.',
        },
        {
          id: 'technical-challenge',
          label: 'Preparar impugnação objetiva e manter a estratégia principal',
          description: 'Responder tecnicamente sem reconstruir toda a investigação.',
          scoreModifier: 1,
          timePenaltyHours: 1,
          professionalRisk: 0,
          resolution: 'A resposta foi proporcional: você registrou a objeção e preservou tempo para o restante da preparação.',
        },
        {
          id: 'ignore-document',
          label: 'Ignorar o documento e protocolar como se ele não existisse',
          description: 'Economiza tempo, mas deixa a tese exposta a uma surpresa previsível.',
          scoreModifier: -5,
          timePenaltyHours: 0,
          professionalRisk: 3,
          resolution: 'A decisão de ignorar material adverso conhecido fragilizou a preparação e aumentou o risco processual.',
        },
      ],
    },
  ];
}

function caseEvents(currentCase: LegalCase, attemptKey: string): UnexpectedCaseEvent[] {
  const config = getCaseReactiveWorldConfig(currentCase);
  if (!config || config.events.length === 0) return genericCaseEvents(currentCase, attemptKey);

  return config.events.map((event, index) => ({
    id: `${currentCase.id}:admin:${event.id}`,
    caseId: currentCase.id,
    attemptKey,
    eyebrow: event.eyebrow,
    title: event.title,
    description: event.description,
    sourceLabel: event.sourceLabel,
    relatedClueId: event.relatedClueId || null,
    triggerMinActions: Math.max(1, Math.round(event.trigger?.minActions ?? ((index + 1) * 2))),
    triggerDeadlineRatio: typeof event.trigger?.deadlineRatio === 'number'
      ? Math.max(0, Math.min(1, event.trigger.deadlineRatio))
      : null,
    choices: event.choices,
  }));
}

export function getPendingCaseEvent(currentCase: LegalCase, activeState: ActiveCaseState) {
  const attemptKey = getCaseAttemptKey(currentCase.id, activeState);
  const outcome = getCaseReactiveOutcome(currentCase.id, activeState);
  const resolved = new Set(outcome.resolvedEventIds);
  const events = caseEvents(currentCase, attemptKey);
  const actions = actionCount(activeState);
  const effectiveHours = activeState.hoursSpent + outcome.timePenaltyHours;
  const deadlineRatio = currentCase.deadlineHours > 0 ? effectiveHours / currentCase.deadlineHours : 0;

  for (const event of events) {
    if (resolved.has(event.id)) continue;
    if (event.relatedClueId && !activeState.discoveredClueIds.includes(event.relatedClueId)) continue;
    const actionTrigger = actions >= event.triggerMinActions;
    const deadlineTrigger = event.triggerDeadlineRatio !== null && deadlineRatio >= event.triggerDeadlineRatio;
    if (actionTrigger || deadlineTrigger) return event;
  }
  return null;
}

export function resolveCaseEventChoice(event: UnexpectedCaseEvent, choice: UnexpectedCaseEventChoice) {
  const state = readState();
  const current = state.cases[event.attemptKey] || { ...EMPTY_CASE_OUTCOME, resolvedEventIds: [], events: [] };
  if (current.resolvedEventIds.includes(event.id)) return current;

  const resolved: ResolvedCaseEvent = {
    eventId: event.id,
    choiceId: choice.id,
    title: event.title,
    choiceLabel: choice.label,
    scoreModifier: choice.scoreModifier,
    timePenaltyHours: choice.timePenaltyHours,
    professionalRisk: choice.professionalRisk,
    resolution: choice.resolution,
    resolvedAt: new Date().toISOString(),
  };

  const updated: ReactiveCaseOutcome = {
    ...current,
    resolvedEventIds: [...current.resolvedEventIds, event.id],
    scoreModifier: current.scoreModifier + choice.scoreModifier,
    timePenaltyHours: current.timePenaltyHours + choice.timePenaltyHours,
    professionalRisk: current.professionalRisk + choice.professionalRisk,
    events: [...current.events, resolved],
  };

  state.cases[event.attemptKey] = updated;
  writeState(state);
  return updated;
}

export function saveHearingResult(result: PlayableHearingResult) {
  const state = readState();
  const attemptKey = result.attemptKey || getCaseAttemptKey(result.caseId);
  const current = state.cases[attemptKey] || { ...EMPTY_CASE_OUTCOME, resolvedEventIds: [], events: [] };
  const normalizedResult = { ...result, attemptKey };
  state.cases[attemptKey] = { ...current, hearing: normalizedResult };
  writeState(state);
  return state.cases[attemptKey];
}

export function shouldRunPlayableHearing(currentCase: LegalCase) {
  const config = getCaseReactiveWorldConfig(currentCase);
  if (config) {
    return Boolean(config.hearing && config.hearing.enabled !== false && Array.isArray(config.hearing.rounds) && config.hearing.rounds.length >= 2);
  }

  const hasOralEvidence = currentCase.availableClues.some((clue) => clue.type === 'depoimento');
  const hasPeopleToHear = currentCase.locations.some((location) => location.characters.some((character) => character.dialogueOptions.length > 0));
  return hasOralEvidence || (hasPeopleToHear && currentCase.difficulty !== 'Iniciante');
}
