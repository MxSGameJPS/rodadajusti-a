import type { ActiveCaseState, LegalCase, PlayerProfile } from '../types/game';
import { getCareerRank, getAvailableCasesForCareer } from './caseRules';
import { getAppealOfCaseId } from './caseMetadata';
import { getProfessionalOwnerKey } from './professionalRpg';

const PLAYER_SAVE_KEY = 'rota_da_justica_save_v1';
const STORAGE_PREFIX = 'rota_independent_practice_v1:';

export const INDEPENDENT_PRACTICE_UPDATED_EVENT = 'rota:independent-practice-updated';
export const SOCIAL_JURIDICO_PRO_MONTHLY_PRICE = 150;

export interface IndependentPracticeState {
  version: 1;
  socialJuridicoPlan: 'NONE' | 'PRO';
  socialJuridicoSubscribedAt: string | null;
  socialJuridicoPaidThrough: string | null;
  independentCaseIds: string[];
  ownOfficeOpenedAt: string | null;
}

const DEFAULT_STATE: IndependentPracticeState = {
  version: 1,
  socialJuridicoPlan: 'NONE',
  socialJuridicoSubscribedAt: null,
  socialJuridicoPaidThrough: null,
  independentCaseIds: [],
  ownOfficeOpenedAt: null,
};

function storageKey(player: PlayerProfile) {
  return `${STORAGE_PREFIX}${getProfessionalOwnerKey(player)}`;
}

function currentGameDate(player: PlayerProfile) {
  return new Date(Date.UTC(player.gameCurrentYear, player.gameCurrentMonth - 1, player.gameCurrentDay));
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addOneMonth(date: Date) {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function parseIsoDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function emitUpdate(player: PlayerProfile, state: IndependentPracticeState) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(INDEPENDENT_PRACTICE_UPDATED_EVENT, {
    detail: { ownerKey: getProfessionalOwnerKey(player), state },
  }));
}

export function readIndependentPracticeState(player: PlayerProfile | null | undefined): IndependentPracticeState {
  if (!player || typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(storageKey(player));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<IndependentPracticeState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      version: 1,
      independentCaseIds: Array.isArray(parsed.independentCaseIds)
        ? parsed.independentCaseIds.filter((id): id is string => typeof id === 'string').slice(-80)
        : [],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveIndependentPracticeState(player: PlayerProfile, state: IndependentPracticeState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(player), JSON.stringify(state));
  } catch {
    // Mantém a sessão funcional mesmo quando o armazenamento local falhar.
  }
  emitUpdate(player, state);
}

export function isSocialJuridicoProActive(player: PlayerProfile, state = readIndependentPracticeState(player)) {
  if (state.socialJuridicoPlan !== 'PRO') return false;
  const paidThrough = parseIsoDate(state.socialJuridicoPaidThrough);
  if (!paidThrough) return false;
  return currentGameDate(player).getTime() <= paidThrough.getTime();
}

export function subscribeSocialJuridicoPro(player: PlayerProfile) {
  if (typeof window === 'undefined') return { ok: false as const, reason: 'STORAGE' as const };
  try {
    const raw = window.localStorage.getItem(PLAYER_SAVE_KEY);
    if (!raw) return { ok: false as const, reason: 'STORAGE' as const };
    const current = JSON.parse(raw) as PlayerProfile;
    if ((Number(current.money) || 0) < SOCIAL_JURIDICO_PRO_MONTHLY_PRICE) {
      return { ok: false as const, reason: 'MONEY' as const };
    }

    const today = currentGameDate(current);
    const previous = readIndependentPracticeState(current);
    const previousPaidThrough = parseIsoDate(previous.socialJuridicoPaidThrough);
    const baseDate = previousPaidThrough && previousPaidThrough.getTime() > today.getTime()
      ? previousPaidThrough
      : today;
    const paidThrough = addOneMonth(baseDate);

    const nextState: IndependentPracticeState = {
      ...previous,
      socialJuridicoPlan: 'PRO',
      socialJuridicoSubscribedAt: previous.socialJuridicoSubscribedAt || formatIsoDate(today),
      socialJuridicoPaidThrough: formatIsoDate(paidThrough),
    };

    window.localStorage.setItem(PLAYER_SAVE_KEY, JSON.stringify({
      ...current,
      money: Math.max(0, (Number(current.money) || 0) - SOCIAL_JURIDICO_PRO_MONTHLY_PRICE),
    }));
    saveIndependentPracticeState(current, nextState);
    return { ok: true as const, state: nextState, paidThrough: nextState.socialJuridicoPaidThrough };
  } catch {
    return { ok: false as const, reason: 'STORAGE' as const };
  }
}

export function getIndependentMarketplaceCase(player: PlayerProfile, catalog: LegalCase[]) {
  if (player.activeCase) return null;
  const state = readIndependentPracticeState(player);
  if (!isSocialJuridicoProActive(player, state)) return null;

  const handled = new Set(player.history.map((record) => record.caseId));
  const lawyerRank = getCareerRank('ADVOGADO_CONTRATADO');
  const eligible = getAvailableCasesForCareer(catalog, player.careerTier)
    .filter((caseItem) => !getAppealOfCaseId(caseItem))
    .filter((caseItem) => !handled.has(caseItem.id))
    .filter((caseItem) => getCareerRank(caseItem.minCareerTier) >= lawyerRank);

  return eligible[0] || null;
}

export function startIndependentMarketplaceCase(player: PlayerProfile, caseItem: LegalCase) {
  if (typeof window === 'undefined') return false;
  const state = readIndependentPracticeState(player);
  if (!isSocialJuridicoProActive(player, state)) return false;

  const activeCase: ActiveCaseState = {
    caseId: caseItem.id,
    hoursSpent: 0,
    currentLocationId: caseItem.locations[0]?.id || 'LOC_ESCRITORIO_RAMOS',
    discoveredClueIds: [],
    unlockedLocationIds: caseItem.locations.filter((location) => location.unlockedByDefault).map((location) => location.id),
    askedDialogueIds: [],
    inspectedSpotIds: [],
    logs: [
      {
        id: `log-sj-pro-${Date.now()}`,
        timestampGameHours: 0,
        message: `Caso aceito pela conta própria do Social Jurídico Pro: ${caseItem.title}`,
        type: 'alerta',
      },
    ],
    selectedStrategyId: null,
    selectedEvidenceIds: [],
    socialJuridicoActions: [],
  };

  try {
    const raw = window.localStorage.getItem(PLAYER_SAVE_KEY);
    const current = raw ? (JSON.parse(raw) as PlayerProfile) : player;
    window.localStorage.setItem(PLAYER_SAVE_KEY, JSON.stringify({ ...current, activeCase }));
    saveIndependentPracticeState(player, {
      ...state,
      independentCaseIds: [...new Set([...state.independentCaseIds, caseItem.id])].slice(-80),
    });
    return true;
  } catch {
    return false;
  }
}

export function isIndependentCase(player: PlayerProfile, caseId: string) {
  return readIndependentPracticeState(player).independentCaseIds.includes(caseId);
}

export function openOwnOffice(player: PlayerProfile, officeName: string) {
  if (typeof window === 'undefined') return false;
  const cleanName = officeName.trim().slice(0, 80);
  if (!cleanName) return false;

  try {
    const raw = window.localStorage.getItem(PLAYER_SAVE_KEY);
    if (!raw) return false;
    const current = JSON.parse(raw) as PlayerProfile;
    const nextPlayer: PlayerProfile = {
      ...current,
      officeFinances: {
        ...current.officeFinances,
        isOfficeOpen: true,
        officeName: cleanName,
      },
    };
    window.localStorage.setItem(PLAYER_SAVE_KEY, JSON.stringify(nextPlayer));

    const state = readIndependentPracticeState(current);
    saveIndependentPracticeState(current, {
      ...state,
      ownOfficeOpenedAt: state.ownOfficeOpenedAt || formatIsoDate(currentGameDate(current)),
    });
    return true;
  } catch {
    return false;
  }
}
