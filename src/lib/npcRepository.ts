import type { DialogueOption, LocationScene } from '../types/game';
import { isSupabaseConfigured, supabase } from './supabase';

const NPC_CACHE_PREFIX = 'rota_da_justica_case_npcs_cache_v1:';

interface CaseNpcRow {
  id: string;
  case_id: string;
  npc_id: string;
  role_in_case: string;
  is_required: boolean;
  sort_order: number;
  configuration: Record<string, unknown> | null;
}

interface NpcRow {
  id: string;
  slug: string;
  name: string;
  role_type: string;
  profession: string;
  specialization: string;
  jurisdiction: string;
  professional_profile: Record<string, unknown> | null;
  personality: Record<string, unknown> | null;
  dialogue_library: unknown[] | null;
  knowledge: unknown[] | null;
  metadata: Record<string, unknown> | null;
}

export interface PersistentNpcAssignment {
  assignmentId: string;
  caseId: string;
  npcId: string;
  slug: string;
  name: string;
  roleType: string;
  profession: string;
  specialization: string;
  jurisdiction: string;
  roleInCase: string;
  isRequired: boolean;
  sortOrder: number;
  portraitSrc: string;
  initialDialogue: string;
  dialogueOptions: DialogueOption[];
  locationIds: string[];
  locationCategories: LocationScene['category'][];
}

const LOCATION_CATEGORIES = new Set<LocationScene['category']>([
  'cartorio',
  'tribunal',
  'delegacia',
  'residencia',
  'empresa',
  'banco',
  'escritorio',
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter(Boolean);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function humanizeTrigger(trigger: string): string {
  const normalized = trigger.replace(/[_-]+/g, ' ').trim();
  if (!normalized) return 'Perguntar sobre o caso';
  if (/^(perguntar|questionar|solicitar|verificar|pedir)\b/i.test(normalized)) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  return `Perguntar sobre ${normalized.toLowerCase()}`;
}

function normalizeOutcomeType(value: unknown): string {
  const normalized = asString(value).toLowerCase();
  if (['information', 'informacao', 'informação'].includes(normalized)) return 'information';
  if (['clue', 'pista'].includes(normalized)) return 'clue';
  if (['new_diligence', 'nova_diligencia', 'nova diligência'].includes(normalized)) return 'new_diligence';
  if (['case_update', 'atualizacao', 'atualização'].includes(normalized)) return 'case_update';
  return 'none';
}

function buildDialogueOption(
  raw: unknown,
  assignmentId: string,
  index: number,
): DialogueOption | null {
  const item = asRecord(raw);
  const outcome = asRecord(item.outcome);
  const question = asString(item.question) || humanizeTrigger(asString(item.trigger));
  const baseAnswer = asString(item.answer) || asString(item.text);
  const outcomeMessage = asString(item.outcomeMessage) || asString(outcome.message);
  const answer = [baseAnswer, outcomeMessage].filter(Boolean).join('\n\n');

  if (!question || !answer) return null;

  const rawId = asString(item.id) || asString(item.trigger) || `opcao-${index + 1}`;
  const revealsClueId = asString(item.revealsClueId) || asString(outcome.revealsClueId);
  const unlocksLocationId = asString(item.unlocksLocationId) || asString(outcome.unlocksLocationId);
  const timeCostCandidate = Number(item.timeCostMinutes ?? outcome.timeCostMinutes ?? 10);
  const timeCostMinutes = Number.isFinite(timeCostCandidate) && timeCostCandidate >= 0
    ? Math.round(timeCostCandidate)
    : 10;

  const option: DialogueOption = {
    id: `npc:${assignmentId}:${normalizeSlug(rawId) || index + 1}`,
    question,
    answer,
    timeCostMinutes,
  };

  if (revealsClueId) option.revealsClueId = revealsClueId;
  if (unlocksLocationId) option.unlocksLocationId = unlocksLocationId;

  const attitude = asString(item.attitude);
  if (['neutro', 'cooperativo', 'suspeito', 'nervoso'].includes(attitude)) {
    option.attitude = attitude as DialogueOption['attitude'];
  }

  // outcomeType fica materializado no conteúdo da resposta e nos efeitos já
  // suportados pelo jogo (pista/local). Isso mantém o contrato atual compatível.
  normalizeOutcomeType(item.outcomeType ?? outcome.type);

  return option;
}

function resolveDialogueOptions(
  row: CaseNpcRow,
  npc: NpcRow,
): DialogueOption[] {
  const configuration = asRecord(row.configuration);
  const configured = Array.isArray(configuration.dialogueOptions)
    ? configuration.dialogueOptions
    : [];
  const source = configured.length > 0
    ? configured
    : Array.isArray(npc.dialogue_library)
      ? npc.dialogue_library
      : [];

  return source
    .map((item, index) => buildDialogueOption(item, row.id, index))
    .filter((item): item is DialogueOption => Boolean(item));
}

function resolveLocations(configuration: Record<string, unknown>) {
  const locationIds = unique([
    asString(configuration.locationId),
    ...asStringArray(configuration.locationIds),
  ].filter(Boolean));

  const categories = unique([
    asString(configuration.locationCategory),
    ...asStringArray(configuration.locationCategories),
  ].filter(Boolean))
    .filter((value): value is LocationScene['category'] => LOCATION_CATEGORIES.has(value as LocationScene['category']));

  return { locationIds, locationCategories: categories };
}

function resolvePortrait(npc: NpcRow, configuration: Record<string, unknown>): string {
  const metadata = asRecord(npc.metadata);
  const configured =
    asString(configuration.portraitSrc) ||
    asString(configuration.portraitPath) ||
    asString(metadata.portraitSrc) ||
    asString(metadata.portraitPath);

  if (configured) return configured.startsWith('/') ? configured : `/${configured}`;

  const byName = normalizeSlug(npc.name);
  if (byName) return `/personagens/${byName}.png`;
  return `/personagens/${normalizeSlug(npc.slug)}.png`;
}

function normalizeAssignment(row: CaseNpcRow, npc: NpcRow): PersistentNpcAssignment {
  const configuration = asRecord(row.configuration);
  const { locationIds, locationCategories } = resolveLocations(configuration);
  const initialDialogue =
    asString(configuration.initialDialogue) ||
    asString(configuration.greeting) ||
    `Pois não, doutor(a). O que precisa saber sobre este caso?`;

  return {
    assignmentId: row.id,
    caseId: row.case_id,
    npcId: npc.id,
    slug: npc.slug,
    name: npc.name,
    roleType: npc.role_type,
    profession: npc.profession,
    specialization: npc.specialization,
    jurisdiction: npc.jurisdiction,
    roleInCase: row.role_in_case,
    isRequired: row.is_required,
    sortOrder: row.sort_order,
    portraitSrc: resolvePortrait(npc, configuration),
    initialDialogue,
    dialogueOptions: resolveDialogueOptions(row, npc),
    locationIds,
    locationCategories,
  };
}

function cacheKey(caseId: string): string {
  return `${NPC_CACHE_PREFIX}${caseId}`;
}

function readCache(caseId: string): PersistentNpcAssignment[] {
  try {
    const raw = localStorage.getItem(cacheKey(caseId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCache(caseId: string, assignments: PersistentNpcAssignment[]) {
  try {
    localStorage.setItem(cacheKey(caseId), JSON.stringify(assignments));
  } catch {
    // O cache é somente fallback offline.
  }
}

export function isNpcAvailableAtLocation(
  assignment: PersistentNpcAssignment,
  location: LocationScene,
): boolean {
  // Regra deliberada: NPC persistente nunca aparece automaticamente.
  // O rota-admin precisa vinculá-lo explicitamente a um local ou categoria.
  if (assignment.locationIds.length === 0 && assignment.locationCategories.length === 0) {
    return false;
  }

  return assignment.locationIds.includes(location.id)
    || assignment.locationCategories.includes(location.category);
}

export async function loadCaseNpcAssignments(caseId: string): Promise<PersistentNpcAssignment[]> {
  if (!caseId) return [];

  if (!isSupabaseConfigured || !supabase) {
    return readCache(caseId);
  }

  try {
    const { data: relations, error: relationError } = await supabase
      .from('case_npcs')
      .select('id,case_id,npc_id,role_in_case,is_required,sort_order,configuration')
      .eq('case_id', caseId)
      .order('sort_order', { ascending: true });

    if (relationError) throw relationError;
    if (!Array.isArray(relations) || relations.length === 0) {
      writeCache(caseId, []);
      return [];
    }

    const npcIds = unique(relations.map((item) => asString(item.npc_id)).filter(Boolean));
    if (npcIds.length === 0) return [];

    const { data: npcs, error: npcError } = await supabase
      .from('npcs')
      .select('id,slug,name,role_type,profession,specialization,jurisdiction,professional_profile,personality,dialogue_library,knowledge,metadata')
      .in('id', npcIds)
      .eq('status', 'published')
      .eq('is_active', true);

    if (npcError) throw npcError;

    const npcById = new Map((npcs || []).map((npc) => [npc.id, npc as NpcRow]));
    const normalized = (relations as CaseNpcRow[])
      .map((relation) => {
        const npc = npcById.get(relation.npc_id);
        return npc ? normalizeAssignment(relation, npc) : null;
      })
      .filter((item): item is PersistentNpcAssignment => Boolean(item))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'pt-BR'));

    writeCache(caseId, normalized);
    return normalized;
  } catch (error) {
    console.warn('[Rota da Justiça] Não foi possível carregar os NPCs persistentes do caso. Usando cache local.', error);
    return readCache(caseId);
  }
}
