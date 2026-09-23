import type {
  HomeFurnitureKind,
  PlayerHouseholdState,
  PlayerLifeNeedsState,
  PlayerProfile,
} from '../types/game';
import type { WorldGeoPoint, WorldMapProfile } from './worldMap';
import { formatGameDate } from './gameDate';

export const DEFAULT_HOUSEHOLD_STATE: PlayerHouseholdState = {
  foodUnits: 6,
  residence: {
    street: '',
    number: '',
    city: '',
    state: '',
    latitude: null,
    longitude: null,
    geocodedDisplayName: '',
    monthlyRent: 850,
    waterMonthly: 75,
    electricityMonthly: 135,
    internetMonthly: 100,
    gasMonthly: 55,
    billsPaidThroughKey: null,
  },
  needs: {
    energy: 88,
    hunger: 78,
    hygiene: 82,
    study: 72,
  },
  furniture: [],
  vehicles: [],
  lastSleptGameDate: null,
  lastStudiedGameDate: null,
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

export function normalizeHousehold(
  value?: Partial<PlayerHouseholdState> | null,
  fallbackCity = '',
  fallbackState = '',
): PlayerHouseholdState {
  const residence = value?.residence || {};
  const needs = value?.needs || {};

  return {
    ...DEFAULT_HOUSEHOLD_STATE,
    ...(value || {}),
    foodUnits: Math.max(0, Math.floor(Number(value?.foodUnits ?? DEFAULT_HOUSEHOLD_STATE.foodUnits) || 0)),
    residence: {
      ...DEFAULT_HOUSEHOLD_STATE.residence,
      ...residence,
      city: String(residence.city || fallbackCity || '').trim(),
      state: String(residence.state || fallbackState || '').trim().toUpperCase(),
      latitude: Number.isFinite(Number(residence.latitude)) ? Number(residence.latitude) : null,
      longitude: Number.isFinite(Number(residence.longitude)) ? Number(residence.longitude) : null,
      monthlyRent: Math.max(0, Number(residence.monthlyRent ?? DEFAULT_HOUSEHOLD_STATE.residence.monthlyRent) || 0),
      waterMonthly: Math.max(0, Number(residence.waterMonthly ?? DEFAULT_HOUSEHOLD_STATE.residence.waterMonthly) || 0),
      electricityMonthly: Math.max(0, Number(residence.electricityMonthly ?? DEFAULT_HOUSEHOLD_STATE.residence.electricityMonthly) || 0),
      internetMonthly: Math.max(0, Number(residence.internetMonthly ?? DEFAULT_HOUSEHOLD_STATE.residence.internetMonthly) || 0),
      gasMonthly: Math.max(0, Number(residence.gasMonthly ?? DEFAULT_HOUSEHOLD_STATE.residence.gasMonthly) || 0),
      billsPaidThroughKey: typeof residence.billsPaidThroughKey === 'string'
        ? residence.billsPaidThroughKey
        : null,
    },
    needs: {
      energy: clamp(Number(needs.energy ?? DEFAULT_HOUSEHOLD_STATE.needs.energy)),
      hunger: clamp(Number(needs.hunger ?? DEFAULT_HOUSEHOLD_STATE.needs.hunger)),
      hygiene: clamp(Number(needs.hygiene ?? DEFAULT_HOUSEHOLD_STATE.needs.hygiene)),
      study: clamp(Number(needs.study ?? DEFAULT_HOUSEHOLD_STATE.needs.study)),
    },
    furniture: Array.isArray(value?.furniture)
      ? value!.furniture
          .filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string')
          .slice(-100)
      : [],
    vehicles: Array.isArray(value?.vehicles)
      ? value!.vehicles
          .filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string')
          .slice(-40)
      : [],
    lastSleptGameDate: typeof value?.lastSleptGameDate === 'string' ? value.lastSleptGameDate : null,
    lastStudiedGameDate: typeof value?.lastStudiedGameDate === 'string' ? value.lastStudiedGameDate : null,
  };
}

export function decayLifeNeeds(needs: PlayerLifeNeedsState, minutesPassed: number): PlayerLifeNeedsState {
  const hours = Math.max(0, Number(minutesPassed) || 0) / 60;
  return {
    energy: clamp(needs.energy - hours * 3.7),
    hunger: clamp(needs.hunger - hours * 4.4),
    hygiene: clamp(needs.hygiene - hours * 1.65),
    study: clamp(needs.study - hours * 0.7),
  };
}

export function applyLifeTimePassage(
  household: PlayerHouseholdState,
  minutesPassed: number,
): PlayerHouseholdState {
  return {
    ...household,
    needs: decayLifeNeeds(household.needs, minutesPassed),
  };
}

export function currentHouseholdBillKey(player: PlayerProfile) {
  return String(player.gameCurrentYear) + '-' + String(player.gameCurrentMonth).padStart(2, '0');
}

export function getHouseholdMonthlyBills(household: PlayerHouseholdState) {
  const residence = household.residence;
  return {
    rent: residence.monthlyRent,
    water: residence.waterMonthly,
    electricity: residence.electricityMonthly,
    internet: residence.internetMonthly,
    gas: residence.gasMonthly,
    total:
      residence.monthlyRent
      + residence.waterMonthly
      + residence.electricityMonthly
      + residence.internetMonthly
      + residence.gasMonthly,
  };
}

export function isHouseholdBillPaid(player: PlayerProfile) {
  return player.household.residence.billsPaidThroughKey === currentHouseholdBillKey(player);
}

export function getBestBedBonuses(household: PlayerHouseholdState) {
  const beds = household.furniture.filter((item) => item.kind === 'BED');
  return beds.reduce(
    (best, item) => ({
      energyBonus: Math.max(best.energyBonus, Number(item.energyBonus) || 0),
      comfortBonus: Math.max(best.comfortBonus, Number(item.comfortBonus) || 0),
    }),
    { energyBonus: 0, comfortBonus: 0 },
  );
}

export function getBestStudyBonus(household: PlayerHouseholdState) {
  return household.furniture.reduce(
    (best, item) => Math.max(best, Number(item.studyBonus) || 0),
    0,
  );
}

export function restoreAfterSleep(
  household: PlayerHouseholdState,
  gameDateLabel: string,
): PlayerHouseholdState {
  const bed = getBestBedBonuses(household);
  return {
    ...household,
    needs: {
      ...household.needs,
      energy: clamp(82 + bed.energyBonus + bed.comfortBonus * 0.25),
      hygiene: clamp(household.needs.hygiene - 5),
    },
    lastSleptGameDate: gameDateLabel,
  };
}

export function restoreAfterShower(household: PlayerHouseholdState) {
  return {
    ...household,
    needs: {
      ...household.needs,
      hygiene: clamp(household.needs.hygiene + 72),
      energy: clamp(household.needs.energy + 4),
    },
  };
}

export function restoreAfterMeal(household: PlayerHouseholdState) {
  return {
    ...household,
    foodUnits: Math.max(0, household.foodUnits - 1),
    needs: {
      ...household.needs,
      hunger: clamp(household.needs.hunger + 58),
      energy: clamp(household.needs.energy + 5),
    },
  };
}

export function restoreAfterStudy(
  household: PlayerHouseholdState,
  gameDateLabel: string,
) {
  const studyBonus = getBestStudyBonus(household);
  return {
    ...household,
    needs: {
      ...household.needs,
      study: clamp(household.needs.study + 48 + studyBonus),
      energy: clamp(household.needs.energy - 7),
      hunger: clamp(household.needs.hunger - 5),
    },
    lastStudiedGameDate: gameDateLabel,
  };
}

export function lifeNeedLabel(value: number) {
  if (value <= 10) return 'Crítico';
  if (value <= 30) return 'Baixo';
  if (value <= 60) return 'Atenção';
  if (value <= 80) return 'Bom';
  return 'Ótimo';
}

export function getLifeBlockingReason(player: PlayerProfile) {
  const needs = player.household.needs;
  if (needs.energy <= 7) return 'Você está exausto. Durma antes de continuar atividades profissionais.';
  if (needs.hunger <= 5) return 'Você está com muita fome. Faça uma refeição antes de continuar.';
  if (needs.hygiene <= 5) return 'Sua higiene está crítica. Tome banho antes de continuar a rotina profissional.';
  return '';
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

export function getHomePoint(player: PlayerProfile, profile: WorldMapProfile): WorldGeoPoint {
  const { latitude, longitude } = player.household.residence;
  if (latitude != null && longitude != null) return { lat: latitude, lng: longitude };

  const seed = hashString(profile.city + ':' + profile.state + ':home:' + (player.name || 'player'));
  const angle = (((seed % 3600) / 10) * Math.PI) / 180;
  return pointAtDistance(profile.center, 1.4 + ((seed >>> 6) % 180) / 100, angle);
}

export function getUniversityPoint(player: PlayerProfile, profile: WorldMapProfile): WorldGeoPoint {
  const seed = hashString(profile.city + ':' + profile.state + ':university:' + (player.name || 'player'));
  const angle = (((seed % 3600) / 10) * Math.PI) / 180;
  return pointAtDistance(profile.center, 0.9 + ((seed >>> 8) % 160) / 100, angle);
}

export function getUniversityName(profile: WorldMapProfile) {
  return 'Faculdade de Direito de ' + profile.city;
}

export function currentGameDateLabel(player: PlayerProfile) {
  return formatGameDate({
    day: player.gameCurrentDay,
    month: player.gameCurrentMonth,
    year: player.gameCurrentYear,
  });
}

export function furnitureKindFromGameplay(value: unknown): HomeFurnitureKind {
  const normalized = String(value || '').toUpperCase();
  if (['BED', 'SOFA', 'DESK', 'CHAIR', 'APPLIANCE'].includes(normalized)) {
    return normalized as HomeFurnitureKind;
  }
  return 'OTHER';
}
