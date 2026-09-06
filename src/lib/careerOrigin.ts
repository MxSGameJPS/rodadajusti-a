export interface CareerOrigin {
  version: 1;
  city: string;
  state: string;
  country: 'Brasil';
  confirmedAt: string;
}

const CAREER_ORIGIN_KEY = 'rota_career_origin_v1';
const PLAYER_SAVE_KEY = 'rota_da_justica_save_v1';

export const CAREER_ORIGIN_UPDATED_EVENT = 'rota:career-origin-updated';

function hasWindow() {
  return typeof window !== 'undefined';
}

export function normalizeCareerOrigin(city: string, state: string): CareerOrigin {
  return {
    version: 1,
    city: city.trim(),
    state: state.trim().toUpperCase(),
    country: 'Brasil',
    confirmedAt: new Date().toISOString(),
  };
}

export function readCareerOrigin(): CareerOrigin | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(CAREER_ORIGIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CareerOrigin>;
    if (!parsed.city || !parsed.state) return null;
    return normalizeCareerOrigin(String(parsed.city), String(parsed.state));
  } catch {
    return null;
  }
}

export function readCareerOriginFromPlayerSave(): CareerOrigin | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(PLAYER_SAVE_KEY);
    if (!raw) return null;
    const player = JSON.parse(raw) as {
      homeCity?: string;
      homeState?: string;
      city?: string;
      state?: string;
      cidade?: string;
      estado?: string;
      personalProfile?: { city?: string; state?: string; cidade?: string; estado?: string };
    };
    const city = player.homeCity || player.city || player.cidade || player.personalProfile?.city || player.personalProfile?.cidade || '';
    const state = player.homeState || player.state || player.estado || player.personalProfile?.state || player.personalProfile?.estado || '';
    if (!String(city).trim() || !String(state).trim()) return null;
    return normalizeCareerOrigin(String(city), String(state));
  } catch {
    return null;
  }
}

export function saveCareerOrigin(origin: CareerOrigin) {
  if (!hasWindow()) return origin;
  const normalized = normalizeCareerOrigin(origin.city, origin.state);
  try {
    window.localStorage.setItem(CAREER_ORIGIN_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(CAREER_ORIGIN_UPDATED_EVENT, { detail: normalized }));
  } catch {
    // A sessão continua utilizável mesmo se o navegador bloquear persistência local.
  }
  return normalized;
}

export function patchCareerOriginIntoExistingPlayerSave(origin: CareerOrigin) {
  if (!hasWindow()) return;
  try {
    const raw = window.localStorage.getItem(PLAYER_SAVE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    window.localStorage.setItem(
      PLAYER_SAVE_KEY,
      JSON.stringify({
        ...parsed,
        homeCity: origin.city,
        homeState: origin.state,
      }),
    );
  } catch {
    // O local da carreira continua disponível pela persistência própria do módulo.
  }
}
