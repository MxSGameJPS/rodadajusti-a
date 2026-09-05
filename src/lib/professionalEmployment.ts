import type { PlayerProfile } from '../types/game';
import { getProfessionalOwnerKey } from './professionalRpg';

const PLAYER_SAVE_KEY = 'rota_da_justica_save_v1';
const EMPLOYMENT_STORAGE_PREFIX = 'rota_professional_employment_v1:';

export const PROFESSIONAL_EMPLOYMENT_UPDATED_EVENT = 'rota:professional-employment-updated';

export type ProfessionalEmploymentContractStatus = 'PENDING' | 'SIGNED';

export interface ProfessionalEmploymentState {
  version: 1;
  contractStatus: ProfessionalEmploymentContractStatus;
  signedAt: string | null;
  onboardingCompleted: boolean;
  devicesUnlocked: boolean;
  officeName: 'Ramos & Associados';
  role: 'Advogado Contratado';
  salaryMonthly: number;
  weeklyHours: number;
  exclusiveDedication: boolean;
  workRegime: 'MISTO';
}

const DEFAULT_STATE: ProfessionalEmploymentState = {
  version: 1,
  contractStatus: 'PENDING',
  signedAt: null,
  onboardingCompleted: false,
  devicesUnlocked: false,
  officeName: 'Ramos & Associados',
  role: 'Advogado Contratado',
  salaryMonthly: 5800,
  weeklyHours: 40,
  exclusiveDedication: true,
  workRegime: 'MISTO',
};

function storageKey(player: PlayerProfile) {
  return `${EMPLOYMENT_STORAGE_PREFIX}${getProfessionalOwnerKey(player)}`;
}

function emitUpdate(player: PlayerProfile, state: ProfessionalEmploymentState) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(PROFESSIONAL_EMPLOYMENT_UPDATED_EVENT, {
      detail: {
        ownerKey: getProfessionalOwnerKey(player),
        state,
      },
    }),
  );
}

function patchWorkingPlayer(patch: Partial<PlayerProfile>) {
  if (typeof window === 'undefined') return false;

  try {
    const raw = window.localStorage.getItem(PLAYER_SAVE_KEY);
    if (!raw) return false;
    const current = JSON.parse(raw) as PlayerProfile;
    window.localStorage.setItem(PLAYER_SAVE_KEY, JSON.stringify({ ...current, ...patch }));
    return true;
  } catch {
    return false;
  }
}

export function readProfessionalEmploymentState(
  player: PlayerProfile | null | undefined,
): ProfessionalEmploymentState | null {
  if (!player?.oabRegistration || typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(storageKey(player));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<ProfessionalEmploymentState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      version: 1,
      officeName: 'Ramos & Associados',
      role: 'Advogado Contratado',
      workRegime: 'MISTO',
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveProfessionalEmploymentState(
  player: PlayerProfile,
  state: ProfessionalEmploymentState,
) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey(player), JSON.stringify(state));
  } catch {
    // A experiência continua válida durante a sessão mesmo sem persistência local.
  }

  emitUpdate(player, state);
}

export function reconcilePostOabCareerBeforeContract(player: PlayerProfile) {
  if (!player.oabRegistration) return false;
  const employment = readProfessionalEmploymentState(player);
  if (employment?.contractStatus === 'SIGNED') return false;
  if (player.careerTier !== 'ADVOGADO_CONTRATADO') return false;

  return patchWorkingPlayer({ careerTier: 'ESTAGIARIO_SENIOR' });
}

export function signProfessionalEmploymentContract(player: PlayerProfile, signedAt: string) {
  const current = readProfessionalEmploymentState(player) || { ...DEFAULT_STATE };
  const next: ProfessionalEmploymentState = {
    ...current,
    contractStatus: 'SIGNED',
    signedAt,
    onboardingCompleted: false,
    devicesUnlocked: false,
  };

  saveProfessionalEmploymentState(player, next);
  patchWorkingPlayer({ careerTier: 'ADVOGADO_CONTRATADO' });
  return next;
}

export function completeProfessionalEmploymentOnboarding(player: PlayerProfile) {
  const current = readProfessionalEmploymentState(player) || { ...DEFAULT_STATE };
  const next: ProfessionalEmploymentState = {
    ...current,
    contractStatus: 'SIGNED',
    onboardingCompleted: true,
    devicesUnlocked: true,
  };

  saveProfessionalEmploymentState(player, next);
  patchWorkingPlayer({ careerTier: 'ADVOGADO_CONTRATADO' });
  return next;
}

export function isProfessionalEmploymentActive(player: PlayerProfile | null | undefined) {
  const state = readProfessionalEmploymentState(player);
  return Boolean(
    player?.oabRegistration &&
      state?.contractStatus === 'SIGNED' &&
      state.onboardingCompleted &&
      state.devicesUnlocked,
  );
}
