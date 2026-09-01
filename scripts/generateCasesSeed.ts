import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import '../src/data/casesExpansion';
import { GAME_CASES } from '../src/data/cases';
import { normalizeCaseCatalog } from '../src/lib/caseRules';

const OUTPUT = resolve('supabase/migrations/20260901030100_seed_legacy_cases.sql');

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlJson(value: unknown): string {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

const cases = normalizeCaseCatalog(GAME_CASES);

const rows = cases.map((caseItem, index) => {
  const content = {
    client: caseItem.client,
    briefing: caseItem.briefing,
    locations: caseItem.locations,
    availableClues: caseItem.availableClues,
    strategies: caseItem.strategies,
    minimumPassingScore: caseItem.minimumPassingScore,
  };

  return `(
    ${sqlString(caseItem.id)},
    ${sqlString(caseItem.code)},
    ${sqlString(caseItem.title)},
    ${sqlString(caseItem.area)},
    ${sqlString(caseItem.difficulty)},
    ${caseItem.difficultyStars},
    ${caseItem.deadlineHours},
    ${caseItem.honorariosReward},
    ${caseItem.xpReward},
    ${caseItem.reputationReward},
    ${sqlString(caseItem.minCareerTier)},
    'published',
    true,
    false,
    ${index + 1},
    1,
    ${sqlJson(content)},
    ${sqlJson({ importedFrom: 'legacy-typescript', sourceVersion: 1 })},
    now()
  )`;
});

const sql = `-- AUTO-GENERATED FILE. Do not edit manually.\n-- Generated from src/data/cases.ts + src/data/casesExpansion.ts.\n\nbegin;\n\ninsert into public.cases (\n  id, code, title, area, difficulty, difficulty_stars, deadline_hours,\n  honorarios_reward, xp_reward, reputation_reward, min_career_tier, status,\n  is_active, is_featured, sort_order, version, content, metadata, published_at\n)\nvalues\n${rows.join(',\n')}\non conflict (id) do update set\n  code = excluded.code,\n  title = excluded.title,\n  area = excluded.area,\n  difficulty = excluded.difficulty,\n  difficulty_stars = excluded.difficulty_stars,\n  deadline_hours = excluded.deadline_hours,\n  honorarios_reward = excluded.honorarios_reward,\n  xp_reward = excluded.xp_reward,\n  reputation_reward = excluded.reputation_reward,\n  min_career_tier = excluded.min_career_tier,\n  status = excluded.status,\n  is_active = excluded.is_active,\n  is_featured = excluded.is_featured,\n  sort_order = excluded.sort_order,\n  version = excluded.version,\n  content = excluded.content,\n  metadata = excluded.metadata,\n  published_at = coalesce(public.cases.published_at, excluded.published_at),\n  updated_at = now();\n\ncommit;\n`;

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, sql, 'utf8');
console.log(`Migration generated: ${OUTPUT}`);
console.log(`Cases exported: ${cases.length}`);
