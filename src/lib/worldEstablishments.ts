import type { WorldGeoPoint, WorldMapProfile } from './worldMap';
import { supabase } from './supabase';

export type EstablishmentPresenceScope = 'CITY' | 'UNIVERSAL';
export type EstablishmentGameUseType = 'MAP_ONLY' | 'SERVICE_PROVIDER' | 'VISITABLE' | 'MIXED';

export interface WorldEstablishmentOffer {
  id: string;
  title: string;
  offerType: string;
  description: string;
  price: number | null;
  periodType: string;
  imageUrl: string | null;
}

export interface WorldEstablishment {
  id: string;
  slug: string;
  name: string;
  businessType: string;
  subcategory: string | null;
  description: string;
  slogan: string | null;
  district: string | null;
  streetName: string | null;
  numberReference: string | null;
  latitude: number | null;
  longitude: number | null;
  priceRange: string | null;
  gameUseType: EstablishmentGameUseType;
  presenceScope: EstablishmentPresenceScope;
  isSponsored: boolean;
  sponsorName: string | null;
  isVisitable: boolean;
  allowMapHighlight: boolean;
  logoUrl: string | null;
  bannerUrl: string | null;
  coverImageUrl: string | null;
  city: {
    id: string;
    name: string;
    stateCode: string;
  } | null;
  offers: WorldEstablishmentOffer[];
}

type RawCity = {
  id: string;
  name: string;
  state_code: string;
};

type RawOffer = {
  id: string;
  title: string;
  offer_type: string;
  description: string;
  price?: number | string | null;
  period_type: string;
  image_url?: string | null;
  is_available?: boolean | null;
  sort_order?: number | null;
};

type RawEstablishment = {
  id: string;
  slug: string;
  name: string;
  business_type: string;
  subcategory?: string | null;
  description: string;
  slogan?: string | null;
  district?: string | null;
  street_name?: string | null;
  number_reference?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  price_range?: string | null;
  game_use_type?: EstablishmentGameUseType | null;
  presence_scope?: EstablishmentPresenceScope | null;
  is_sponsored?: boolean | null;
  sponsor_name?: string | null;
  is_visitable?: boolean | null;
  allow_map_highlight?: boolean | null;
  logo_url?: string | null;
  banner_url?: string | null;
  cover_image_url?: string | null;
  city?: RawCity | RawCity[] | null;
  offers?: RawOffer[] | null;
};

function normalize(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function normalizeEstablishment(row: RawEstablishment): WorldEstablishment {
  const city = firstRelation(row.city);
  const offers = Array.isArray(row.offers)
    ? row.offers
        .filter((offer) => offer.is_available !== false)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
        .map((offer) => ({
          id: offer.id,
          title: offer.title,
          offerType: offer.offer_type,
          description: offer.description,
          price: offer.price == null ? null : finiteNumber(offer.price),
          periodType: offer.period_type,
          imageUrl: offer.image_url || null,
        }))
    : [];

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    businessType: row.business_type,
    subcategory: row.subcategory || null,
    description: row.description || '',
    slogan: row.slogan || null,
    district: row.district || null,
    streetName: row.street_name || null,
    numberReference: row.number_reference || null,
    latitude: finiteNumber(row.latitude),
    longitude: finiteNumber(row.longitude),
    priceRange: row.price_range || null,
    gameUseType: row.game_use_type || 'MIXED',
    presenceScope: row.presence_scope === 'UNIVERSAL' ? 'UNIVERSAL' : 'CITY',
    isSponsored: Boolean(row.is_sponsored),
    sponsorName: row.sponsor_name || null,
    isVisitable: row.is_visitable !== false,
    allowMapHighlight: row.allow_map_highlight !== false,
    logoUrl: row.logo_url || null,
    bannerUrl: row.banner_url || null,
    coverImageUrl: row.cover_image_url || null,
    city: city
      ? { id: city.id, name: city.name, stateCode: city.state_code }
      : null,
    offers,
  };
}

export async function loadWorldEstablishments(profile: WorldMapProfile): Promise<WorldEstablishment[]> {
  if (!supabase) return [];

  let cityId: string | null = null;
  const { data: cityRows, error: cityError } = await supabase
    .from('cities')
    .select('id,name,state_code')
    .eq('is_active', true)
    .eq('state_code', profile.state.toUpperCase());

  if (!cityError) {
    const targetCity = (cityRows || []).find((row) => normalize(row.name) === normalize(profile.city));
    cityId = targetCity?.id || null;
  }

  let query = supabase
    .from('establishments')
    .select(
      'id,slug,name,business_type,subcategory,description,slogan,district,street_name,number_reference,latitude,longitude,price_range,game_use_type,presence_scope,is_sponsored,sponsor_name,is_visitable,allow_map_highlight,logo_url,banner_url,cover_image_url,city:cities(id,name,state_code),offers:establishment_offers(id,title,offer_type,description,price,period_type,image_url,is_available,sort_order)'
    )
    .eq('status', 'published')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(80);

  query = cityId
    ? query.or('presence_scope.eq.UNIVERSAL,city_id.eq.' + cityId)
    : query.eq('presence_scope', 'UNIVERSAL');

  const { data, error } = await query;
  if (error) {
    console.warn('[Rota da Justiça] Estabelecimentos do mundo indisponíveis.', error);
    return [];
  }

  return ((data || []) as unknown as RawEstablishment[])
    .map(normalizeEstablishment)
    .filter((item) => (
      item.presenceScope === 'UNIVERSAL'
      || (
        item.city
        && item.city.stateCode.toUpperCase() === profile.state.toUpperCase()
        && normalize(item.city.name) === normalize(profile.city)
      )
    ));
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

export function getWorldPointForEstablishment(
  profile: WorldMapProfile,
  establishment: WorldEstablishment,
): WorldGeoPoint {
  const hasExplicitCoordinates = establishment.presenceScope === 'CITY'
    && establishment.latitude != null
    && establishment.longitude != null;

  if (hasExplicitCoordinates) {
    return {
      lat: establishment.latitude as number,
      lng: establishment.longitude as number,
    };
  }

  const seed = hashString(
    normalize(profile.city) + ':' + normalize(profile.state) + ':establishment:' + establishment.slug
  );
  const angle = (((seed % 3600) / 10) * Math.PI) / 180;
  const radius = 0.75 + ((seed >>> 7) % 260) / 100;
  return pointAtDistance(profile.center, radius, angle);
}

export function establishmentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    IMOBILIARIA: 'Imobiliária',
    HOTEL: 'Hotel',
    POUSADA: 'Pousada',
    LOCADORA: 'Locadora',
    CONCESSIONARIA: 'Concessionária',
    LOJA_VEICULOS: 'Loja de veículos',
    ESCRITORIO: 'Escritório',
    RESTAURANTE: 'Restaurante',
    FARMACIA: 'Farmácia',
    MERCADO: 'Mercado',
    POSTO: 'Posto',
    ACADEMIA: 'Academia',
    CLINICA: 'Clínica',
    BANCO: 'Banco',
    SHOPPING: 'Shopping',
    OUTRO: 'Estabelecimento',
  };
  return labels[type] || type;
}

export function formatEstablishmentPrice(price: number | null) {
  if (price == null) return 'Sob consulta';
  return 'JR$ ' + price.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
