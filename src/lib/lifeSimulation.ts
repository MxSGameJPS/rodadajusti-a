import type {
  HomeFurnitureKind,
  PantryItem,
  PantryMealType,
  PlayerHouseholdState,
  PlayerLifeNeedsState,
  PlayerProfile,
} from '../types/game';
import type { WorldGeoPoint, WorldMapProfile } from './worldMap';
import { formatGameDate } from './gameDate';

export const DEFAULT_HOUSEHOLD_STATE: PlayerHouseholdState = {
  foodUnits: 6,
  pantry: [
    {
      id: 'starter-pantry',
      offerId: 'starter',
      establishmentId: 'starter',
      title: 'Alimentos básicos',
      imageUrl: null,
      quantity: 6,
      hungerRestore: 52,
      energyRestore: 4,
      mealType: 'ANY',
      requiresCooking: true,
      purchasedAtGameDate: 'Inicial',
    },
  ],
  residence: {
    street: '',
    number: '',
    city: '',
    state: '',
    latitude: null,
    longitude: null,
    mapPointMode: null,
    geocodedDisplayName: '',
    monthlyRent: 550,
    waterMonthly: 45,
    electricityMonthly: 80,
    internetMonthly: 65,
    gasMonthly: 30,
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
  lastFullSleepAtMinute: null,
  lastNapAtMinute: null,
  lastStudiedGameDate: null,
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function nullableCoordinate(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMealType(value: unknown): PantryMealType {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'BREAKFAST') return 'BREAKFAST';
  if (normalized === 'LUNCH_DINNER') return 'LUNCH_DINNER';
  if (normalized === 'SNACK') return 'SNACK';
  return 'ANY';
}

function normalizePantryItem(value: Partial<PantryItem>): PantryItem | null {
  if (!value || typeof value.title !== 'string') return null;
  const quantity = Math.max(0, Math.floor(Number(value.quantity) || 0));
  if (quantity <= 0) return null;

  return {
    id: String(value.id || `pantry-${Math.random().toString(36).slice(2, 9)}`),
    offerId: String(value.offerId || 'legacy'),
    establishmentId: String(value.establishmentId || 'legacy'),
    title: value.title.trim() || 'Alimento',
    imageUrl: value.imageUrl || null,
    quantity,
    hungerRestore: clamp(Number(value.hungerRestore ?? 52)),
    energyRestore: clamp(Number(value.energyRestore ?? 4)),
    mealType: normalizeMealType(value.mealType),
    requiresCooking: value.requiresCooking !== false,
    purchasedAtGameDate: String(value.purchasedAtGameDate || 'Save anterior'),
  };
}

function pantryUnits(pantry: PantryItem[]) {
  return pantry.reduce((sum, item) => sum + Math.max(0, Math.floor(item.quantity || 0)), 0);
}

export function gameAbsoluteMinute(player: Pick<PlayerProfile, 'gameCurrentDay' | 'gameCurrentMonth' | 'gameCurrentYear' | 'gameCurrentMinutes'>) {
  const base = Date.UTC(
    player.gameCurrentYear,
    Math.max(0, player.gameCurrentMonth - 1),
    Math.max(1, player.gameCurrentDay),
  ) / 60000;
  return base + Math.max(0, Number(player.gameCurrentMinutes) || 0);
}

export function normalizeHousehold(
  value?: Partial<PlayerHouseholdState> | null,
  fallbackCity = '',
  fallbackState = '',
): PlayerHouseholdState {
  const residence: Partial<PlayerHouseholdState['residence']> = value?.residence || {};
  const needs: Partial<PlayerLifeNeedsState> = value?.needs || {};
  const legacyFoodUnits = Math.max(
    0,
    Math.floor(Number(value?.foodUnits ?? DEFAULT_HOUSEHOLD_STATE.foodUnits) || 0),
  );
  const normalizedPantry = Array.isArray(value?.pantry)
    ? value!.pantry
        .map((item) => normalizePantryItem(item))
        .filter((item): item is PantryItem => Boolean(item))
        .slice(-100)
    : [];

  const pantry = normalizedPantry.length > 0
    ? normalizedPantry
    : legacyFoodUnits > 0
      ? [{
          ...DEFAULT_HOUSEHOLD_STATE.pantry[0],
          id: 'legacy-pantry',
          offerId: 'legacy',
          establishmentId: 'legacy',
          title: 'Alimentos da despensa',
          quantity: legacyFoodUnits,
          purchasedAtGameDate: 'Save anterior',
        }]
      : [];

  return {
    ...DEFAULT_HOUSEHOLD_STATE,
    ...(value || {}),
    pantry,
    foodUnits: pantryUnits(pantry),
    residence: {
      ...DEFAULT_HOUSEHOLD_STATE.residence,
      ...residence,
      city: String(residence.city || fallbackCity || '').trim(),
      state: String(residence.state || fallbackState || '').trim().toUpperCase(),
      latitude: nullableCoordinate(residence.latitude),
      longitude: nullableCoordinate(residence.longitude),
      mapPointMode: residence.mapPointMode === 'STREET_RANDOMIZED' ? 'STREET_RANDOMIZED' : null,
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
          .map((item) => ({
            ...item,
            comfortBonus: Math.max(0, Number(item.comfortBonus) || 0),
            energyBonus: Math.max(0, Number(item.energyBonus) || 0),
            studyBonus: Math.max(0, Number(item.studyBonus) || 0),
            hygieneBonus: Math.max(0, Number(item.hygieneBonus) || 0),
            mealBonus: Math.max(0, Number(item.mealBonus) || 0),
            foodStorageBonus: Math.max(0, Number(item.foodStorageBonus) || 0),
          }))
          .slice(-100)
      : [],
    vehicles: Array.isArray(value?.vehicles)
      ? value!.vehicles
          .filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string')
          .slice(-40)
      : [],
    lastSleptGameDate: typeof value?.lastSleptGameDate === 'string' ? value.lastSleptGameDate : null,
    lastFullSleepAtMinute: Number.isFinite(Number(value?.lastFullSleepAtMinute))
      ? Number(value!.lastFullSleepAtMinute)
      : null,
    lastNapAtMinute: Number.isFinite(Number(value?.lastNapAtMinute))
      ? Number(value!.lastNapAtMinute)
      : null,
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

function monthDistance(fromKey: string, toKey: string) {
  const [fromYear, fromMonth] = fromKey.split('-').map(Number);
  const [toYear, toMonth] = toKey.split('-').map(Number);
  if (![fromYear, fromMonth, toYear, toMonth].every(Number.isFinite)) return 0;
  return Math.max(0, (toYear - fromYear) * 12 + (toMonth - fromMonth));
}

export function getHouseholdBillSummary(player: PlayerProfile) {
  const monthly = getHouseholdMonthlyBills(player.household);
  const currentKey = currentHouseholdBillKey(player);
  const paidThrough = player.household.residence.billsPaidThroughKey;

  const dueMonths = paidThrough
    ? monthDistance(paidThrough, currentKey)
    : 1;

  return {
    currentKey,
    paidThrough,
    dueMonths,
    monthly,
    totalDue: monthly.total * dueMonths,
  };
}

export function isHouseholdBillPaid(player: PlayerProfile) {
  return getHouseholdBillSummary(player).dueMonths <= 0;
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

export function getHouseholdEquipmentBonuses(household: PlayerHouseholdState) {
  return household.furniture.reduce(
    (summary, item) => ({
      hygieneBonus: Math.max(summary.hygieneBonus, Number(item.hygieneBonus) || 0),
      mealBonus: Math.max(summary.mealBonus, Number(item.mealBonus) || 0),
      foodStorageBonus: summary.foodStorageBonus + Math.max(0, Number(item.foodStorageBonus) || 0),
    }),
    {
      hygieneBonus: 0,
      mealBonus: 0,
      foodStorageBonus: 0,
    },
  );
}

export function getPantryCapacity(household: PlayerHouseholdState) {
  const equipment = getHouseholdEquipmentBonuses(household);
  return Math.max(12, Math.min(80, 12 + Math.round(equipment.foodStorageBonus)));
}

export function getHouseholdServiceStatus(player: PlayerProfile) {
  const summary = getHouseholdBillSummary(player);
  const suspended = summary.dueMonths >= 2;

  return {
    dueMonths: summary.dueMonths,
    water: !suspended,
    electricity: !suspended,
    internet: !suspended,
    gas: !suspended,
    suspended,
    warning: summary.dueMonths === 1
      ? 'Contas da competência atual ainda estão pendentes.'
      : suspended
        ? 'Serviços domésticos suspensos até a regularização das contas.'
        : '',
  };
}

export function getSleepPlan(player: PlayerProfile) {
  const now = gameAbsoluteMinute(player);
  const minutes = Math.max(0, Number(player.gameCurrentMinutes) || 0);
  const hour = Math.floor(minutes / 60) % 24;
  const isNight = hour >= 20 || hour < 6;
  const lastFull = player.household.lastFullSleepAtMinute;
  const lastNap = player.household.lastNapAtMinute;

  if (isNight) {
    if (lastFull != null && now - lastFull < 12 * 60) {
      return {
        kind: 'BLOCKED' as const,
        minutes: 0,
        label: 'Sono completo indisponível',
        detail: 'Você já teve um sono completo há pouco tempo.',
      };
    }
    return {
      kind: 'SLEEP' as const,
      minutes: 8 * 60,
      label: 'Dormir 8 horas',
      detail: 'Sono completo noturno. Cama melhor aumenta a recuperação.',
    };
  }

  if (lastNap != null && now - lastNap < 6 * 60) {
    return {
      kind: 'BLOCKED' as const,
      minutes: 0,
      label: 'Cochilo indisponível',
      detail: 'Você já cochilou há pouco tempo. Espere algumas horas.',
    };
  }

  return {
    kind: 'NAP' as const,
    minutes: 90,
    label: 'Cochilar 1h30',
    detail: 'Durante o dia, um cochilo recupera parte da energia.',
  };
}

export function restoreAfterSleep(
  household: PlayerHouseholdState,
  gameDateLabel: string,
  absoluteMinute: number,
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
    lastFullSleepAtMinute: absoluteMinute,
  };
}

export function restoreAfterNap(
  household: PlayerHouseholdState,
  absoluteMinute: number,
): PlayerHouseholdState {
  const bed = getBestBedBonuses(household);
  return {
    ...household,
    needs: {
      ...household.needs,
      energy: clamp(household.needs.energy + 28 + bed.energyBonus * 0.35 + bed.comfortBonus * 0.12),
    },
    lastNapAtMinute: absoluteMinute,
  };
}

export function restoreAfterShower(household: PlayerHouseholdState) {
  const equipment = getHouseholdEquipmentBonuses(household);
  return {
    ...household,
    needs: {
      ...household.needs,
      hygiene: clamp(household.needs.hygiene + 72 + equipment.hygieneBonus),
      energy: clamp(household.needs.energy + 4),
    },
  };
}

export function restoreAfterMeal(
  household: PlayerHouseholdState,
  pantryItemId: string,
) {
  const selected = household.pantry.find((item) => item.id === pantryItemId)
    || household.pantry.find((item) => item.quantity > 0);

  if (!selected || selected.quantity <= 0) return household;

  const equipment = getHouseholdEquipmentBonuses(household);
  const pantry = household.pantry
    .map((item) => item.id === selected.id
      ? { ...item, quantity: Math.max(0, item.quantity - 1) }
      : item)
    .filter((item) => item.quantity > 0);

  return {
    ...household,
    pantry,
    foodUnits: pantryUnits(pantry),
    needs: {
      ...household.needs,
      hunger: clamp(household.needs.hunger + selected.hungerRestore + equipment.mealBonus),
      energy: clamp(household.needs.energy + selected.energyRestore),
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
