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
  gameplayEffects: Record<string, unknown>;
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
  establishment_id?: string;
  title: string;
  offer_type: string;
  description: string;
  price?: number | string | null;
  period_type: string;
  image_url?: string | null;
  is_available?: boolean | null;
  sort_order?: number | null;
  gameplay_effects?: Record<string, unknown> | null;
};

type RawEstablishment = {
  id: string;
  city_id?: string | null;
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
          gameplayEffects: offer.gameplay_effects && typeof offer.gameplay_effects === 'object'
            ? offer.gameplay_effects
            : {},
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

export interface WorldEstablishmentsLoadResult {
  items: WorldEstablishment[];
  error: string | null;
  warnings?: string[];
}

function supabaseDiagnostic(error: any) {
  return [
    error?.code ? '[' + error.code + ']' : '',
    error?.message || '',
    error?.details || '',
    error?.hint || '',
  ].filter(Boolean).join(' ').trim();
}

const ESTABLISHMENT_CORE_SELECT = [
  'id',
  'city_id',
  'slug',
  'name',
  'business_type',
  'subcategory',
  'description',
  'slogan',
  'district',
  'street_name',
  'number_reference',
  'latitude',
  'longitude',
  'price_range',
  'game_use_type',
  'presence_scope',
  'is_sponsored',
  'sponsor_name',
  'is_visitable',
  'allow_map_highlight',
  'logo_url',
  'banner_url',
  'cover_image_url',
].join(',');

const ESTABLISHMENT_MINIMAL_SELECT = [
  'id',
  'city_id',
  'slug',
  'name',
  'business_type',
  'description',
  'latitude',
  'longitude',
  'game_use_type',
  'presence_scope',
  'is_sponsored',
  'is_visitable',
  'allow_map_highlight',
].join(',');

async function readPublishedEstablishmentRows() {
  if (!supabase) return { rows: [] as RawEstablishment[], error: 'Supabase do jogo não está configurado.' };

  const primary = await supabase
    .from('establishments')
    .select(ESTABLISHMENT_CORE_SELECT)
    .eq('status', 'published')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(250);

  if (!primary.error) {
    return {
      rows: (primary.data || []) as unknown as RawEstablishment[],
      error: null,
    };
  }

  // Compatibilidade com bancos que ainda não possuem algum campo visual novo:
  // o estabelecimento continua aparecendo no mapa com os dados essenciais.
  console.warn('[Rota da Justiça] Consulta completa de estabelecimentos falhou; tentando leitura mínima.', {
    code: primary.error.code,
    message: primary.error.message,
  });

  const fallback = await supabase
    .from('establishments')
    .select(ESTABLISHMENT_MINIMAL_SELECT)
    .eq('status', 'published')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(250);

  if (fallback.error) {
    return {
      rows: [] as RawEstablishment[],
      error: supabaseDiagnostic(fallback.error) || supabaseDiagnostic(primary.error),
    };
  }

  return {
    rows: (fallback.data || []) as unknown as RawEstablishment[],
    error: null,
  };
}

async function readCitiesByIds(cityIds: string[]) {
  if (!supabase || cityIds.length === 0) {
    return { cities: new Map<string, RawCity>(), error: null as string | null };
  }

  const { data, error } = await supabase
    .from('cities')
    .select('id,name,state_code')
    .in('id', cityIds);

  if (error) {
    return {
      cities: new Map<string, RawCity>(),
      error: supabaseDiagnostic(error),
    };
  }

  return {
    cities: new Map(
      ((data || []) as RawCity[]).map((city) => [city.id, city] as const),
    ),
    error: null,
  };
}

async function readOffersByEstablishmentIds(establishmentIds: string[]) {
  if (!supabase || establishmentIds.length === 0) {
    return { offers: new Map<string, RawOffer[]>(), error: null as string | null };
  }

  const { data, error } = await supabase
    .from('establishment_offers')
    .select('id,establishment_id,title,offer_type,description,price,period_type,image_url,is_available,sort_order,gameplay_effects')
    .in('establishment_id', establishmentIds)
    .eq('is_available', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('[Rota da Justiça] Ofertas indisponíveis; estabelecimentos continuarão visíveis.', {
      code: error.code,
      message: error.message,
    });
    return {
      offers: new Map<string, RawOffer[]>(),
      error: supabaseDiagnostic(error),
    };
  }

  const grouped = new Map<string, RawOffer[]>();
  ((data || []) as unknown as RawOffer[]).forEach((offer) => {
    const establishmentId = String(offer.establishment_id || '');
    if (!establishmentId) return;
    const current = grouped.get(establishmentId) || [];
    current.push(offer);
    grouped.set(establishmentId, current);
  });

  return { offers: grouped, error: null };
}

export async function loadWorldEstablishmentsWithDiagnostics(
  profile: WorldMapProfile,
): Promise<WorldEstablishmentsLoadResult> {
  if (!supabase) {
    const error = 'Supabase do jogo não está configurado.';
    console.warn('[Rota da Justiça] ' + error);
    return { items: [], error };
  }

  const core = await readPublishedEstablishmentRows();
  if (core.error) {
    console.error('[Rota da Justiça] Falha ao ler estabelecimentos publicados.', {
      error: core.error,
      city: profile.city,
      state: profile.state,
    });
    return { items: [], error: core.error };
  }

  if (core.rows.length === 0) {
    return {
      items: [],
      error: null,
      warnings: ['A leitura pública funcionou, mas retornou 0 estabelecimentos publicados/ativos.'],
    };
  }

  const establishmentIds = core.rows.map((row) => row.id);
  const cityIds = Array.from(new Set(
    core.rows
      .map((row) => String(row.city_id || ''))
      .filter(Boolean),
  ));

  // Cidade e ofertas são complementares. Uma falha nelas não derruba o
  // estabelecimento principal do mapa.
  const [cityResult, offerResult] = await Promise.all([
    readCitiesByIds(cityIds),
    readOffersByEstablishmentIds(establishmentIds),
  ]);

  const warnings: string[] = [];
  if (cityResult.error) warnings.push('Falha ao ler cidades: ' + cityResult.error);
  if (offerResult.error) warnings.push('Falha ao ler ofertas: ' + offerResult.error);

  const normalized = core.rows.map((row) => {
    const city = row.city_id ? cityResult.cities.get(row.city_id) || null : null;
    const offers = offerResult.offers.get(row.id) || [];

    return normalizeEstablishment({
      ...row,
      city,
      offers,
    });
  });

  const targetState = profile.state.toUpperCase();
  const targetCity = normalize(profile.city);

  const items = normalized.filter((item) => {
    if (item.presenceScope === 'UNIVERSAL') return true;

    if (item.city) {
      return item.city.stateCode.toUpperCase() === targetState
        && normalize(item.city.name) === targetCity;
    }

    // Se a cidade vinculada não pôde ser lida, não inventamos a cidade do
    // estabelecimento. O diagnóstico fica explícito no mapa.
    return false;
  });

  if (normalized.length > 0 && items.length === 0 && cityResult.error) {
    return {
      items: [],
      error: 'Estabelecimentos publicados foram encontrados, mas a cidade vinculada não pôde ser lida. ' + cityResult.error,
      warnings,
    };
  }

  return {
    items,
    error: null,
    warnings,
  };
}

export async function loadWorldEstablishments(
  profile: WorldMapProfile,
): Promise<WorldEstablishment[]> {
  return (await loadWorldEstablishmentsWithDiagnostics(profile)).items;
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
    LOJA_MOVEIS: 'Loja de móveis',
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
