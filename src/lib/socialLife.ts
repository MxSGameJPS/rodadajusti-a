import type { PlayerProfile } from '../types/game';
import { getProfessionalOwnerKey } from './professionalRpg';

export type RelationshipStatus = 'UNDEFINED' | 'SINGLE' | 'DATING' | 'MARRIED' | 'STABLE_UNION';
export type SocialContactId = 'MARIANA' | 'PARTNER';
export type SocialChannel = 'WHATSAPP' | 'CALL';
export type SocialEventKind = 'BAR' | 'DATE_NIGHT';
export type SocialEventStatus = 'PENDING' | 'COMPLETED' | 'DECLINED';

export interface PersonalLifeProfile {
  relationshipStatus: RelationshipStatus;
  partnerName: string;
}

export interface SocialEvent {
  id: string;
  kind: SocialEventKind;
  status: SocialEventStatus;
  sourceContactId: SocialContactId;
  channel: SocialChannel;
  title: string;
  message: string;
  createdDateKey: string;
  completedDateKey?: string;
  moneySpent?: number;
  socialGain?: number;
}

export interface SocialLifeState {
  version: 1;
  profile: PersonalLifeProfile;
  pendingEvent: SocialEvent | null;
  history: SocialEvent[];
  generatedDateKeys: string[];
  totalSpent: number;
  socialBalance: number;
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

export function isCommittedRelationship(status: RelationshipStatus) {
  return status === 'DATING' || status === 'MARRIED' || status === 'STABLE_UNION';
}

function emptyState(): SocialLifeState {
  return {
    version: 1,
    profile: {
      relationshipStatus: 'UNDEFINED',
      partnerName: '',
    },
    pendingEvent: null,
    history: [],
    generatedDateKeys: [],
    totalSpent: 0,
    socialBalance: 50,
  };
}

function storageKey(player: Pick<PlayerProfile, 'cloudCareerId' | 'name' | 'oabRegistration'>) {
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

function safeEvent(value: unknown): value is SocialEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<SocialEvent>;
  return typeof event.id === 'string' && typeof event.title === 'string' && typeof event.message === 'string';
}

export function readSocialLifeState(player: Pick<PlayerProfile, 'cloudCareerId' | 'name' | 'oabRegistration'>): SocialLifeState {
  try {
    const raw = window.localStorage.getItem(storageKey(player));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<SocialLifeState>;
    const relationshipStatus = RELATIONSHIP_LABELS[parsed.profile?.relationshipStatus as RelationshipStatus]
      ? (parsed.profile?.relationshipStatus as RelationshipStatus)
      : 'UNDEFINED';
    return {
      version: 1,
      profile: {
        relationshipStatus,
        partnerName: typeof parsed.profile?.partnerName === 'string' ? parsed.profile.partnerName.trim() : '',
      },
      pendingEvent: safeEvent(parsed.pendingEvent) ? parsed.pendingEvent : null,
      history: Array.isArray(parsed.history) ? parsed.history.filter(safeEvent).slice(0, 50) : [],
      generatedDateKeys: Array.isArray(parsed.generatedDateKeys)
        ? parsed.generatedDateKeys.filter((item): item is string => typeof item === 'string').slice(-80)
        : [],
      totalSpent: Math.max(0, Number(parsed.totalSpent) || 0),
      socialBalance: Math.max(0, Math.min(100, Number(parsed.socialBalance) || 50)),
    };
  } catch {
    return emptyState();
  }
}

export function saveSocialLifeState(
  player: Pick<PlayerProfile, 'cloudCareerId' | 'name' | 'oabRegistration'>,
  state: SocialLifeState,
) {
  try {
    window.localStorage.setItem(storageKey(player), JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(SOCIAL_LIFE_UPDATED_EVENT, { detail: state }));
  } catch {
    // A vida social continua funcional durante a sessão sem persistência local.
  }
  return state;
}

export function updatePersonalLifeProfile(
  player: Pick<PlayerProfile, 'cloudCareerId' | 'name' | 'oabRegistration'>,
  profile: PersonalLifeProfile,
) {
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

function shouldOfferOnCurrentDate(player: PlayerProfile, committed: boolean) {
  const weekday = getGameWeekday(player);
  const day = player.gameCurrentDay;
  const month = player.gameCurrentMonth;

  if (committed) {
    if (weekday === 0 || weekday === 6) return true;
    return weekday >= 1 && weekday <= 5 && (day + month) % 5 === 0;
  }

  if (weekday === 5 || weekday === 6) return true;
  return weekday >= 1 && weekday <= 4 && (day + month) % 7 === 0;
}

export function buildSocialOpportunity(player: PlayerProfile, state: SocialLifeState): SocialEvent | null {
  if (state.profile.relationshipStatus === 'UNDEFINED' || state.pendingEvent) return null;

  const dateKey = gameDateKey(player);
  if (state.generatedDateKeys.includes(dateKey)) return null;

  const committed = isCommittedRelationship(state.profile.relationshipStatus);
  if (!shouldOfferOnCurrentDate(player, committed)) return null;

  const weekday = getGameWeekday(player);
  if (committed) {
    const partnerName = state.profile.partnerName || 'Meu amor';
    const channel: SocialChannel = weekday === 0 || (weekday === 6 && player.gameCurrentDay % 2 === 0) ? 'CALL' : 'WHATSAPP';
    return {
      id: `social-${dateKey}-partner`,
      kind: 'DATE_NIGHT',
      status: 'PENDING',
      sourceContactId: 'PARTNER',
      channel,
      title: 'Convite para sair a dois',
      message: `${partnerName}: Amor, você está trabalhando demais. Que tal a gente sair hoje à noite para jantar, conversar e tomar alguma coisa?`,
      createdDateKey: dateKey,
    };
  }

  return {
    id: `social-${dateKey}-mariana`,
    kind: 'BAR',
    status: 'PENDING',
    sourceContactId: 'MARIANA',
    channel: 'WHATSAPP',
    title: 'Convite depois do expediente',
    message: 'Mariana Duarte: Ei, doutor(a)! O pessoal vai passar num barzinho depois do expediente. Bora tomar uma cerveja e desligar um pouco do trabalho?',
    createdDateKey: dateKey,
  };
}

export function registerSocialOpportunity(player: PlayerProfile, state: SocialLifeState, event: SocialEvent) {
  const next: SocialLifeState = {
    ...state,
    pendingEvent: event,
    generatedDateKeys: [...state.generatedDateKeys, event.createdDateKey].slice(-80),
  };
  return saveSocialLifeState(player, next);
}

export function declineSocialEvent(player: PlayerProfile, state: SocialLifeState) {
  if (!state.pendingEvent) return state;
  const event: SocialEvent = {
    ...state.pendingEvent,
    status: 'DECLINED',
    completedDateKey: gameDateKey(player),
  };
  return saveSocialLifeState(player, {
    ...state,
    pendingEvent: null,
    history: [event, ...state.history].slice(0, 50),
    socialBalance: Math.max(0, state.socialBalance - (event.sourceContactId === 'PARTNER' ? 2 : 0)),
  });
}

export function completeSocialEvent(player: PlayerProfile, state: SocialLifeState, moneySpent: number, socialGain: number) {
  if (!state.pendingEvent) return state;
  const spent = Math.max(0, Math.round(moneySpent));
  const gain = Math.max(0, Math.round(socialGain));
  const event: SocialEvent = {
    ...state.pendingEvent,
    status: 'COMPLETED',
    completedDateKey: gameDateKey(player),
    moneySpent: spent,
    socialGain: gain,
  };
  return saveSocialLifeState(player, {
    ...state,
    pendingEvent: null,
    history: [event, ...state.history].slice(0, 50),
    totalSpent: state.totalSpent + spent,
    socialBalance: Math.min(100, state.socialBalance + gain),
  });
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
