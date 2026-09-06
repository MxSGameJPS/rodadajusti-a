import type { LegalCase } from '../types/game';
import { GAME_CASES } from '../data/cases';
import '../data/casesExpansion';
import { isSupabaseConfigured, supabase } from './supabase';
import { normalizeCaseCatalog } from './caseRules';
import { isLegalCase, validateLegalCase } from './caseValidation';

const CASE_CACHE_KEY = 'rota_da_justica_cases_cache_v2';

interface CaseRow {
  id: string;
  code: string;
  title: string;
  area: string;
  difficulty: LegalCase['difficulty'];
  difficulty_stars: number;
  deadline_hours: number;
  honorarios_reward: number;
  xp_reward: number;
  reputation_reward: number;
  min_career_tier: LegalCase['minCareerTier'];
  repercussion_level?: string | null;
  procedural_stage?: string | null;
  process_key?: string | null;
  appeal_of_case_id?: string | null;
  appeal_type?: string | null;
  appeal_trigger?: string | null;
  appeal_deadline_days?: number | null;
  court_name?: string | null;
  content: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

const BASE_SELECT =
  'id, code, title, area, difficulty, difficulty_stars, deadline_hours, honorarios_reward, xp_reward, reputation_reward, min_career_tier, content, metadata, sort_order, version';
const PROCEDURAL_SELECT =
  `${BASE_SELECT}, repercussion_level, procedural_stage, process_key, appeal_of_case_id, appeal_type, appeal_trigger, appeal_deadline_days, court_name`;

function getLegacyCatalog(): LegalCase[] {
  return normalizeCaseCatalog([...GAME_CASES]);
}

function readCachedCatalog(): LegalCase[] | null {
  try {
    const raw = localStorage.getItem(CASE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const valid = parsed.filter(isLegalCase);
    if (valid.length === 0) return null;

    return normalizeCaseCatalog(valid);
  } catch {
    return null;
  }
}

function cacheCatalog(cases: LegalCase[]): void {
  try {
    localStorage.setItem(CASE_CACHE_KEY, JSON.stringify(cases));
  } catch {
    // Cache é apenas um fallback offline; falhas não bloqueiam o jogo.
  }
}

function rowToCandidate(row: CaseRow): unknown {
  const content = row.content && typeof row.content === 'object' ? row.content : {};
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    area: row.area,
    difficulty: row.difficulty,
    difficultyStars: row.difficulty_stars,
    deadlineHours: row.deadline_hours,
    honorariosReward: Number(row.honorarios_reward),
    xpReward: row.xp_reward,
    reputationReward: row.reputation_reward,
    minCareerTier: row.min_career_tier,
    repercussionLevel: row.repercussion_level || 'COMUM',
    proceduralStage: row.procedural_stage || 'PRIMEIRA_INSTANCIA',
    processKey: row.process_key || null,
    appealOfCaseId: row.appeal_of_case_id || null,
    appealType: row.appeal_type || null,
    appealTrigger: row.appeal_trigger || null,
    appealDeadlineDays: row.appeal_deadline_days || 15,
    courtName: row.court_name || null,
    client: content.client,
    briefing: content.briefing,
    locations: content.locations,
    availableClues: content.availableClues,
    strategies: content.strategies,
    minimumPassingScore: content.minimumPassingScore,
    reactiveWorld: metadata.reactiveWorld,
  };
}

async function fetchPublishedRows() {
  if (!supabase) return { data: null, error: new Error('Supabase indisponível') };

  const modern = await supabase
    .from('cases')
    .select(PROCEDURAL_SELECT)
    .eq('is_active', true)
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (!modern.error) return modern;

  console.warn(
    '[Rota da Justiça] Colunas de repercussão/recursos ainda não estão disponíveis. Carregando catálogo compatível até a migration ser aplicada.',
    modern.error,
  );

  return supabase
    .from('cases')
    .select(BASE_SELECT)
    .eq('is_active', true)
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
}

export async function loadCaseCatalog(): Promise<LegalCase[]> {
  const legacy = getLegacyCatalog();

  if (!isSupabaseConfigured || !supabase) {
    return readCachedCatalog() ?? legacy;
  }

  try {
    const { data, error } = await fetchPublishedRows();

    if (error) throw error;

    if (Array.isArray(data) && data.length > 0) {
      const validCases: LegalCase[] = [];

      for (const row of data as unknown as CaseRow[]) {
        const candidate = rowToCandidate(row);
        const validationErrors = validateLegalCase(candidate);
        if (validationErrors.length > 0) {
          console.error(
            `[Rota da Justiça] Caso publicado incompatível ignorado: ${row.id} (${row.code}). Repare-o no rota-admin.`,
            validationErrors,
          );
          continue;
        }
        if (isLegalCase(candidate)) validCases.push(candidate);
      }

      if (validCases.length > 0) {
        const catalog = normalizeCaseCatalog(validCases);
        cacheCatalog(catalog);
        return catalog;
      }

      console.warn('[Rota da Justiça] O Supabase retornou casos publicados, mas nenhum passou pelo contrato jogável. Usando cache/local.');
    }
  } catch (error) {
    console.warn('[Rota da Justiça] Não foi possível carregar o catálogo do Supabase. Usando cache/local.', error);
  }

  return readCachedCatalog() ?? legacy;
}

export async function hydrateCaseCatalog(): Promise<LegalCase[]> {
  const catalog = await loadCaseCatalog();

  GAME_CASES.splice(0, GAME_CASES.length, ...catalog);
  return GAME_CASES;
}
