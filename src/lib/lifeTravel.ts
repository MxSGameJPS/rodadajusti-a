import type {
  PersonalExpenseCategory,
  PlayerProfile,
  PlayerWorldLocationKind,
} from '../types/game';
import { GAME_CASES } from '../data/cases';
import {
  fetchRoadRoute,
  getRamosOfficePoint,
  getWorldPointForLocation,
  resolveStableRoadPoint,
  resolveWorldMapProfile,
  type WorldGeoPoint,
  type WorldMapProfile,
  type WorldRoute,
} from './worldMap';
import {
  getHomePoint,
  getUniversityName,
  getUniversityPoint,
} from './lifeSimulation';

export type LifeTravelPlaceId = 'OFFICE' | 'HOME' | 'UNIVERSITY';
export type LifeTravelOriginId = LifeTravelPlaceId | 'CURRENT';

export interface LifeTravelPlace {
  id: LifeTravelPlaceId;
  label: string;
  subtitle: string;
}

export interface LifeTravelResult {
  route: WorldRoute;
  profile: WorldMapProfile;
  origin: LifeTravelPlace;
  destination: LifeTravelPlace;
  travelMinutes: number;
  distanceKm: number;
  transport: 'CAR' | 'BUS';
  cost: number;
  expenseCategory: PersonalExpenseCategory;
}

export interface LifeTravelRequest {
  origin: LifeTravelOriginId;
  destination: LifeTravelPlaceId;
  reason:
    | 'GO_HOME'
    | 'GO_OFFICE'
    | 'GO_UNIVERSITY'
    | 'RETURN_HOME_AFTER_STUDY';
}

export function lifeTravelPlace(
  player: PlayerProfile,
  profile: WorldMapProfile | null,
  id: LifeTravelPlaceId,
): LifeTravelPlace {
  if (id === 'HOME') {
    return {
      id,
      label: 'Sua casa',
      subtitle: player.household.residence.street
        ? player.household.residence.street + ' • ' + (player.homeCity || profile?.city || '')
        : 'Residência do personagem',
    };
  }

  if (id === 'UNIVERSITY') {
    return {
      id,
      label: profile ? getUniversityName(profile) : 'Faculdade de Direito',
      subtitle: profile ? profile.city + '/' + profile.state : 'Vida acadêmica',
    };
  }

  return {
    id,
    label: 'Ramos & Associados',
    subtitle: profile ? profile.city + '/' + profile.state : 'Escritório atual',
  };
}

export function lifePlaceFromWorldLocation(
  kind: PlayerWorldLocationKind | undefined,
): LifeTravelPlaceId {
  if (kind === 'HOME') return 'HOME';
  if (kind === 'UNIVERSITY') return 'UNIVERSITY';
  return 'OFFICE';
}

function currentPlaceLabel(player: PlayerProfile, profile: WorldMapProfile) {
  if (player.worldLocation.kind === 'HOME') return lifeTravelPlace(player, profile, 'HOME');
  if (player.worldLocation.kind === 'UNIVERSITY') return lifeTravelPlace(player, profile, 'UNIVERSITY');
  if (player.worldLocation.kind === 'CASE_LOCATION') {
    const caseItem = player.activeCase
      ? GAME_CASES.find((item) => item.id === player.activeCase?.caseId)
      : null;
    const locationId = player.worldLocation.refId || player.activeCase?.currentLocationId;
    const location = caseItem?.locations.find((item) => item.id === locationId);
    if (location) {
      return {
        id: 'OFFICE' as const,
        label: location.name,
        subtitle: profile.city + '/' + profile.state,
      };
    }
  }
  return lifeTravelPlace(player, profile, 'OFFICE');
}

async function resolvePlacePoint(
  player: PlayerProfile,
  profile: WorldMapProfile,
  place: LifeTravelOriginId,
): Promise<WorldGeoPoint> {
  if (place === 'CURRENT') {
    if (player.worldLocation.kind === 'HOME') return getHomePoint(player, profile);
    if (player.worldLocation.kind === 'UNIVERSITY') {
      return resolvePlacePoint(player, profile, 'UNIVERSITY');
    }
    if (player.worldLocation.kind === 'CASE_LOCATION' && player.activeCase) {
      const caseItem = GAME_CASES.find((item) => item.id === player.activeCase?.caseId);
      const locationId = player.worldLocation.refId || player.activeCase.currentLocationId;
      const location = caseItem?.locations.find((item) => item.id === locationId);
      if (caseItem && location) {
        return resolveStableRoadPoint(
          [profile.city, profile.state, 'case', caseItem.id, location.id].join(':'),
          getWorldPointForLocation(profile, caseItem.id, location),
          profile.center,
        );
      }
    }
    return resolvePlacePoint(player, profile, 'OFFICE');
  }
  if (place === 'HOME') {
    return getHomePoint(player, profile);
  }

  if (place === 'UNIVERSITY') {
    return resolveStableRoadPoint(
      [profile.city, profile.state, 'university'].join(':'),
      getUniversityPoint(player, profile),
      profile.center,
    );
  }

  return resolveStableRoadPoint(
    [profile.city, profile.state, 'office:ramos'].join(':'),
    getRamosOfficePoint(profile),
    profile.center,
  );
}

function roundMoney(value: number) {
  return Math.round(Math.max(0, value) * 100) / 100;
}

function roundTravelMinutes(seconds: number) {
  const rawMinutes = Math.max(0, Number(seconds) || 0) / 60;
  return Math.max(8, Math.ceil(rawMinutes / 5) * 5);
}

export async function buildLifeTravelResult(
  player: PlayerProfile,
  originId: LifeTravelOriginId,
  destinationId: LifeTravelPlaceId,
): Promise<LifeTravelResult> {
  const profile = await resolveWorldMapProfile(player);
  if (!profile) throw new Error('A cidade-base do personagem ainda não foi localizada.');

  const [originPoint, destinationPoint] = await Promise.all([
    resolvePlacePoint(player, profile, originId),
    resolvePlacePoint(player, profile, destinationId),
  ]);

  const route = await fetchRoadRoute(originPoint, destinationPoint);
  const distanceKm = Math.max(0, route.distanceMeters / 1000);
  const ownsVehicle = player.household.vehicles.length > 0;
  const transport: LifeTravelResult['transport'] = ownsVehicle ? 'CAR' : 'BUS';

  // V1: veículo próprio consome combustível proporcional à distância.
  // Sem veículo, o personagem usa transporte coletivo com tarifa-base.
  const cost = ownsVehicle
    ? roundMoney(Math.max(1.5, distanceKm * 0.78))
    : 6;

  return {
    route,
    profile,
    origin: originId === 'CURRENT'
      ? currentPlaceLabel(player, profile)
      : lifeTravelPlace(player, profile, originId),
    destination: lifeTravelPlace(player, profile, destinationId),
    travelMinutes: roundTravelMinutes(route.durationSeconds),
    distanceKm,
    transport,
    cost,
    expenseCategory: ownsVehicle ? 'COMBUSTIVEL' : 'ONIBUS',
  };
}

export function worldLocationForLifePlace(
  place: LifeTravelPlaceId,
  label: string,
) {
  return {
    kind: place,
    refId: null,
    label,
  } as const;
}
