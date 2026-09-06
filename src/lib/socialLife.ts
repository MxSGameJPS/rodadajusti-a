import { GAME_CASES } from '../data/cases';
import type { PlayerProfile } from '../types/game';
import { getProfessionalOwnerKey } from './professionalRpg';
import { shouldRunPlayableHearing } from './reactiveWorldStore';

export type RelationshipStatus = 'UNDEFINED' | 'SINGLE' | 'DATING' | 'MARRIED' | 'STABLE_UNION';
export type SocialContactId = 'MARIANA' | 'PARTNER' | 'ROBERTO' | 'LAWYER_FELIPE' | 'FRIEND_CARLOS';
export type SocialChannel = 'WHATSAPP' | 'CALL';
export type SocialEventKind =
  | 'BAR'
  | 'DATE_NIGHT'
  | 'LUNCH'
  | 'DINNER'
  | 'NETWORKING'
  | 'WEEKEND_SERRA'
  | 'WEEKEND_BEACH'
  | 'WEEKEND_MOUNTAIN';
export type SocialEventStatus = 'PENDING' | 'COMPLETED' | 'DECLINED';
export type SocialRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PersonalLifeProfile {
  relationshipStatus: RelationshipStatus;
  partnerName: string;
}

export interface SocialPlanOption {
  id: string;
  label: string;
  detail: string;
  cost: number;
  socialGain: number;
  capitalGain: number;
  energyDelta: number;
  relationshipDelta: number;
  caseHoursCost: number;
  daysAdvance: number;
}

export interface SocialProfessionalRisk {
  level: SocialRiskLevel;
  caseId: string;
  caseCode: string;
  remainingHours: number;
  hasPlayableHearing: boolean;
  message: string;
}

export interface SocialEvent {
  id: string;
  kind: SocialEventKind;
  status: SocialEventStatus;
  sourceContactId: SocialContactId;
  contactName: string;
  contactRole: string;
  channel: SocialChannel;
  title: string;
  message: string;
  createdDateKey: string;
  options: SocialPlanOption[];
  professionalRisk?: SocialProfessionalRisk;
  completedDateKey?: string;
  selectedOptionId?: string;
  moneySpent?: number;
  socialGain?: number;
  capitalGain?: number;
  energyDelta?: number;
  relationshipDelta?: number;
  caseHoursCost?: number;
  daysAdvanced?: number;
}

export interface SocialCondition {
  label: 'DESCANSADO' | 'EQUILIBRADO' | 'CANSADO' | 'EXAUSTO';
  sourceEventId: string;
  sourceTitle: string;
  hearingModifier: number;
  expiresDateKey: string;
}

export interface SocialLifeState {
  version: 2;
  profile: PersonalLifeProfile;
  pendingEvent: SocialEvent | null;
  history: SocialEvent[];
  generatedDateKeys: string[];
  totalSpent: number;
  socialBalance: number;
  socialCapital: number;
  energy: number;
  relationships: Record<SocialContactId, number>;
  activeCondition: SocialCondition | null;
  lastEnergyDateKey: string | null;
}

const STORAGE_PREFIX = 'rota_social_life_v1:';
export const SOCIAL_LIFE_UPDATED_EVENT = 'rota:social-life-updated';
export const OPEN_SOCIAL_LIFE_EVENT = 'rota:open-social-life';
export const SOCIAL_LIFE_DECLINE_EVENT = 'rota:social-life-decline';

export const RELATIONSHIP_LABELS: Record<RelationshipStatus, string> = {
  UNDEFINED: 'Não informado',
  SINGLE: 'Solteiro(a)',
  DATING: 'Namorando(a)',
  MARRIED: 'Casado(a)',
  STABLE_UNION: 'União estável',
};

export const SOCIAL_CONTACT_LABELS: Record<Exclude<SocialContactId, 'PARTNER'>, { name: string; role: string }> = {
  MARIANA: { name: 'Mariana Duarte', role: 'Secretária • Ramos & Associados' },
  ROBERTO: { name: 'Dr. Roberto Ramos', role: 'Sócio responsável' },
  LAWYER_FELIPE: { name: 'Dr. Felipe Martins', role: 'Advogado • colega de profissão' },
  FRIEND_CARLOS: { name: 'Carlos Nogueira', role: 'Amigo da época da faculdade' },
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function isCommittedRelationship(status: RelationshipStatus) {
  return status === 'DATING' || status === 'MARRIED' || status === 'STABLE_UNION';
}

function defaultRelationships(): Record<SocialContactId, number> {
  return {
    MARIANA: 45,
    PARTNER: 65,
    ROBERTO: 35,
    LAWYER_FELIPE: 20,
    FRIEND_CARLOS: 40,
  };
}

function emptyState(): SocialLifeState {
  return {
    version: 2,
    profile: {
      relationshipStatus: 'UNDEFINED',
      partnerName: '',
    },
    pendingEvent: null,
    history: [],
    generatedDateKeys: [],
    totalSpent: 0,
    socialBalance: 50,
    socialCapital: 15,
    energy: 72,
    relationships: defaultRelationships(),
    activeCondition: null,
    lastEnergyDateKey: null,
  };
}

type SocialPlayerKey = Pick<PlayerProfile, 'cloudCareerId' | 'name' | 'oabRegistration'> &
  Partial<Pick<PlayerProfile, 'gameCurrentDay' | 'gameCurrentMonth' | 'gameCurrentYear'>>;

function storageKey(player: SocialPlayerKey) {
  return `${STORAGE_PREFIX}${getProfessionalOwnerKey(player)}`;
}

export function gameDateKey(player: Pick<PlayerProfile, 'gameCurrentDay' | 'gameCurrentMonth' | 'gameCurrentYear'>) {
  return `${player.gameCurrentYear}-${String(player.gameCurrentMonth).padStart(2, '0')}-${String(player.gameCurrentDay).padStart(2, '0')}`;
}

export function getGameWeekday(player: Pick<PlayerProfile, 'gameCurrentDay' | 'gameCurrentMonth' | 'gameCurrentYear'>) {
  return new Date(Date.UTC(player.gameCurrentYear, player.gameCurrentMonth - 1, player.gameCurrentDay)).getUTCDay();
}

export function getGameWeekdayLabel(player: Pick<PlayerProfile, 'gameCurrentDay' | 'gameCurrentMonth' | 'gameCurrentYear'>) {
  return ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][getGameWeekday(player)];
}

function hasGameDate(player: SocialPlayerKey): player is SocialPlayerKey & Pick<PlayerProfile, 'gameCurrentDay' | 'gameCurrentMonth' | 'gameCurrentYear'> {
  return Number.isFinite(player.gameCurrentDay) && Number.isFinite(player.gameCurrentMonth) && Number.isFinite(player.gameCurrentYear);
}

function dateFromKey(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(startKey: string | null, endKey: string) {
  const start = dateFromKey(startKey);
  const end = dateFromKey(endKey);
  if (!start || !end) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

function normalizeOption(value: Partial<SocialPlanOption>, fallbackId: string): SocialPlanOption {
  return {
    id: typeof value.id === 'string' ? value.id : fallbackId,
    label: typeof value.label === 'string' ? value.label : 'Aceitar o programa',
    detail: typeof value.detail === 'string' ? value.detail : 'Sair por algumas horas e voltar à rotina depois.',
    cost: Math.max(0, Math.round(Number(value.cost) || 0)),
    socialGain: Math.round(Number(value.socialGain) || 0),
    capitalGain: Math.round(Number(value.capitalGain) || 0),
    energyDelta: Math.round(Number(value.energyDelta) || 0),
    relationshipDelta: Math.round(Number(value.relationshipDelta) || 0),
    caseHoursCost: Math.max(0, Math.round(Number(value.caseHoursCost) || 0)),
    daysAdvance: Math.max(0, Math.round(Number(value.daysAdvance) || 0)),
  };
}

function fallbackOptions(kind: SocialEventKind): SocialPlanOption[] {
  if (kind === 'DATE_NIGHT') {
    return [
      normalizeOption({ id: 'simple-date', label: 'Saída simples a dois', detail: 'Um lugar tranquilo, conversa e uma bebida.', cost: 70, socialGain: 5, relationshipDelta: 5, energyDelta: 2, caseHoursCost: 3 }, 'simple-date'),
      normalizeOption({ id: 'date-night', label: 'Jantar e barzinho', detail: 'Jantar, bebida e tempo de qualidade longe do trabalho.', cost: 130, socialGain: 8, relationshipDelta: 8, energyDelta: -2, caseHoursCost: 5 }, 'date-night'),
      normalizeOption({ id: 'special-date', label: 'Noite especial', detail: 'Um programa mais completo para cuidar da relação.', cost: 190, socialGain: 11, relationshipDelta: 12, energyDelta: -6, caseHoursCost: 7, daysAdvance: 1 }, 'special-date'),
    ];
  }
  return [
    normalizeOption({ id: 'quick', label: 'Uma cerveja e conversa', detail: 'Passagem rápida pelo bar, sem exagerar.', cost: 45, socialGain: 4, capitalGain: 2, energyDelta: -6, relationshipDelta: 3, caseHoursCost: 3 }, 'quick'),
    normalizeOption({ id: 'normal', label: 'Noite com a galera', detail: 'Cervejas, petiscos e algumas horas longe do escritório.', cost: 90, socialGain: 7, capitalGain: 4, energyDelta: -14, relationshipDelta: 5, caseHoursCost: 6, daysAdvance: 1 }, 'normal'),
    normalizeOption({ id: 'full', label: 'Aproveitar a noite', detail: 'Rodada, petiscos e uma noite mais longa.', cost: 140, socialGain: 10, capitalGain: 5, energyDelta: -24, relationshipDelta: 7, caseHoursCost: 9, daysAdvance: 1 }, 'full'),
  ];
}

function normalizeEvent(value: unknown): SocialEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Partial<SocialEvent>;
  if (typeof event.id !== 'string' || typeof event.title !== 'string' || typeof event.message !== 'string') return null;
  const sourceContactId = (['MARIANA', 'PARTNER', 'ROBERTO', 'LAWYER_FELIPE', 'FRIEND_CARLOS'] as SocialContactId[]).includes(event.sourceContactId as SocialContactId)
    ? (event.sourceContactId as SocialContactId)
    : 'MARIANA';
  const kind = (['BAR', 'DATE_NIGHT', 'LUNCH', 'DINNER', 'NETWORKING', 'WEEKEND_SERRA', 'WEEKEND_BEACH', 'WEEKEND_MOUNTAIN'] as SocialEventKind[]).includes(event.kind as SocialEventKind)
    ? (event.kind as SocialEventKind)
    : 'BAR';
  const contact = sourceContactId === 'PARTNER'
    ? { name: 'Parceiro(a)', role: 'Relacionamento pessoal' }
    : SOCIAL_CONTACT_LABELS[sourceContactId];
  const options = Array.isArray(event.options) && event.options.length
    ? event.options.map((option, index) => normalizeOption(option, `${event.id}-option-${index}`))
    : fallbackOptions(kind);
  return {
    ...event,
    id: event.id,
    kind,
    status: event.status === 'COMPLETED' || event.status === 'DECLINED' ? event.status : 'PENDING',
    sourceContactId,
    contactName: typeof event.contactName === 'string' ? event.contactName : contact.name,
    contactRole: typeof event.contactRole === 'string' ? event.contactRole : contact.role,
    channel: event.channel === 'CALL' ? 'CALL' : 'WHATSAPP',
    title: event.title,
    message: event.message,
    createdDateKey: typeof event.createdDateKey === 'string' ? event.createdDateKey : '',
    options,
  };
}

function normalizeForDate(player: SocialPlayerKey, state: SocialLifeState) {
  if (!hasGameDate(player)) return state;
  const currentKey = gameDateKey(player);
  let energy = state.energy;
  let activeCondition = state.activeCondition;

  if (activeCondition && currentKey > activeCondition.expiresDateKey) {
    activeCondition = null;
    energy = Math.max(70, energy);
  }

  const passiveDays = daysBetween(state.lastEnergyDateKey, currentKey);
  if (!activeCondition && passiveDays > 0) {
    energy = Math.min(100, energy + Math.min(30, passiveDays * 12));
  }

  return { ...state, energy: clamp(energy), activeCondition };
}

export function readSocialLifeState(player: SocialPlayerKey): SocialLifeState {
  try {
    const raw = window.localStorage.getItem(storageKey(player));
    if (!raw) return normalizeForDate(player, emptyState());
    const parsed = JSON.parse(raw) as Partial<SocialLifeState>;
    const relationshipStatus = RELATIONSHIP_LABELS[parsed.profile?.relationshipStatus as RelationshipStatus]
      ? (parsed.profile?.relationshipStatus as RelationshipStatus)
      : 'UNDEFINED';
    const defaults = defaultRelationships();
    const relationships = Object.fromEntries(
      (Object.keys(defaults) as SocialContactId[]).map((contactId) => [
        contactId,
        clamp(Number(parsed.relationships?.[contactId]) || defaults[contactId]),
      ]),
    ) as Record<SocialContactId, number>;
    const normalized: SocialLifeState = {
      version: 2,
      profile: {
        relationshipStatus,
        partnerName: typeof parsed.profile?.partnerName === 'string' ? parsed.profile.partnerName.trim() : '',
      },
      pendingEvent: normalizeEvent(parsed.pendingEvent),
      history: Array.isArray(parsed.history)
        ? parsed.history.map(normalizeEvent).filter((item): item is SocialEvent => Boolean(item)).slice(0, 50)
        : [],
      generatedDateKeys: Array.isArray(parsed.generatedDateKeys)
        ? parsed.generatedDateKeys.filter((item): item is string => typeof item === 'string').slice(-100)
        : [],
      totalSpent: Math.max(0, Number(parsed.totalSpent) || 0),
      socialBalance: clamp(Number(parsed.socialBalance) || 50),
      socialCapital: clamp(Number(parsed.socialCapital) || 15),
      energy: clamp(Number(parsed.energy) || 72),
      relationships,
      activeCondition: parsed.activeCondition && typeof parsed.activeCondition === 'object'
        ? parsed.activeCondition as SocialCondition
        : null,
      lastEnergyDateKey: typeof parsed.lastEnergyDateKey === 'string' ? parsed.lastEnergyDateKey : null,
    };
    return normalizeForDate(player, normalized);
  } catch {
    return normalizeForDate(player, emptyState());
  }
}

export function saveSocialLifeState(player: SocialPlayerKey, state: SocialLifeState) {
  try {
    window.localStorage.setItem(storageKey(player), JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(SOCIAL_LIFE_UPDATED_EVENT, { detail: state }));
  } catch {
    // A vida social continua funcional durante a sessão sem persistência local.
  }
  return state;
}

export function updatePersonalLifeProfile(player: SocialPlayerKey, profile: PersonalLifeProfile) {
  const current = readSocialLifeState(player);
  const next: SocialLifeState = {
    ...current,
    profile: {
      relationshipStatus: profile.relationshipStatus,
      partnerName: isCommittedRelationship(profile.relationshipStatus) ? profile.partnerName.trim() : '',
    },
  };
  return saveSocialLifeState(player, next);
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
}

function shouldOfferOnCurrentDate(player: PlayerProfile) {
  const weekday = getGameWeekday(player);
  if (weekday === 5 || weekday === 6) return true;
  if (weekday === 0) return (player.gameCurrentDay + player.gameCurrentMonth) % 2 === 0;
  return (player.gameCurrentDay + player.gameCurrentMonth + player.gameCurrentYear) % 3 === 0;
}

function buildProfessionalRisk(player: PlayerProfile): SocialProfessionalRisk | undefined {
  if (!player.activeCase) return undefined;
  const caseData = GAME_CASES.find((item) => item.id === player.activeCase?.caseId);
  if (!caseData) return undefined;
  const remainingHours = Math.max(0, caseData.deadlineHours - player.activeCase.hoursSpent);
  const hasPlayableHearing = shouldRunPlayableHearing(caseData);
  const level: SocialRiskLevel = remainingHours <= 12
    ? 'CRITICAL'
    : remainingHours <= 24 || hasPlayableHearing
      ? 'HIGH'
      : remainingHours <= 40
        ? 'MEDIUM'
        : 'LOW';
  const hearingText = hasPlayableHearing
    ? ' Este processo seguirá para audiência jogável, então chegar cansado ou consumir horas de preparação pode prejudicar sua atuação.'
    : '';
  return {
    level,
    caseId: caseData.id,
    caseCode: caseData.code,
    remainingHours,
    hasPlayableHearing,
    message: `Você está conduzindo ${caseData.code} e possui cerca de ${remainingHours}h processuais restantes.${hearingText}`,
  };
}

function contactFor(sourceContactId: SocialContactId, partnerName: string) {
  if (sourceContactId === 'PARTNER') return { name: partnerName || 'Meu amor', role: 'Relacionamento pessoal' };
  return SOCIAL_CONTACT_LABELS[sourceContactId];
}

function option(input: SocialPlanOption) {
  return normalizeOption(input, input.id);
}

function buildCandidateEvents(player: PlayerProfile, state: SocialLifeState, dateKey: string): SocialEvent[] {
  const weekday = getGameWeekday(player);
  const committed = isCommittedRelationship(state.profile.relationshipStatus);
  const risk = buildProfessionalRisk(player);
  const events: SocialEvent[] = [];

  const add = (
    slug: string,
    kind: SocialEventKind,
    sourceContactId: SocialContactId,
    channel: SocialChannel,
    title: string,
    message: string,
    options: SocialPlanOption[],
  ) => {
    const contact = contactFor(sourceContactId, state.profile.partnerName);
    events.push({
      id: `social-${dateKey}-${slug}`,
      kind,
      status: 'PENDING',
      sourceContactId,
      contactName: contact.name,
      contactRole: contact.role,
      channel,
      title,
      message,
      createdDateKey: dateKey,
      options,
      professionalRisk: risk,
    });
  };

  if (weekday >= 1 && weekday <= 5) {
    add(
      'roberto-lunch',
      'LUNCH',
      'ROBERTO',
      'WHATSAPP',
      'Almoço com Dr. Roberto',
      'Dr. Roberto Ramos: Vou almoçar com alguns colegas e clientes do escritório. Se estiver disponível, gostaria que viesse conosco.',
      [
        option({ id: 'roberto-lunch', label: 'Ir ao almoço', detail: 'Duas horas de conversa fora do escritório. Pode aproximar você da direção e de contatos importantes.', cost: 85, socialGain: 3, capitalGain: 8, energyDelta: -2, relationshipDelta: 6, caseHoursCost: 2, daysAdvance: 0 }),
      ],
    );
    add(
      'felipe-lunch',
      'LUNCH',
      'LAWYER_FELIPE',
      'WHATSAPP',
      'Almoço com outro advogado',
      'Dr. Felipe Martins: Estou perto do seu escritório amanhã. Bora almoçar? Quero trocar umas ideias sobre carreira e alguns clientes que estão procurando indicação.',
      [
        option({ id: 'felipe-lunch', label: 'Aceitar o almoço', detail: 'Networking profissional com um colega da advocacia.', cost: 78, socialGain: 4, capitalGain: 9, energyDelta: -3, relationshipDelta: 7, caseHoursCost: 2, daysAdvance: 0 }),
      ],
    );
    add(
      'friend-dinner',
      'DINNER',
      'FRIEND_CARLOS',
      'WHATSAPP',
      'Jantar com um velho amigo',
      'Carlos Nogueira: Faz tempo que a gente não conversa sem falar de trabalho. Vamos jantar hoje e colocar a vida em dia?',
      [
        option({ id: 'friend-dinner-early', label: 'Jantar e voltar cedo', detail: 'Conversa tranquila sem estender demais a noite.', cost: 95, socialGain: 8, capitalGain: 1, energyDelta: -4, relationshipDelta: 8, caseHoursCost: 3, daysAdvance: 0 }),
        option({ id: 'friend-dinner-long', label: 'Estender a noite', detail: 'Jantar, sobremesa e algumas horas a mais conversando.', cost: 145, socialGain: 11, capitalGain: 2, energyDelta: -12, relationshipDelta: 10, caseHoursCost: 6, daysAdvance: 1 }),
      ],
    );
    if (committed) {
      add(
        'partner-date',
        'DATE_NIGHT',
        'PARTNER',
        'CALL',
        'Convite para sair a dois',
        `${state.profile.partnerName || 'Meu amor'}: Amor, você está trabalhando demais. Que tal a gente sair hoje à noite para jantar, conversar e tomar alguma coisa?`,
        fallbackOptions('DATE_NIGHT'),
      );
    }
  }

  if (weekday === 5 || weekday === 6) {
    add(
      'mariana-bar',
      'BAR',
      'MARIANA',
      'WHATSAPP',
      'Convite depois do expediente',
      'Mariana Duarte: Ei, doutor(a)! O pessoal vai passar num barzinho depois do expediente. Bora tomar uma cerveja e desligar um pouco do trabalho?',
      fallbackOptions('BAR'),
    );
    add(
      'felipe-networking',
      'NETWORKING',
      'LAWYER_FELIPE',
      'WHATSAPP',
      'Jantar de networking da advocacia',
      'Dr. Felipe Martins: Vai ter um jantar com alguns advogados e empresários hoje. É informal, mas costuma render boas conversas. Quer ir comigo?',
      [
        option({ id: 'networking-dinner', label: 'Ir ao jantar', detail: 'Uma noite de networking com profissionais e potenciais clientes.', cost: 160, socialGain: 5, capitalGain: 14, energyDelta: -10, relationshipDelta: 7, caseHoursCost: 5, daysAdvance: 1 }),
      ],
    );
  }

  if (weekday === 6 || weekday === 0) {
    const tripSource: SocialContactId = committed ? 'PARTNER' : 'FRIEND_CARLOS';
    add(
      'serra-weekend',
      'WEEKEND_SERRA',
      tripSource,
      committed ? 'CALL' : 'WHATSAPP',
      'Fim de semana na Serra',
      committed
        ? `${state.profile.partnerName || 'Meu amor'}: Que tal a gente largar tudo por um fim de semana e ir para a Serra? Só descansar, comer bem e ficar longe do escritório.`
        : 'Carlos Nogueira: A turma alugou uma casa na Serra para o fim de semana. Tem vaga no carro. Bora fugir do escritório por dois dias?',
      [
        option({ id: 'serra-day', label: 'Fazer um bate-volta', detail: 'Um dia na Serra, almoço e retorno à noite.', cost: 290, socialGain: 9, capitalGain: 2, energyDelta: 12, relationshipDelta: 8, caseHoursCost: 8, daysAdvance: 1 }),
        option({ id: 'serra-weekend', label: 'Passar o fim de semana', detail: 'Dois dias de descanso, gastronomia e distância do trabalho.', cost: 690, socialGain: 17, capitalGain: 3, energyDelta: 28, relationshipDelta: 14, caseHoursCost: 18, daysAdvance: 2 }),
      ],
    );
    add(
      'beach-weekend',
      'WEEKEND_BEACH',
      'FRIEND_CARLOS',
      'WHATSAPP',
      'Fim de semana na praia',
      'Carlos Nogueira: Estamos pensando em descer para a praia. Nada de notebook, só churrasco, mar e descanso. Vai encarar?',
      [
        option({ id: 'beach-day', label: 'Ir por um dia', detail: 'Praia, almoço e retorno no mesmo fim de semana.', cost: 260, socialGain: 10, capitalGain: 1, energyDelta: 10, relationshipDelta: 8, caseHoursCost: 9, daysAdvance: 1 }),
        option({ id: 'beach-weekend', label: 'Ficar o fim de semana', detail: 'Dois dias fora, com descanso maior e custo mais alto.', cost: 620, socialGain: 16, capitalGain: 2, energyDelta: 24, relationshipDelta: 13, caseHoursCost: 18, daysAdvance: 2 }),
      ],
    );
    add(
      'mountain-weekend',
      'WEEKEND_MOUNTAIN',
      'LAWYER_FELIPE',
      'WHATSAPP',
      'Fim de semana na montanha',
      'Dr. Felipe Martins: Um grupo pequeno vai passar o fim de semana numa pousada na montanha. Vai ter trilha, jantar e muita conversa boa. Quer vir?',
      [
        option({ id: 'mountain-weekend', label: 'Aceitar a viagem', detail: 'Dois dias em pousada, com descanso e networking moderado.', cost: 780, socialGain: 14, capitalGain: 8, energyDelta: 25, relationshipDelta: 10, caseHoursCost: 18, daysAdvance: 2 }),
      ],
    );
  }

  return events;
}

export function buildSocialOpportunity(player: PlayerProfile, state: SocialLifeState): SocialEvent | null {
  if (state.profile.relationshipStatus === 'UNDEFINED' || state.pendingEvent) return null;
  const dateKey = gameDateKey(player);
  if (state.generatedDateKeys.includes(dateKey) || !shouldOfferOnCurrentDate(player)) return null;
  const candidates = buildCandidateEvents(player, state, dateKey);
  if (!candidates.length) return null;
  const seed = `${getProfessionalOwnerKey(player)}:${dateKey}:${player.careerTier}:${state.socialCapital}`;
  return candidates[hashString(seed) % candidates.length];
}

export function registerSocialOpportunity(player: PlayerProfile, state: SocialLifeState, event: SocialEvent) {
  const next: SocialLifeState = {
    ...state,
    pendingEvent: event,
    generatedDateKeys: [...state.generatedDateKeys, event.createdDateKey].slice(-100),
  };
  return saveSocialLifeState(player, next);
}

function declineRelationshipDelta(event: SocialEvent) {
  if (event.sourceContactId === 'PARTNER') return -3;
  if (event.sourceContactId === 'FRIEND_CARLOS') return -2;
  if (event.sourceContactId === 'ROBERTO') return -1;
  return 0;
}

export function declineSocialEvent(player: PlayerProfile, state: SocialLifeState) {
  if (!state.pendingEvent) return state;
  const event: SocialEvent = {
    ...state.pendingEvent,
    status: 'DECLINED',
    completedDateKey: gameDateKey(player),
  };
  const relationshipDelta = declineRelationshipDelta(event);
  return saveSocialLifeState(player, {
    ...state,
    pendingEvent: null,
    history: [event, ...state.history].slice(0, 50),
    socialBalance: clamp(state.socialBalance - (event.sourceContactId === 'PARTNER' ? 2 : event.sourceContactId === 'FRIEND_CARLOS' ? 1 : 0)),
    relationships: {
      ...state.relationships,
      [event.sourceContactId]: clamp(state.relationships[event.sourceContactId] + relationshipDelta),
    },
  });
}

function endDateKey(player: PlayerProfile, daysAdvance: number) {
  const next = addGameDays(player, daysAdvance);
  return gameDateKey(next);
}

function buildCondition(event: SocialEvent, optionValue: SocialPlanOption, nextEnergy: number, endKey: string): SocialCondition | null {
  if (nextEnergy <= 30 || optionValue.energyDelta <= -20) {
    return { label: 'EXAUSTO', sourceEventId: event.id, sourceTitle: event.title, hearingModifier: -2, expiresDateKey: endKey };
  }
  if (nextEnergy <= 52 || optionValue.energyDelta <= -10) {
    return { label: 'CANSADO', sourceEventId: event.id, sourceTitle: event.title, hearingModifier: -1, expiresDateKey: endKey };
  }
  if (nextEnergy >= 85 && optionValue.energyDelta >= 10) {
    const extra = addGameDays(playerFromDateKey(endKey), 1);
    return { label: 'DESCANSADO', sourceEventId: event.id, sourceTitle: event.title, hearingModifier: 1, expiresDateKey: gameDateKey(extra) };
  }
  return null;
}

function playerFromDateKey(value: string): Pick<PlayerProfile, 'gameCurrentDay' | 'gameCurrentMonth' | 'gameCurrentYear'> {
  const [year, month, day] = value.split('-').map(Number);
  return { gameCurrentDay: day, gameCurrentMonth: month, gameCurrentYear: year };
}

export function completeSocialEvent(player: PlayerProfile, state: SocialLifeState, selectedOption: SocialPlanOption) {
  if (!state.pendingEvent) return state;
  const chosen = normalizeOption(selectedOption, selectedOption.id);
  const spent = Math.max(0, chosen.cost);
  const nextEnergy = clamp(state.energy + chosen.energyDelta);
  const endKey = endDateKey(player, chosen.daysAdvance);
  const event: SocialEvent = {
    ...state.pendingEvent,
    status: 'COMPLETED',
    completedDateKey: endKey,
    selectedOptionId: chosen.id,
    moneySpent: spent,
    socialGain: chosen.socialGain,
    capitalGain: chosen.capitalGain,
    energyDelta: chosen.energyDelta,
    relationshipDelta: chosen.relationshipDelta,
    caseHoursCost: chosen.caseHoursCost,
    daysAdvanced: chosen.daysAdvance,
  };
  return saveSocialLifeState(player, {
    ...state,
    pendingEvent: null,
    history: [event, ...state.history].slice(0, 50),
    totalSpent: state.totalSpent + spent,
    socialBalance: clamp(state.socialBalance + chosen.socialGain),
    socialCapital: clamp(state.socialCapital + chosen.capitalGain),
    energy: nextEnergy,
    relationships: {
      ...state.relationships,
      [event.sourceContactId]: clamp(state.relationships[event.sourceContactId] + chosen.relationshipDelta),
    },
    activeCondition: buildCondition(event, chosen, nextEnergy, endKey),
    lastEnergyDateKey: endKey,
  });
}

export function getSocialProfessionalCondition(player: PlayerProfile) {
  const state = readSocialLifeState(player);
  const currentKey = gameDateKey(player);
  const condition = state.activeCondition && currentKey <= state.activeCondition.expiresDateKey
    ? state.activeCondition
    : null;
  if (condition) {
    return {
      energy: state.energy,
      label: condition.label,
      hearingModifier: condition.hearingModifier,
      sourceTitle: condition.sourceTitle,
      description: condition.label === 'EXAUSTO'
        ? 'Você chega fisicamente desgastado. Sua atuação oral terá uma penalidade moderada, mas o resultado ainda depende do processo como um todo.'
        : condition.label === 'CANSADO'
          ? 'Você chega cansado e com menor margem de concentração. A audiência recebe uma pequena penalidade de desempenho.'
          : 'Você chega descansado e com boa disposição. Isso ajuda levemente sua atuação oral, sem substituir preparação e prova.',
    };
  }
  return {
    energy: state.energy,
    label: 'EQUILIBRADO' as const,
    hearingModifier: 0,
    sourceTitle: '',
    description: 'Seu estado físico não cria bônus nem penalidade especial para a audiência.',
  };
}

export function getRelationshipLabel(score: number) {
  if (score >= 85) return 'Grande confiança';
  if (score >= 65) return 'Próximo';
  if (score >= 45) return 'Boa relação';
  if (score >= 25) return 'Conhecido';
  return 'Distante';
}

export function addGameDays(
  player: Pick<PlayerProfile, 'gameCurrentDay' | 'gameCurrentMonth' | 'gameCurrentYear'>,
  days: number,
) {
  const date = new Date(Date.UTC(player.gameCurrentYear, player.gameCurrentMonth - 1, player.gameCurrentDay));
  date.setUTCDate(date.getUTCDate() + Math.max(0, Math.floor(days)));
  return {
    gameCurrentDay: date.getUTCDate(),
    gameCurrentMonth: date.getUTCMonth() + 1,
    gameCurrentYear: date.getUTCFullYear(),
  };
}
