import type { LegalCase } from '../types/game';
import { GAME_CASES } from '../data/cases';
import '../data/casesExpansion';
import { isSupabaseConfigured, supabase } from './supabase';
import { normalizeCaseCatalog } from './caseRules';

const CASE_CACHE_KEY = 'rota_da_justica_cases_cache_v1';

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
  content: {
    client: LegalCase['client'];
    briefing: LegalCase['briefing'];
    locations: LegalCase['locations'];
    availableClues: LegalCase['availableClues'];
    strategies: LegalCase['strategies'];
    minimumPassingScore: number;
  };
}

function getLegacyCatalog(): LegalCase[] {
  return normalizeCaseCatalog([...GAME_CASES]);
}

function readCachedCatalog(): LegalCase[] | null {
  try {
    const raw = localStorage.getItem(CASE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    return normalizeCaseCatalog(parsed as LegalCase[]);
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

function rowToCase(row: CaseRow): LegalCase {
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
    client: row.content.client,
    briefing: row.content.briefing,
    locations: row.content.locations,
    availableClues: row.content.availableClues,
    strategies: row.content.strategies,
    minimumPassingScore: row.content.minimumPassingScore,
  };
}

export async function loadCaseCatalog(): Promise<LegalCase[]> {
  const legacy = getLegacyCatalog();

  if (!isSupabaseConfigured || !supabase) {
    return readCachedCatalog() ?? legacy;
  }

  try {
    const { data, error } = await supabase
      .from('cases')
      .select(
        'id, code, title, area, difficulty, difficulty_stars, deadline_hours, honorarios_reward, xp_reward, reputation_reward, min_career_tier, content, sort_order, version',
      )
      .eq('is_active', true)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (Array.isArray(data) && data.length > 0) {
      const catalog = normalizeCaseCatalog((data as unknown as CaseRow[]).map(rowToCase));
      cacheCatalog(catalog);
      return catalog;
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
