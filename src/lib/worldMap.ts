import { getProfessionalOwnerKey } from './professionalRpg';
import type { LocationScene, PlayerProfile } from '../types/game';

export interface WorldGeoPoint {
  lng: number;
  lat: number;
}

export interface WorldMapProfile {
  version: 1;
  city: string;
  state: string;
  country: 'Brasil';
  displayName: string;
  center: WorldGeoPoint;
  source: 'PLAYER_PROFILE' | 'USER_SETUP';
  updatedAt: string;
}

export interface WorldRoute {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  source: 'OSRM' | 'FALLBACK';
}

const PROFILE_PREFIX = 'rota_world_map_v1:';
const GEOCODE_PREFIX = 'rota_world_geocode_v1:';
const ROUTE_PREFIX = 'rota_world_route_v1:';
const PLAYER_SAVE_KEY = 'rota_da_justica_save_v1';

export const WORLD_MAP_UPDATED_EVENT = 'rota:world-map-updated';

const NOMINATIM_BASE_URL = ((import.meta as any).env?.VITE_NOMINATIM_BASE_URL as string | undefined)
  || 'https://nominatim.openstreetmap.org';
const OSRM_BASE_URL = ((import.meta as any).env?.VITE_OSRM_BASE_URL as string | undefined)
  || 'https://router.project-osrm.org';

let lastNominatimRequestAt = 0;

function hasWindow() {
  return typeof window !== 'undefined';
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function profileKey(player: Pick<PlayerProfile, 'cloudCareerId' | 'name' | 'oabRegistration'>) {
  return `${PROFILE_PREFIX}${getProfessionalOwnerKey(player)}`;
}

function isPoint(value: unknown): value is WorldGeoPoint {
  if (!value || typeof value !== 'object') return false;
  const point = value as Partial<WorldGeoPoint>;
  return Number.isFinite(point.lng) && Number.isFinite(point.lat);
}

export function readWorldMapProfile(
  player: Pick<PlayerProfile, 'cloudCareerId' | 'name' | 'oabRegistration'>,
): WorldMapProfile | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(profileKey(player));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorldMapProfile>;
    if (!parsed.city || !parsed.state || !isPoint(parsed.center)) return null;
    return {
      version: 1,
      city: String(parsed.city).trim(),
      state: String(parsed.state).trim().toUpperCase(),
      country: 'Brasil',
      displayName: String(parsed.displayName || `${parsed.city} - ${parsed.state}`).trim(),
      center: parsed.center,
      source: parsed.source === 'PLAYER_PROFILE' ? 'PLAYER_PROFILE' : 'USER_SETUP',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveWorldMapProfile(
  player: Pick<PlayerProfile, 'cloudCareerId' | 'name' | 'oabRegistration'>,
  profile: WorldMapProfile,
) {
  if (!hasWindow()) return profile;
  try {
    window.localStorage.setItem(profileKey(player), JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent(WORLD_MAP_UPDATED_EVENT, { detail: profile }));
  } catch {
    // O mapa continua funcional durante a sessão mesmo sem persistência local.
  }
  return profile;
}

export function getDeclaredPlayerCity(player: PlayerProfile) {
  const flexible = player as PlayerProfile & {
    homeCity?: string;
    homeState?: string;
    city?: string;
    state?: string;
    cidade?: string;
    estado?: string;
    personalProfile?: { city?: string; state?: string; cidade?: string; estado?: string };
  };

  const city = flexible.homeCity
    || flexible.city
    || flexible.cidade
    || flexible.personalProfile?.city
    || flexible.personalProfile?.cidade
    || '';
  const state = flexible.homeState
    || flexible.state
    || flexible.estado
    || flexible.personalProfile?.state
    || flexible.personalProfile?.estado
    || '';

  return {
    city: String(city).trim(),
    state: String(state).trim(),
  };
}

function geocodeCacheKey(city: string, state: string) {
  return `${GEOCODE_PREFIX}${normalize(city)}:${normalize(state)}`;
}

async function waitForNominatimSlot() {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastNominatimRequestAt));
  if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
  lastNominatimRequestAt = Date.now();
}

export async function geocodeBrazilianCity(city: string, state: string): Promise<WorldMapProfile> {
  const cleanCity = city.trim();
  const cleanState = state.trim();
  if (!cleanCity || !cleanState) throw new Error('Informe cidade e estado para ativar o mapa real.');

  const cacheKey = geocodeCacheKey(cleanCity, cleanState);
  if (hasWindow()) {
    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as WorldMapProfile;
        if (isPoint(parsed.center)) return parsed;
      }
    } catch {
      // Segue para uma consulta única quando o cache estiver inválido.
    }
  }

  await waitForNominatimSlot();
  const query = new URLSearchParams({
    q: `${cleanCity}, ${cleanState}, Brasil`,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'br',
    addressdetails: '1',
    'accept-language': 'pt-BR',
  });

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${query.toString()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Não foi possível localizar a cidade agora.');
    const results = await response.json() as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const first = results[0];
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Não encontramos “${cleanCity} - ${cleanState}” no mapa.`);
    }

    const profile: WorldMapProfile = {
      version: 1,
      city: cleanCity,
      state: cleanState.toUpperCase(),
      country: 'Brasil',
      displayName: first.display_name || `${cleanCity} - ${cleanState}`,
      center: { lng, lat },
      source: 'USER_SETUP',
      updatedAt: new Date().toISOString(),
    };

    if (hasWindow()) {
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify(profile));
      } catch {
        // Cache é uma otimização, não requisito funcional.
      }
    }
    return profile;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function resolveWorldMapProfile(player: PlayerProfile): Promise<WorldMapProfile | null> {
  const stored = readWorldMapProfile(player);
  if (stored) return stored;

  const declared = getDeclaredPlayerCity(player);
  if (!declared.city || !declared.state) return null;

  try {
    const profile = await geocodeBrazilianCity(declared.city, declared.state);
    return saveWorldMapProfile(player, { ...profile, source: 'PLAYER_PROFILE' });
  } catch {
    return null;
  }
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pointAtDistance(center: WorldGeoPoint, distanceKm: number, angleRadians: number): WorldGeoPoint {
  const latDelta = (distanceKm / 111.32) * Math.sin(angleRadians);
  const lngKm = Math.max(20, 111.32 * Math.cos((center.lat * Math.PI) / 180));
  const lngDelta = (distanceKm / lngKm) * Math.cos(angleRadians);
  return { lat: center.lat + latDelta, lng: center.lng + lngDelta };
}

export function getRamosOfficePoint(profile: WorldMapProfile): WorldGeoPoint {
  const seed = hashString(`${normalize(profile.city)}:${normalize(profile.state)}:ramos`);
  const angle = ((seed % 360) * Math.PI) / 180;
  return pointAtDistance(profile.center, 0.22 + (seed % 18) / 100, angle);
}

function locationRadiusKm(location: LocationScene, seed: number) {
  const jitter = (seed % 100) / 100;
  switch (location.category) {
    case 'tribunal':
    case 'cartorio':
    case 'banco':
      return 0.7 + jitter * 1.5;
    case 'delegacia':
    case 'empresa':
      return 1.1 + jitter * 2.2;
    case 'residencia':
      return 2 + jitter * 3.4;
    case 'escritorio':
      return 0.25;
    default:
      return 1.2 + jitter * 2.8;
  }
}

export function getWorldPointForLocation(
  profile: WorldMapProfile,
  caseId: string,
  location: LocationScene,
): WorldGeoPoint {
  if (location.category === 'escritorio' || /ESCRITORIO_RAMOS/i.test(location.id)) {
    return getRamosOfficePoint(profile);
  }

  const seed = hashString(`${normalize(profile.city)}:${caseId}:${location.id}`);
  const angle = (((seed % 3600) / 10) * Math.PI) / 180;
  return pointAtDistance(profile.center, locationRadiusKm(location, seed), angle);
}

export function getLocalizedLocationLabel(location: LocationScene, profile: WorldMapProfile) {
  if (location.category === 'escritorio' || /ESCRITORIO_RAMOS/i.test(location.id)) {
    return `Região central de ${profile.city} • ${profile.state}`;
  }

  const categoryLabel: Record<LocationScene['category'], string> = {
    cartorio: 'região de cartórios',
    tribunal: 'região judiciária',
    delegacia: 'região policial',
    residencia: 'bairro residencial',
    empresa: 'região comercial',
    banco: 'região bancária',
    escritorio: 'região central',
  };
  return `${categoryLabel[location.category]} • ${profile.city}/${profile.state}`;
}

function haversineMeters(origin: WorldGeoPoint, destination: WorldGeoPoint) {
  const radius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function routeCacheKey(origin: WorldGeoPoint, destination: WorldGeoPoint) {
  const format = (value: number) => value.toFixed(5);
  return `${ROUTE_PREFIX}${format(origin.lng)},${format(origin.lat)}:${format(destination.lng)},${format(destination.lat)}`;
}

function fallbackRoute(origin: WorldGeoPoint, destination: WorldGeoPoint): WorldRoute {
  const distanceMeters = haversineMeters(origin, destination) * 1.28;
  return {
    coordinates: [[origin.lng, origin.lat], [destination.lng, destination.lat]],
    distanceMeters,
    durationSeconds: Math.max(180, (distanceMeters / 1000 / 28) * 3600),
    source: 'FALLBACK',
  };
}

export async function fetchRoadRoute(origin: WorldGeoPoint, destination: WorldGeoPoint): Promise<WorldRoute> {
  const cacheKey = routeCacheKey(origin, destination);
  if (hasWindow()) {
    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as WorldRoute;
        if (Array.isArray(parsed.coordinates) && parsed.coordinates.length >= 2) return parsed;
      }
    } catch {
      // Segue para a consulta de rota.
    }
  }

  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
    alternatives: 'false',
  });
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${OSRM_BASE_URL}/route/v1/driving/${coordinates}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return fallbackRoute(origin, destination);
    const payload = await response.json() as {
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: [number, number][] };
      }>;
    };
    const route = payload.routes?.[0];
    const routeCoordinates = route?.geometry?.coordinates;
    if (!route || !Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
      return fallbackRoute(origin, destination);
    }

    const result: WorldRoute = {
      coordinates: routeCoordinates,
      distanceMeters: Math.max(0, Number(route.distance) || 0),
      durationSeconds: Math.max(0, Number(route.duration) || 0),
      source: 'OSRM',
    };
    if (hasWindow()) {
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch {
        // Rota continua utilizável sem cache.
      }
    }
    return result;
  } catch {
    return fallbackRoute(origin, destination);
  } finally {
    window.clearTimeout(timeout);
  }
}

export function formatRouteDistance(distanceMeters: number) {
  if (distanceMeters < 1000) return `${Math.max(1, Math.round(distanceMeters))} m`;
  return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 0 : 1).replace('.', ',')} km`;
}

export function formatRouteDuration(durationSeconds: number) {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

export function readSavedPlayerForWorldMap(): PlayerProfile | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(PLAYER_SAVE_KEY);
    return raw ? JSON.parse(raw) as PlayerProfile : null;
  } catch {
    return null;
  }
}
