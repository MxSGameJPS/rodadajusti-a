import type { LegalCase } from '../types/game';

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);

const CAREER_TIERS = new Set([
  'ESTAGIARIO', 'ESTAGIARIO_SENIOR', 'ADVOGADO_CONTRATADO', 'ADVOGADO_SENIOR',
  'SOCIO_ESCRITORIO', 'DONO_ESCRITORIO', 'MAGISTRADO_SUBSTITUTO', 'JUIZ_TITULAR',
  'DESEMBARGADOR', 'MINISTRO_STF',
]);
const DIFFICULTIES = new Set(['Iniciante', 'Intermediário', 'Avançado', 'Complexo']);
const LOCATION_CATEGORIES = new Set(['cartorio', 'tribunal', 'delegacia', 'residencia', 'empresa', 'banco', 'escritorio']);
const CLUE_TYPES = new Set(['documento', 'depoimento', 'pericia', 'comprovante', 'registro_publico', 'objeto']);
const CLUE_RELEVANCE = new Set(['crucial', 'complementar', 'irrelevante', 'contraditoria']);
const ATTITUDES = new Set(['neutro', 'cooperativo', 'suspeito', 'nervoso']);

export function validateLegalCase(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ['caso não é um objeto'];

  for (const key of ['id', 'code', 'title', 'area'] as const) if (!isString(value[key])) errors.push(`${key} ausente/inválido`);
  if (!isString(value.difficulty) || !DIFFICULTIES.has(value.difficulty)) errors.push('difficulty inválida');
  for (const key of ['difficultyStars', 'deadlineHours', 'honorariosReward', 'xpReward', 'reputationReward', 'minimumPassingScore'] as const) if (!isNumber(value[key])) errors.push(`${key} ausente/inválido`);
  if (!isString(value.minCareerTier) || !CAREER_TIERS.has(value.minCareerTier)) errors.push('minCareerTier inválido');

  if (!isRecord(value.client)) errors.push('client ausente');
  else for (const key of ['name', 'occupation', 'summary', 'avatarBg'] as const) if (!isString(value.client[key])) errors.push(`client.${key} ausente/inválido`);

  if (!isRecord(value.briefing)) errors.push('briefing ausente');
  else {
    for (const key of ['mentorName', 'mentorQuote', 'mainObjective', 'legalContext'] as const) if (!isString(value.briefing[key])) errors.push(`briefing.${key} ausente/inválido`);
    if (!isStringArray(value.briefing.facts) || value.briefing.facts.length === 0) errors.push('briefing.facts ausente/inválido');
  }

  const locationIds = new Set<string>();
  const clueIds = new Set<string>();
  const dialogueIds = new Set<string>();

  if (!Array.isArray(value.locations) || value.locations.length === 0) errors.push('locations ausente/vazio');
  else value.locations.forEach((rawLocation, locationIndex) => {
    const base = `locations[${locationIndex}]`;
    if (!isRecord(rawLocation)) { errors.push(`${base} inválido`); return; }
    if (!isString(rawLocation.id)) errors.push(`${base}.id ausente`); else {
      if (locationIds.has(rawLocation.id)) errors.push(`${base}.id duplicado`);
      locationIds.add(rawLocation.id);
    }
    for (const key of ['name', 'description', 'address', 'iconName', 'color'] as const) if (!isString(rawLocation[key])) errors.push(`${base}.${key} ausente/inválido`);
    if (!isString(rawLocation.category) || !LOCATION_CATEGORIES.has(rawLocation.category)) errors.push(`${base}.category inválida`);
    if (!isNumber(rawLocation.travelTimeHours)) errors.push(`${base}.travelTimeHours inválido`);
    if (!isNumber(rawLocation.travelCost)) errors.push(`${base}.travelCost inválido`);
    if (!isBoolean(rawLocation.unlockedByDefault)) errors.push(`${base}.unlockedByDefault inválido`);

    if (!Array.isArray(rawLocation.characters)) errors.push(`${base}.characters inválido`);
    else rawLocation.characters.forEach((rawCharacter, characterIndex) => {
      const cbase = `${base}.characters[${characterIndex}]`;
      if (!isRecord(rawCharacter)) { errors.push(`${cbase} inválido`); return; }
      for (const key of ['id', 'name', 'role', 'avatarIcon', 'avatarBg', 'initialDialogue'] as const) if (!isString(rawCharacter[key])) errors.push(`${cbase}.${key} ausente/inválido`);
      if (!Array.isArray(rawCharacter.dialogueOptions)) errors.push(`${cbase}.dialogueOptions inválido`);
      else rawCharacter.dialogueOptions.forEach((rawDialog, dialogIndex) => {
        const dbase = `${cbase}.dialogueOptions[${dialogIndex}]`;
        if (!isRecord(rawDialog)) { errors.push(`${dbase} inválido`); return; }
        for (const key of ['id', 'question', 'answer'] as const) if (!isString(rawDialog[key])) errors.push(`${dbase}.${key} ausente/inválido`);
        if (isString(rawDialog.id)) dialogueIds.add(rawDialog.id);
        if (!isNumber(rawDialog.timeCostMinutes)) errors.push(`${dbase}.timeCostMinutes inválido`);
        if (rawDialog.attitude !== undefined && (!isString(rawDialog.attitude) || !ATTITUDES.has(rawDialog.attitude))) errors.push(`${dbase}.attitude inválida`);
      });
    });

    if (!Array.isArray(rawLocation.searchables)) errors.push(`${base}.searchables inválido`);
    else rawLocation.searchables.forEach((rawSpot, spotIndex) => {
      const sbase = `${base}.searchables[${spotIndex}]`;
      if (!isRecord(rawSpot)) { errors.push(`${sbase} inválido`); return; }
      for (const key of ['id', 'name', 'description', 'inspectedMessage'] as const) if (!isString(rawSpot[key])) errors.push(`${sbase}.${key} ausente/inválido`);
      if (!isNumber(rawSpot.timeCostMinutes)) errors.push(`${sbase}.timeCostMinutes inválido`);
    });
  });

  if (!Array.isArray(value.availableClues) || value.availableClues.length === 0) errors.push('availableClues ausente/vazio');
  else value.availableClues.forEach((rawClue, clueIndex) => {
    const base = `availableClues[${clueIndex}]`;
    if (!isRecord(rawClue)) { errors.push(`${base} inválido`); return; }
    if (!isString(rawClue.id)) errors.push(`${base}.id ausente`); else {
      if (clueIds.has(rawClue.id)) errors.push(`${base}.id duplicado`);
      clueIds.add(rawClue.id);
    }
    for (const key of ['title', 'summary', 'fullDetail', 'locationFoundId', 'legalSignificance', 'iconName'] as const) if (!isString(rawClue[key])) errors.push(`${base}.${key} ausente/inválido`);
    if (!isString(rawClue.type) || !CLUE_TYPES.has(rawClue.type)) errors.push(`${base}.type inválido`);
    if (!isString(rawClue.relevance) || !CLUE_RELEVANCE.has(rawClue.relevance)) errors.push(`${base}.relevance inválida`);
    if (!isBoolean(rawClue.isAuthentic)) errors.push(`${base}.isAuthentic inválido`);
  });

  if (!Array.isArray(value.strategies) || value.strategies.length === 0) errors.push('strategies ausente/vazio');
  else value.strategies.forEach((rawStrategy, strategyIndex) => {
    const base = `strategies[${strategyIndex}]`;
    if (!isRecord(rawStrategy)) { errors.push(`${base} inválido`); return; }
    for (const key of ['id', 'title', 'branch', 'description', 'rationale'] as const) if (!isString(rawStrategy[key])) errors.push(`${base}.${key} ausente/inválido`);
    if (!isBoolean(rawStrategy.isOptimal)) errors.push(`${base}.isOptimal inválido`);
    if (!isNumber(rawStrategy.scoreWeight)) errors.push(`${base}.scoreWeight inválido`);
    if (!isStringArray(rawStrategy.requiredCrucialClueIds)) errors.push(`${base}.requiredCrucialClueIds inválido`);
  });

  if (Array.isArray(value.availableClues)) value.availableClues.forEach((rawClue, clueIndex) => {
    if (isRecord(rawClue) && isString(rawClue.locationFoundId) && !locationIds.has(rawClue.locationFoundId)) errors.push(`availableClues[${clueIndex}].locationFoundId referencia local inexistente`);
  });
  if (Array.isArray(value.locations)) value.locations.forEach((rawLocation, locationIndex) => {
    if (!isRecord(rawLocation)) return;
    if (Array.isArray(rawLocation.searchables)) rawLocation.searchables.forEach((rawSpot, spotIndex) => {
      if (isRecord(rawSpot) && isString(rawSpot.foundClueId) && !clueIds.has(rawSpot.foundClueId)) errors.push(`locations[${locationIndex}].searchables[${spotIndex}].foundClueId referencia pista inexistente`);
    });
    if (Array.isArray(rawLocation.characters)) rawLocation.characters.forEach((rawCharacter, characterIndex) => {
      if (!isRecord(rawCharacter) || !Array.isArray(rawCharacter.dialogueOptions)) return;
      rawCharacter.dialogueOptions.forEach((rawDialog, dialogIndex) => {
        if (!isRecord(rawDialog)) return;
        if (isString(rawDialog.revealsClueId) && !clueIds.has(rawDialog.revealsClueId)) errors.push(`locations[${locationIndex}].characters[${characterIndex}].dialogueOptions[${dialogIndex}].revealsClueId referencia pista inexistente`);
        if (isString(rawDialog.unlocksLocationId) && !locationIds.has(rawDialog.unlocksLocationId)) errors.push(`locations[${locationIndex}].characters[${characterIndex}].dialogueOptions[${dialogIndex}].unlocksLocationId referencia local inexistente`);
      });
    });
    if (isString(rawLocation.requiredClueOrDialogToUnlock) && !clueIds.has(rawLocation.requiredClueOrDialogToUnlock) && !dialogueIds.has(rawLocation.requiredClueOrDialogToUnlock)) errors.push(`locations[${locationIndex}].requiredClueOrDialogToUnlock referencia inexistente`);
  });
  if (Array.isArray(value.strategies)) value.strategies.forEach((rawStrategy, strategyIndex) => {
    if (!isRecord(rawStrategy) || !Array.isArray(rawStrategy.requiredCrucialClueIds)) return;
    rawStrategy.requiredCrucialClueIds.forEach((clueId) => { if (isString(clueId) && !clueIds.has(clueId)) errors.push(`strategies[${strategyIndex}].requiredCrucialClueIds referencia pista inexistente: ${clueId}`); });
  });

  return errors;
}

export function isLegalCase(value: unknown): value is LegalCase {
  return validateLegalCase(value).length === 0;
}
