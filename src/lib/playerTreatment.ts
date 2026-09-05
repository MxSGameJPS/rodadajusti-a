import { useEffect, useMemo, useState } from 'react';
import type { PlayerProfile } from '../types/game';
import { getProfessionalOwnerKey } from './professionalRpg';

export type PlayerGender = 'MASCULINO' | 'FEMININO';

export const PLAYER_TREATMENT_UPDATED_EVENT = 'rota:player-treatment-updated';

const TREATMENT_STORAGE_PREFIX = 'rota_player_treatment_v1:';

function treatmentStorageKey(player: PlayerProfile) {
  return `${TREATMENT_STORAGE_PREFIX}${getProfessionalOwnerKey(player)}`;
}

export function stripProfessionalHonorific(name: string) {
  return name.trim().replace(/^(?:dr\.?|dra\.?)\s+/i, '').trim();
}

export function readPlayerGender(player: PlayerProfile | null | undefined): PlayerGender | null {
  if (!player || typeof window === 'undefined') return null;

  try {
    const value = window.localStorage.getItem(treatmentStorageKey(player));
    return value === 'MASCULINO' || value === 'FEMININO' ? value : null;
  } catch {
    return null;
  }
}

export function savePlayerGender(player: PlayerProfile, gender: PlayerGender) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(treatmentStorageKey(player), gender);
  } catch {
    // O tratamento continua válido durante a sessão mesmo se o armazenamento falhar.
  }

  window.dispatchEvent(
    new CustomEvent(PLAYER_TREATMENT_UPDATED_EVENT, {
      detail: {
        ownerKey: getProfessionalOwnerKey(player),
        gender,
      },
    }),
  );
}

export function getPlayerDisplayName(
  player: PlayerProfile | null | undefined,
  fallback = 'Jogador',
) {
  const baseName = stripProfessionalHonorific(player?.name || '') || fallback;
  if (!player?.oabRegistration) return baseName;

  const gender = readPlayerGender(player);
  if (gender === 'FEMININO') return `Dra. ${baseName}`;
  if (gender === 'MASCULINO') return `Dr. ${baseName}`;

  return baseName;
}

export function usePlayerDisplayName(
  player: PlayerProfile | null | undefined,
  fallback = 'Jogador',
) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const refresh = () => setRevision((current) => current + 1);
    window.addEventListener(PLAYER_TREATMENT_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener(PLAYER_TREATMENT_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [player?.cloudCareerId, player?.name, player?.oabRegistration?.code]);

  return useMemo(
    () => getPlayerDisplayName(player, fallback),
    [fallback, player, revision],
  );
}
