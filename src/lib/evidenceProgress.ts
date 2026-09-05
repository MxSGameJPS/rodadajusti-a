import type { ActiveCaseState, Clue, DialogueOption, LegalCase, SearchableSpot } from '../types/game';

const GENERIC_ID_TOKENS = new Set([
  'clue',
  'evidence',
  'prova',
  'pista',
  'loc',
  'location',
  'case',
  'caso',
  'char',
  'dialogo',
  'dialogue',
  'search',
  'searchable',
  'spot',
]);

function normalizeText(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function meaningfulIdTokens(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !GENERIC_ID_TOKENS.has(token))
    .filter((token) => !/^c?\d+$/.test(token));
}

function idSimilarity(left: string, right: string) {
  const a = meaningfulIdTokens(left);
  const b = meaningfulIdTokens(right);
  if (a.length === 0 || b.length === 0) return 0;

  const bSet = new Set(b);
  const intersection = a.filter((token) => bSet.has(token)).length;
  const denominator = Math.max(1, Math.min(a.length, b.length));
  return intersection / denominator;
}

function addClueId(target: Set<string>, clueId: string | undefined, validIds: Set<string>) {
  if (clueId && validIds.has(clueId)) target.add(clueId);
}

function dialogueWasAsked(activeState: ActiveCaseState, option: DialogueOption) {
  if (activeState.askedDialogueIds.includes(option.id)) return true;
  const normalizedQuestion = normalizeText(option.question);
  if (!normalizedQuestion) return false;

  return activeState.logs.some((log) => {
    if (log.type !== 'depoimento') return false;
    return normalizeText(log.message).includes(normalizedQuestion);
  });
}

function spotWasInspected(activeState: ActiveCaseState, spot: SearchableSpot) {
  if (activeState.inspectedSpotIds.includes(spot.id)) return true;
  const normalizedName = normalizeText(spot.name);
  if (!normalizedName) return false;

  return activeState.logs.some((log) => {
    if (log.type !== 'analise') return false;
    return normalizeText(log.message).includes(normalizedName);
  });
}

/**
 * Resolve as provas efetivamente coletadas contra a versão atual do caso.
 *
 * Além do caminho normal (discoveredClueIds), faz recuperação conservadora para
 * saves antigos quando um caso foi regenerado/publicado durante uma investigação:
 * - reaplica revealsClueId a partir dos diálogos já realizados;
 * - reaplica foundClueId a partir dos pontos já inspecionados;
 * - tenta mapear IDs antigos para novos IDs semanticamente equivalentes.
 */
export function resolveCollectedClueIds(currentCase: LegalCase, activeState: ActiveCaseState): string[] {
  const validIds = new Set(currentCase.availableClues.map((clue) => clue.id));
  const resolved = new Set<string>();

  for (const clueId of activeState.discoveredClueIds) {
    if (validIds.has(clueId)) resolved.add(clueId);
  }

  for (const location of currentCase.locations) {
    for (const character of location.characters) {
      for (const option of character.dialogueOptions) {
        if (!dialogueWasAsked(activeState, option)) continue;
        addClueId(resolved, option.revealsClueId, validIds);
      }
    }

    for (const spot of location.searchables) {
      if (!spotWasInspected(activeState, spot)) continue;
      addClueId(resolved, spot.foundClueId, validIds);
    }
  }

  const unresolvedLegacyIds = activeState.discoveredClueIds.filter((id) => !validIds.has(id));
  for (const legacyId of unresolvedLegacyIds) {
    let best: { id: string; score: number } | null = null;

    for (const clue of currentCase.availableClues) {
      if (resolved.has(clue.id)) continue;
      const score = idSimilarity(legacyId, clue.id);
      if (!best || score > best.score) best = { id: clue.id, score };
    }

    if (best && best.score >= 0.75) resolved.add(best.id);
  }

  return currentCase.availableClues
    .filter((clue) => resolved.has(clue.id))
    .map((clue) => clue.id);
}

export function resolveCollectedClues(currentCase: LegalCase, activeState: ActiveCaseState): Clue[] {
  const ids = new Set(resolveCollectedClueIds(currentCase, activeState));
  return currentCase.availableClues.filter((clue) => ids.has(clue.id));
}

/**
 * Resolve os locais que já deveriam estar acessíveis a partir do progresso real.
 *
 * Casos publicados pelo rota-admin podem usar requiredClueOrDialogToUnlock sem
 * repetir unlocksLocationId em cada interação. O runtime precisa então liberar o
 * local assim que a pista/diálogo exigido tiver sido concluído. A reconciliação
 * também aproveita as provas recuperadas de saves anteriores, evitando que uma
 * regeneração do caso deixe o jogador preso em um mapa impossível de avançar.
 */
export function resolveUnlockedLocationIds(currentCase: LegalCase, activeState: ActiveCaseState): string[] {
  const validLocationIds = new Set(currentCase.locations.map((location) => location.id));
  const collectedClueIds = new Set(resolveCollectedClueIds(currentCase, activeState));
  const completedDialogueIds = new Set<string>();
  const unlocked = new Set<string>();

  for (const locationId of activeState.unlockedLocationIds) {
    if (validLocationIds.has(locationId)) unlocked.add(locationId);
  }

  for (const location of currentCase.locations) {
    if (location.unlockedByDefault) unlocked.add(location.id);

    for (const character of location.characters) {
      for (const option of character.dialogueOptions) {
        if (!dialogueWasAsked(activeState, option)) continue;
        completedDialogueIds.add(option.id);
        if (option.unlocksLocationId && validLocationIds.has(option.unlocksLocationId)) {
          unlocked.add(option.unlocksLocationId);
        }
      }
    }
  }

  for (const location of currentCase.locations) {
    const requirement = location.requiredClueOrDialogToUnlock;
    if (!requirement) continue;

    if (collectedClueIds.has(requirement) || completedDialogueIds.has(requirement)) {
      unlocked.add(location.id);
    }
  }

  return currentCase.locations
    .filter((location) => unlocked.has(location.id))
    .map((location) => location.id);
}
