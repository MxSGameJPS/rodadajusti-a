import { GAME_CASES } from '../data/cases';
import type { CareerTierId, PlayerProfile } from '../types/game';
import { emitPlayerSaveExternalUpdated } from './playerSaveEvents';
import {
  activateLawFirmEmployment,
  readProfessionalEmploymentState,
  type ProfessionalEmploymentState,
} from './professionalEmployment';
import { syncProfessionalProfileWithPlayer } from './professionalRpg';
import { isSupabaseConfigured, supabase } from './supabase';

const PLAYER_SAVE_KEY = 'rota_da_justica_save_v1';
const LOCAL_OFFERS_PREFIX = 'rota_law_firm_offers_v1:';

export type LawFirmOfferType =
  | 'POST_OAB'
  | 'CONTINUITY'
  | 'HEADHUNTING'
  | 'APPLICATION_APPROVED'
  | 'POST_TERMINATION'
  | 'COUNTEROFFER'
  | 'RETURN';

export type LawFirmOfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN';

export interface LawFirmMarketRole {
  id: string;
  lawFirmId: string;
  code: string;
  title: string;
  mapsToCareerTier: CareerTierId | null;
  salaryMonthlyJR: number;
  weeklyHours: number;
  exclusiveDedication: boolean;
  employmentType: string;
  workRegime: string;
  benefits: Record<string, unknown>;
}

export interface LawFirmMarketFirm {
  id: string;
  slug: string;
  name: string;
  description: string;
  marketTier: string;
  sizeCategory: string;
  prestige: number;
  publicReputation: number;
  recruitment: Record<string, unknown>;
  specialties: Array<{ slug?: string; name?: string; weight?: number }>;
  roles: LawFirmMarketRole[];
}

export interface LawFirmOffer {
  id: string;
  careerId: string | null;
  userId: string | null;
  lawFirmId: string;
  roleId: string;
  offerType: LawFirmOfferType;
  status: LawFirmOfferStatus;
  gameDate: string;
  expiresGameDate: string | null;
  terms: {
    officeSlug: string;
    officeName: string;
    roleCode: string;
    roleTitle: string;
    mapsToCareerTier: CareerTierId | null;
    salaryMonthlyJR: number;
    weeklyHours: number;
    exclusiveDedication: boolean;
    employmentType: string;
    workRegime: string;
    benefits: Record<string, unknown>;
  };
  eligibilitySnapshot: Record<string, unknown>;
  createdAt: string;
}

export interface MarketEligibility {
  eligible: boolean;
  reasons: string[];
  role: LawFirmMarketRole | null;
}

export interface LawFirmMarketSnapshot {
  careerId: string | null;
  firms: LawFirmMarketFirm[];
  offers: LawFirmOffer[];
  warnings: string[];
}

type RawFirm = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  market_tier?: string | null;
  size_category?: string | null;
  prestige?: number | null;
  public_reputation?: number | null;
  recruitment?: Record<string, unknown> | null;
  specialties?: unknown;
};

type RawRole = {
  id: string;
  law_firm_id: string;
  code: string;
  title: string;
  maps_to_career_tier?: string | null;
  salary_monthly_jr?: number | string | null;
  weekly_hours?: number | null;
  exclusive_dedication?: boolean | null;
  employment_type?: string | null;
  contract?: Record<string, unknown> | null;
  benefits?: Record<string, unknown> | null;
};

type RawOffer = {
  id: string;
  career_id?: string | null;
  user_id?: string | null;
  law_firm_id: string;
  role_id: string;
  offer_type: LawFirmOfferType;
  status: LawFirmOfferStatus;
  game_date?: string | null;
  expires_game_date?: string | null;
  terms?: LawFirmOffer['terms'] | null;
  eligibility_snapshot?: Record<string, unknown> | null;
  created_at?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSpecialty(area: string) {
  const value = slug(area).replace(/^direito-(do-|da-|de-)?/, '');
  if (value.includes('trabalho') || value.includes('trabalh')) return 'trabalhista';
  if (value.includes('familia') || value.includes('sucess')) return 'familia-sucessoes';
  if (value.includes('imobili')) return 'imobiliario';
  if (value.includes('criminal') || value.includes('penal')) return 'criminal';
  if (value.includes('civil')) return 'civil';
  if (value.includes('empres')) return 'empresarial';
  if (value.includes('consum')) return 'consumidor';
  if (value.includes('tribut')) return 'tributario';
  if (value.includes('admin')) return 'administrativo';
  return value;
}

function getPlayerSpecialties(player: PlayerProfile) {
  const caseById = new Map(GAME_CASES.map((item) => [item.id, item]));
  return [...new Set(
    player.history
      .filter((record) => record.success)
      .map((record) => caseById.get(record.caseId)?.area || '')
      .filter(Boolean)
      .map(normalizeSpecialty),
  )];
}

function getPlayerEthics(player: PlayerProfile) {
  return syncProfessionalProfileWithPlayer(player)?.ethics
    ?? player.officePerformance?.ethics
    ?? 100;
}

function gameDateIso(player: PlayerProfile) {
  return [
    String(player.gameCurrentYear).padStart(4, '0'),
    String(player.gameCurrentMonth).padStart(2, '0'),
    String(player.gameCurrentDay).padStart(2, '0'),
  ].join('-');
}

function addGameDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Math.max(0, Math.floor(days)));
  return date.toISOString().slice(0, 10);
}

function daysBetween(leftIso: string, rightIso: string) {
  const left = Date.parse(`${leftIso}T00:00:00Z`);
  const right = Date.parse(`${rightIso}T00:00:00Z`);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return Number.POSITIVE_INFINITY;
  return Math.floor(Math.abs(right - left) / 86_400_000);
}

function localOfferKey(player: PlayerProfile) {
  const identity = player.oabRegistration?.code
    || player.cloudCareerId
    || slug(player.name)
    || 'jogador';
  return `${LOCAL_OFFERS_PREFIX}${identity}`;
}

function readLocalOffers(player: PlayerProfile): LawFirmOffer[] {
  try {
    const raw = localStorage.getItem(localOfferKey(player));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalOffers(player: PlayerProfile, offers: LawFirmOffer[]) {
  try {
    localStorage.setItem(localOfferKey(player), JSON.stringify(offers.slice(-80)));
  } catch {
    // O mercado continua utilizável durante a sessão.
  }
}

function upsertLocalOffer(player: PlayerProfile, offer: LawFirmOffer) {
  const current = readLocalOffers(player);
  const index = current.findIndex((item) => item.id === offer.id);
  const next = index >= 0
    ? current.map((item, itemIndex) => itemIndex === index ? offer : item)
    : [...current, offer];
  saveLocalOffers(player, next);
}

function patchPlayerCloudCareerId(careerId: string) {
  try {
    const raw = localStorage.getItem(PLAYER_SAVE_KEY);
    if (!raw) return;
    const current = JSON.parse(raw) as PlayerProfile;
    if (current.cloudCareerId === careerId) return;
    localStorage.setItem(PLAYER_SAVE_KEY, JSON.stringify({ ...current, cloudCareerId: careerId }));
    emitPlayerSaveExternalUpdated();
  } catch {
    // O vínculo segue utilizável apenas nesta sessão se o storage falhar.
  }
}

async function ensureCloudCareer(player: PlayerProfile): Promise<{ careerId: string | null; userId: string | null }> {
  if (!isSupabaseConfigured || !supabase) return { careerId: null, userId: null };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { careerId: null, userId: null };
  const userId = userData.user.id;

  let careerId = player.cloudCareerId || null;
  if (careerId) {
    const { data } = await supabase
      .from('careers')
      .select('id')
      .eq('id', careerId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!data?.id) careerId = null;
  }

  if (!careerId) {
    const { data } = await supabase
      .from('careers')
      .select('id')
      .eq('user_id', userId)
      .order('last_played_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    careerId = data?.id || null;
  }

  const careerPatch = {
    character_name: player.name || 'Jogador',
    career_stage: player.careerTier,
    academic_degree: player.academicDegree,
    xp: Math.max(0, Math.floor(player.xp || 0)),
    reputation: Math.max(0, Math.min(100, Math.floor(player.reputation || 0))),
    money: Math.max(0, Number(player.money || 0)),
    cases_completed: Math.max(0, Math.floor(player.casesSolved || 0)),
    cases_failed: Math.max(0, Math.floor(player.casesFailed || 0)),
    current_city: player.homeCity || null,
    last_played_at: new Date().toISOString(),
  };

  if (!careerId) {
    const { data, error } = await supabase
      .from('careers')
      .insert({ user_id: userId, ...careerPatch })
      .select('id')
      .single();
    if (error || !data?.id) return { careerId: null, userId };
    careerId = data.id;
  } else {
    await supabase
      .from('careers')
      .update(careerPatch)
      .eq('id', careerId)
      .eq('user_id', userId);
  }

  patchPlayerCloudCareerId(careerId);
  return { careerId, userId };
}

function normalizeRole(row: RawRole): LawFirmMarketRole {
  const contract = asRecord(row.contract);
  return {
    id: row.id,
    lawFirmId: row.law_firm_id,
    code: row.code,
    title: row.title,
    mapsToCareerTier: typeof row.maps_to_career_tier === 'string'
      ? row.maps_to_career_tier as CareerTierId
      : null,
    salaryMonthlyJR: asNumber(row.salary_monthly_jr),
    weeklyHours: Math.max(0, Math.floor(asNumber(row.weekly_hours, 40))),
    exclusiveDedication: Boolean(row.exclusive_dedication),
    employmentType: row.employment_type || 'EMPLOYED',
    workRegime: typeof contract.workRegime === 'string' ? contract.workRegime : 'MISTO',
    benefits: asRecord(row.benefits),
  };
}

function normalizeFirm(row: RawFirm, roles: LawFirmMarketRole[]): LawFirmMarketFirm {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    marketTier: row.market_tier || 'LOCAL',
    sizeCategory: row.size_category || 'SMALL',
    prestige: asNumber(row.prestige),
    publicReputation: asNumber(row.public_reputation),
    recruitment: asRecord(row.recruitment),
    specialties: Array.isArray(row.specialties)
      ? row.specialties.filter((item): item is { slug?: string; name?: string; weight?: number } => Boolean(item && typeof item === 'object'))
      : [],
    roles,
  };
}

function normalizeOffer(row: RawOffer): LawFirmOffer | null {
  const terms = row.terms && typeof row.terms === 'object' ? row.terms : null;
  if (!terms?.officeName || !terms?.roleTitle) return null;
  return {
    id: row.id,
    careerId: row.career_id || null,
    userId: row.user_id || null,
    lawFirmId: row.law_firm_id,
    roleId: row.role_id,
    offerType: row.offer_type,
    status: row.status,
    gameDate: row.game_date || new Date().toISOString().slice(0, 10),
    expiresGameDate: row.expires_game_date || null,
    terms,
    eligibilitySnapshot: asRecord(row.eligibility_snapshot),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function policyFor(firm: LawFirmMarketFirm, key: 'postTermination' | 'applications') {
  return asRecord(firm.recruitment[key]);
}

export function evaluateMarketPolicy(
  player: PlayerProfile,
  firm: LawFirmMarketFirm,
  key: 'postTermination' | 'applications',
): MarketEligibility {
  const policy = policyFor(firm, key);
  const reasons: string[] = [];

  if (policy.enabled !== true) {
    return { eligible: false, reasons: ['Este escritório não está recrutando por esta modalidade.'], role: null };
  }

  const minReputation = asNumber(policy.minimumReputation);
  const minXp = asNumber(policy.minimumXp);
  const minCasesSolved = asNumber(policy.minimumCasesSolved);
  const minEthics = asNumber(policy.minimumEthics);
  const requiredSpecialties = asStringArray(policy.requiredSpecialties);
  const eligibleRoleCodes = asStringArray(policy.eligibleRoleCodes);
  const playerEthics = getPlayerEthics(player);
  const specialties = getPlayerSpecialties(player);

  if (player.reputation < minReputation) reasons.push(`Reputação mínima: ${minReputation}.`);
  if (player.xp < minXp) reasons.push(`XP mínimo: ${minXp}.`);
  if (player.casesSolved < minCasesSolved) reasons.push(`Casos vencidos mínimos: ${minCasesSolved}.`);
  if (playerEthics < minEthics) reasons.push(`Ética mínima: ${minEthics}.`);
  if (requiredSpecialties.length > 0 && !requiredSpecialties.some((item) => specialties.includes(item))) {
    reasons.push(`Especialidade exigida: ${requiredSpecialties.join(', ')}.`);
  }

  const roles = eligibleRoleCodes.length > 0
    ? firm.roles.filter((role) => eligibleRoleCodes.includes(role.code))
    : firm.roles.filter((role) => role.code === 'ADVOGADO_CONTRATADO' || role.code === 'ADVOGADO_SENIOR');

  const role = roles
    .filter((candidate) => !candidate.mapsToCareerTier || candidate.mapsToCareerTier === player.careerTier || candidate.code === 'ADVOGADO_CONTRATADO')
    .sort((a, b) => b.salaryMonthlyJR - a.salaryMonthlyJR)[0]
    || roles.sort((a, b) => b.salaryMonthlyJR - a.salaryMonthlyJR)[0]
    || null;

  if (!role) reasons.push('Nenhum cargo publicado deste escritório atende a esta modalidade.');

  return { eligible: reasons.length === 0 && Boolean(role), reasons, role };
}

function buildOffer(
  player: PlayerProfile,
  firm: LawFirmMarketFirm,
  role: LawFirmMarketRole,
  offerType: LawFirmOfferType,
  careerId: string | null,
  userId: string | null,
): LawFirmOffer {
  const currentGameDate = gameDateIso(player);
  return {
    id: `local-${offerType.toLowerCase()}-${firm.id}-${role.id}-${Date.now()}`,
    careerId,
    userId,
    lawFirmId: firm.id,
    roleId: role.id,
    offerType,
    status: 'PENDING',
    gameDate: currentGameDate,
    expiresGameDate: addGameDaysIso(currentGameDate, 30),
    terms: {
      officeSlug: firm.slug,
      officeName: firm.name,
      roleCode: role.code,
      roleTitle: role.title,
      mapsToCareerTier: role.mapsToCareerTier,
      salaryMonthlyJR: role.salaryMonthlyJR,
      weeklyHours: role.weeklyHours,
      exclusiveDedication: role.exclusiveDedication,
      employmentType: role.employmentType,
      workRegime: role.workRegime,
      benefits: role.benefits,
    },
    eligibilitySnapshot: {
      reputation: player.reputation,
      xp: player.xp,
      casesSolved: player.casesSolved,
      ethics: getPlayerEthics(player),
      specialties: getPlayerSpecialties(player),
      generatedAtGameDate: currentGameDate,
    },
    createdAt: new Date().toISOString(),
  };
}

async function persistOffer(player: PlayerProfile, offer: LawFirmOffer): Promise<LawFirmOffer> {
  if (supabase && offer.careerId && offer.userId) {
    const { data, error } = await supabase
      .from('career_law_firm_offers')
      .insert({
        career_id: offer.careerId,
        user_id: offer.userId,
        law_firm_id: offer.lawFirmId,
        role_id: offer.roleId,
        offer_type: offer.offerType,
        status: offer.status,
        game_date: offer.gameDate,
        expires_game_date: offer.expiresGameDate,
        terms: offer.terms,
        eligibility_snapshot: offer.eligibilitySnapshot,
      })
      .select('*')
      .single();

    if (!error && data) {
      const normalized = normalizeOffer(data as RawOffer);
      if (normalized) return normalized;
    }

    if (error?.code !== '23505') {
      console.warn('[Rota da Justiça] Oferta não pôde ser persistida no Supabase. Usando fallback local.', error);
    }
  }

  upsertLocalOffer(player, offer);
  return offer;
}

function isOnCooldown(
  offers: LawFirmOffer[],
  firmId: string,
  offerType: LawFirmOfferType,
  currentGameDate: string,
  cooldownDays: number,
) {
  return offers.some((offer) => (
    offer.lawFirmId === firmId
    && offer.offerType === offerType
    && daysBetween(offer.gameDate, currentGameDate) < cooldownDays
  ));
}

async function loadRemoteOffers(careerId: string | null) {
  if (!supabase || !careerId) return [] as LawFirmOffer[];
  const { data, error } = await supabase
    .from('career_law_firm_offers')
    .select('*')
    .eq('career_id', careerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Rota da Justiça] Histórico de ofertas indisponível; usando fallback local.', error);
    return [];
  }

  return (data || [])
    .map((row) => normalizeOffer(row as RawOffer))
    .filter((item): item is LawFirmOffer => Boolean(item));
}

async function loadPublishedFirms(): Promise<LawFirmMarketFirm[]> {
  if (!supabase) return [];

  const { data: firmRows, error: firmError } = await supabase
    .from('law_firms')
    .select('id,slug,name,description,market_tier,size_category,prestige,public_reputation,recruitment,specialties')
    .eq('status', 'published')
    .eq('is_active', true)
    .order('prestige', { ascending: false })
    .order('name', { ascending: true });

  if (firmError) throw firmError;
  const rawFirms = (firmRows || []) as RawFirm[];
  if (rawFirms.length === 0) return [];

  const ids = rawFirms.map((firm) => firm.id);
  const { data: roleRows, error: roleError } = await supabase
    .from('law_firm_roles')
    .select('id,law_firm_id,code,title,maps_to_career_tier,salary_monthly_jr,weekly_hours,exclusive_dedication,employment_type,contract,benefits')
    .in('law_firm_id', ids)
    .eq('status', 'published')
    .eq('is_active', true);

  if (roleError) throw roleError;

  const roles = ((roleRows || []) as RawRole[]).map(normalizeRole);
  return rawFirms.map((firm) => normalizeFirm(
    firm,
    roles.filter((role) => role.lawFirmId === firm.id),
  ));
}

export async function loadLawFirmMarket(player: PlayerProfile): Promise<LawFirmMarketSnapshot> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      careerId: player.cloudCareerId || null,
      firms: [],
      offers: readLocalOffers(player),
      warnings: ['Supabase não está configurado neste ambiente.'],
    };
  }

  const warnings: string[] = [];
  const { careerId, userId } = await ensureCloudCareer(player);
  if (!careerId) warnings.push('A carreira ainda não pôde ser sincronizada com a nuvem.');

  const firms = await loadPublishedFirms();
  const remoteOffers = await loadRemoteOffers(careerId);
  const localOffers = readLocalOffers(player);
  let offers = [...remoteOffers, ...localOffers]
    .filter((offer, index, array) => array.findIndex((candidate) => candidate.id === offer.id) === index);

  const employment = readProfessionalEmploymentState(player);
  const currentEmployerId = employment?.officeId || null;
  const currentEmployerSlug = employment?.officeSlug || '';
  const shouldGenerateTerminationOffers = player.officeDiscipline?.employmentStatus === 'TERMINATED';

  if (shouldGenerateTerminationOffers) {
    const currentDate = gameDateIso(player);

    for (const firm of firms) {
      if (firm.id === currentEmployerId || firm.slug === currentEmployerSlug || firm.slug === 'ramos-associados') continue;
      const eligibility = evaluateMarketPolicy(player, firm, 'postTermination');
      if (!eligibility.eligible || !eligibility.role) continue;

      const policy = policyFor(firm, 'postTermination');
      const cooldown = Math.max(0, Math.floor(asNumber(policy.cooldownGameDays, 15)));
      if (isOnCooldown(offers, firm.id, 'POST_TERMINATION', currentDate, cooldown)) continue;

      const offer = await persistOffer(
        player,
        buildOffer(player, firm, eligibility.role, 'POST_TERMINATION', careerId, userId),
      );
      offers = [offer, ...offers];
    }
  }

  return { careerId, firms, offers, warnings };
}

export async function applyToLawFirm(
  player: PlayerProfile,
  firm: LawFirmMarketFirm,
  currentOffers: LawFirmOffer[],
) {
  const eligibility = evaluateMarketPolicy(player, firm, 'applications');
  if (!eligibility.eligible || !eligibility.role) {
    return { offer: null as LawFirmOffer | null, reasons: eligibility.reasons };
  }

  const currentDate = gameDateIso(player);
  const policy = policyFor(firm, 'applications');
  const cooldown = Math.max(0, Math.floor(asNumber(policy.cooldownGameDays, 30)));
  if (isOnCooldown(currentOffers, firm.id, 'APPLICATION_APPROVED', currentDate, cooldown)) {
    return {
      offer: null as LawFirmOffer | null,
      reasons: [`Você já se candidatou recentemente. O intervalo deste escritório é de ${cooldown} dias do jogo.`],
    };
  }

  const { careerId, userId } = await ensureCloudCareer(player);
  const offer = await persistOffer(
    player,
    buildOffer(player, firm, eligibility.role, 'APPLICATION_APPROVED', careerId, userId),
  );

  return { offer, reasons: [] as string[] };
}

async function updateRemoteOfferStatus(offer: LawFirmOffer, status: LawFirmOfferStatus) {
  if (!supabase || offer.id.startsWith('local-')) return;
  const { error } = await supabase
    .from('career_law_firm_offers')
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq('id', offer.id);
  if (error) console.warn('[Rota da Justiça] Não foi possível atualizar o status da oferta na nuvem.', error);
}

export async function declineLawFirmOffer(player: PlayerProfile, offer: LawFirmOffer) {
  await updateRemoteOfferStatus(offer, 'DECLINED');
  upsertLocalOffer(player, { ...offer, status: 'DECLINED' });
}

export async function acceptLawFirmOffer(player: PlayerProfile, offer: LawFirmOffer) {
  await updateRemoteOfferStatus(offer, 'ACCEPTED');

  const nextEmployment: ProfessionalEmploymentState = activateLawFirmEmployment(player, {
    officeId: offer.lawFirmId,
    officeSlug: offer.terms.officeSlug,
    officeName: offer.terms.officeName,
    roleId: offer.roleId,
    roleCode: offer.terms.roleCode,
    role: offer.terms.roleTitle,
    salaryMonthly: offer.terms.salaryMonthlyJR,
    weeklyHours: offer.terms.weeklyHours,
    exclusiveDedication: offer.terms.exclusiveDedication,
    workRegime: offer.terms.workRegime,
    benefits: offer.terms.benefits,
    sourceOfferId: offer.id,
    sourceOfferType: offer.offerType,
    signedAt: new Date().toISOString(),
    careerTier: offer.terms.mapsToCareerTier,
  });

  upsertLocalOffer(player, { ...offer, status: 'ACCEPTED' });

  if (supabase && offer.careerId) {
    const careerPatch: Record<string, unknown> = {
      current_law_firm_id: offer.lawFirmId,
      current_law_firm_role_id: offer.roleId,
      employment_status: 'EMPLOYED',
      last_played_at: new Date().toISOString(),
    };
    if (offer.terms.mapsToCareerTier) careerPatch.career_stage = offer.terms.mapsToCareerTier;

    await supabase
      .from('careers')
      .update(careerPatch)
      .eq('id', offer.careerId);

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from('career_events').insert({
        career_id: offer.careerId,
        user_id: userData.user.id,
        event_type: 'LAW_FIRM_EMPLOYMENT_ACCEPTED',
        title: `Contratação por ${offer.terms.officeName}`,
        description: `Novo vínculo como ${offer.terms.roleTitle}.`,
        metadata: {
          lawFirmId: offer.lawFirmId,
          roleId: offer.roleId,
          offerType: offer.offerType,
          salaryMonthlyJR: offer.terms.salaryMonthlyJR,
        },
      });
    }
  }

  emitPlayerSaveExternalUpdated();
  return nextEmployment;
}
