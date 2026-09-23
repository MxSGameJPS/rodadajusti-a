import type { CareerTierId, PlayerProfile } from '../types/game';
import { emitPlayerSaveExternalUpdated } from './playerSaveEvents';
import { getProfessionalOwnerKey } from './professionalRpg';

const PLAYER_SAVE_KEY = 'rota_da_justica_save_v1';
const EMPLOYMENT_STORAGE_PREFIX = 'rota_professional_employment_v1:';
const LAWYER_TIERS = new Set<CareerTierId>([
  'ADVOGADO_CONTRATADO',
  'ADVOGADO_SENIOR',
  'SOCIO_ESCRITORIO',
  'DONO_ESCRITORIO',
]);
const VALID_CAREER_TIERS = new Set<CareerTierId>([
  'ESTAGIARIO',
  'ESTAGIARIO_SENIOR',
  'ADVOGADO_CONTRATADO',
  'ADVOGADO_SENIOR',
  'SOCIO_ESCRITORIO',
  'DONO_ESCRITORIO',
  'MAGISTRADO_SUBSTITUTO',
  'JUIZ_TITULAR',
  'DESEMBARGADOR',
]);

export const PROFESSIONAL_EMPLOYMENT_UPDATED_EVENT = 'rota:professional-employment-updated';

export type ProfessionalEmploymentContractStatus = 'PENDING' | 'SIGNED';

export interface ProfessionalEmploymentState {
  version: 2;
  contractStatus: ProfessionalEmploymentContractStatus;
  signedAt: string | null;
  onboardingCompleted: boolean;
  devicesUnlocked: boolean;
  officeId: string | null;
  officeSlug: string;
  officeName: string;
  roleId: string | null;
  roleCode: string;
  role: string;
  salaryMonthly: number;
  weeklyHours: number;
  exclusiveDedication: boolean;
  workRegime: string;
  benefits: Record<string, unknown>;
  sourceOfferId: string | null;
  sourceOfferType: string | null;
}

type ActivateEmploymentInput = {
  officeId: string | null;
  officeSlug: string;
  officeName: string;
  roleId: string | null;
  roleCode: string;
  role: string;
  salaryMonthly: number;
  weeklyHours: number;
  exclusiveDedication: boolean;
  workRegime: string;
  benefits?: Record<string, unknown>;
  sourceOfferId?: string | null;
  sourceOfferType?: string | null;
  signedAt: string;
  careerTier?: CareerTierId | null;
};

const DEFAULT_STATE: ProfessionalEmploymentState = {
  version: 2,
  contractStatus: 'PENDING',
  signedAt: null,
  onboardingCompleted: false,
  devicesUnlocked: false,
  officeId: null,
  officeSlug: 'ramos-associados',
  officeName: 'Ramos & Associados',
  roleId: null,
  roleCode: 'ADVOGADO_CONTRATADO',
  role: 'Advogado Contratado',
  salaryMonthly: 5800,
  weeklyHours: 40,
  exclusiveDedication: true,
  workRegime: 'MISTO',
  benefits: {
    socialJuridico: {
      included: true,
      plan: 'ENTERPRISE',
    },
  },
  sourceOfferId: null,
  sourceOfferType: null,
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
    emitPlayerSaveExternalUpdated();
    return true;
  } catch {
    return false;
  }
}

function resolveCareerTierAfterOnboarding(player: PlayerProfile): CareerTierId {
  return LAWYER_TIERS.has(player.careerTier) ? player.careerTier : 'ADVOGADO_CONTRATADO';
}

function normalizeState(parsed?: Partial<ProfessionalEmploymentState> | null): ProfessionalEmploymentState {
  return {
    ...DEFAULT_STATE,
    ...(parsed || {}),
    version: 2,
    officeId: parsed?.officeId ?? null,
    officeSlug: typeof parsed?.officeSlug === 'string' && parsed.officeSlug.trim()
      ? parsed.officeSlug
      : DEFAULT_STATE.officeSlug,
    officeName: typeof parsed?.officeName === 'string' && parsed.officeName.trim()
      ? parsed.officeName
      : DEFAULT_STATE.officeName,
    roleId: parsed?.roleId ?? null,
    roleCode: typeof parsed?.roleCode === 'string' && parsed.roleCode.trim()
      ? parsed.roleCode
      : DEFAULT_STATE.roleCode,
    role: typeof parsed?.role === 'string' && parsed.role.trim()
      ? parsed.role
      : DEFAULT_STATE.role,
    workRegime: typeof parsed?.workRegime === 'string' && parsed.workRegime.trim()
      ? parsed.workRegime
      : DEFAULT_STATE.workRegime,
    benefits: parsed?.benefits && typeof parsed.benefits === 'object'
      ? parsed.benefits
      : DEFAULT_STATE.benefits,
    sourceOfferId: parsed?.sourceOfferId ?? null,
    sourceOfferType: parsed?.sourceOfferType ?? null,
  };
}

export function isProfessionalPreviewMode() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('preview') === 'advogado';
}

export function readProfessionalEmploymentState(
  player: PlayerProfile | null | undefined,
): ProfessionalEmploymentState | null {
  if (!player?.oabRegistration || typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(storageKey(player));
    if (!raw) return { ...DEFAULT_STATE };
    return normalizeState(JSON.parse(raw) as Partial<ProfessionalEmploymentState>);
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
    window.localStorage.setItem(storageKey(player), JSON.stringify(normalizeState(state)));
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
  patchWorkingPlayer({ careerTier: resolveCareerTierAfterOnboarding(player) });
  return next;
}

export function activateLawFirmEmployment(
  player: PlayerProfile,
  input: ActivateEmploymentInput,
): ProfessionalEmploymentState {
  const next: ProfessionalEmploymentState = normalizeState({
    contractStatus: 'SIGNED',
    signedAt: input.signedAt,
    onboardingCompleted: true,
    devicesUnlocked: true,
    officeId: input.officeId,
    officeSlug: input.officeSlug,
    officeName: input.officeName,
    roleId: input.roleId,
    roleCode: input.roleCode,
    role: input.role,
    salaryMonthly: Math.max(0, Number(input.salaryMonthly) || 0),
    weeklyHours: Math.max(0, Math.floor(Number(input.weeklyHours) || 0)),
    exclusiveDedication: Boolean(input.exclusiveDedication),
    workRegime: input.workRegime || 'MISTO',
    benefits: input.benefits || {},
    sourceOfferId: input.sourceOfferId || null,
    sourceOfferType: input.sourceOfferType || null,
  });

  saveProfessionalEmploymentState(player, next);

  const desiredTier = input.careerTier && VALID_CAREER_TIERS.has(input.careerTier)
    ? input.careerTier
    : LAWYER_TIERS.has(player.careerTier)
      ? player.careerTier
      : 'ADVOGADO_CONTRATADO';

  patchWorkingPlayer({
    careerTier: desiredTier,
    officeDiscipline: {
      ...player.officeDiscipline,
      warningCount: 0,
      employmentStatus: 'ACTIVE',
    },
  });

  return next;
}

/**
 * Indica que a fase profissional já foi desbloqueada. Depois de uma demissão,
 * notebook/celular e a vida profissional continuam existindo; o vínculo ativo
 * com um empregador é determinado separadamente por isEmployedProfessional.
 */
export function isProfessionalEmploymentActive(player: PlayerProfile | null | undefined) {
  if (isProfessionalPreviewMode()) return true;

  const state = readProfessionalEmploymentState(player);
  return Boolean(
    player?.oabRegistration &&
      state?.contractStatus === 'SIGNED' &&
      state.onboardingCompleted &&
      state.devicesUnlocked,
  );
}

export function isEmployedProfessional(player: PlayerProfile | null | undefined) {
  if (isProfessionalPreviewMode()) return true;
  return Boolean(
    isProfessionalEmploymentActive(player) &&
      player?.officeDiscipline?.employmentStatus !== 'TERMINATED',
  );
}

export function isRamosEmploymentActive(player: PlayerProfile | null | undefined) {
  if (isProfessionalPreviewMode()) return true;
  const state = readProfessionalEmploymentState(player);
  return Boolean(
    isEmployedProfessional(player) &&
      (state?.officeSlug === 'ramos-associados' || state?.officeName === 'Ramos & Associados'),
  );
}

export function isExternalLawFirmEmploymentActive(player: PlayerProfile | null | undefined) {
  if (!isEmployedProfessional(player)) return false;
  return !isRamosEmploymentActive(player);
}

export function isIndependentProfessional(player: PlayerProfile | null | undefined) {
  if (!player?.oabRegistration) return false;
  return Boolean(
    isProfessionalEmploymentActive(player) &&
      !isEmployedProfessional(player),
  );
}

export function employmentIncludesSocialJuridico(player: PlayerProfile | null | undefined) {
  const state = readProfessionalEmploymentState(player);
  if (!state) return false;
  const social = state.benefits?.socialJuridico;
  if (!social || typeof social !== 'object') return true;
  return (social as { included?: unknown }).included !== false;
}
