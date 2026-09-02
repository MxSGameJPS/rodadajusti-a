import type { CaseHistoryRecord, PlayerProfile, ProfessionalExamAttemptRecord } from '../types/game';

export type ProfessionalAttributeId =
  | 'LEGAL_KNOWLEDGE'
  | 'INVESTIGATION'
  | 'PERCEPTION'
  | 'PERSUASION'
  | 'INFLUENCE'
  | 'SELF_CONTROL';

export type TraitPolarity = 'positive' | 'negative' | 'mixed';

export interface ProfessionalAttributeState {
  id: ProfessionalAttributeId;
  level: number;
  xp: number;
}

export interface ProfessionalTrait {
  id: string;
  name: string;
  description: string;
  polarity: TraitPolarity;
  source: string;
  acquiredAt: string;
}

export interface ProfessionalModifier {
  id: string;
  attributeId: ProfessionalAttributeId;
  amount: number;
  label: string;
  remainingCases?: number;
}

export interface ProfessionalRpgProfile {
  version: 1;
  ownerKey: string;
  unlockedAt: string;
  source: {
    examScore: number;
    examTotalQuestions: number;
    examPercentage: number;
  };
  attributes: Record<ProfessionalAttributeId, ProfessionalAttributeState>;
  availableXp: number;
  ethics: number;
  character: number;
  exposure: number;
  traits: ProfessionalTrait[];
  modifiers: ProfessionalModifier[];
  claimedCaseKeys: string[];
}

export interface ProfessionalConsequence {
  ethicsDelta?: number;
  characterDelta?: number;
  exposureDelta?: number;
  availableXpDelta?: number;
  attributeLevelDeltas?: Partial<Record<ProfessionalAttributeId, number>>;
  attributeXpDeltas?: Partial<Record<ProfessionalAttributeId, number>>;
  addTraits?: ProfessionalTrait[];
  addModifiers?: ProfessionalModifier[];
  removeTraitIds?: string[];
}

export const ATTRIBUTE_CONFIG: Record<ProfessionalAttributeId, {
  label: string;
  shortLabel: string;
  description: string;
}> = {
  LEGAL_KNOWLEDGE: {
    label: 'Conhecimento Jurídico',
    shortLabel: 'Conhecimento',
    description: 'Domínio técnico, legislação, teses, provas, estudos e avaliações profissionais.',
  },
  INVESTIGATION: {
    label: 'Investigação',
    shortLabel: 'Investigação',
    description: 'Capacidade de encontrar pistas, documentos, conexões e caminhos probatórios.',
  },
  PERCEPTION: {
    label: 'Percepção',
    shortLabel: 'Percepção',
    description: 'Leitura de situações, contradições, riscos, intenções e comportamentos de NPCs.',
  },
  PERSUASION: {
    label: 'Persuasão',
    shortLabel: 'Persuasão',
    description: 'Argumentação, negociação, diálogo e capacidade de convencer sem garantir resultados.',
  },
  INFLUENCE: {
    label: 'Influência',
    shortLabel: 'Influência',
    description: 'Networking, acesso institucional, relacionamentos e alcance profissional.',
  },
  SELF_CONTROL: {
    label: 'Autocontrole',
    shortLabel: 'Autocontrole',
    description: 'Resistência à pressão, ameaças, impulsividade, chantagens e situações críticas.',
  },
};

export const ATTRIBUTE_ORDER = Object.keys(ATTRIBUTE_CONFIG) as ProfessionalAttributeId[];

const PLAYER_SAVE_KEY = 'rota_da_justica_save_v1';
const PROFILE_STORAGE_PREFIX = 'rota_professional_rpg_v1:';
const XP_COST_BY_LEVEL: Record<number, number> = {
  1: 100,
  2: 140,
  3: 200,
  4: 280,
  5: 380,
  6: 500,
  7: 650,
  8: 820,
  9: 1000,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function getNextAttributeLevelCost(level: number): number | null {
  if (level >= 10) return null;
  return XP_COST_BY_LEVEL[level] ?? 1000;
}

export function getProfessionalOwnerKey(player: Pick<PlayerProfile, 'cloudCareerId' | 'name'>): string {
  if (player.cloudCareerId) return `career:${player.cloudCareerId}`;
  const normalizedName = player.name.trim().toLowerCase().replace(/[^a-z0-9áàâãéêíóôõúç]+/gi, '-');
  return `local:${normalizedName || 'jogador'}`;
}

function getStorageKey(player: Pick<PlayerProfile, 'cloudCareerId' | 'name'>): string {
  return `${PROFILE_STORAGE_PREFIX}${getProfessionalOwnerKey(player)}`;
}

function caseClaimKey(history: CaseHistoryRecord): string {
  return `${history.caseId}:${history.completedDate}:${history.score}:${history.earnedXp}`;
}

function getLatestPassedOabAttempt(player: PlayerProfile): ProfessionalExamAttemptRecord | null {
  return player.professionalExamAttempts.find((attempt) => attempt.passed && Boolean(attempt.registrationCode)) ?? null;
}

function averageCaseScore(player: PlayerProfile): number {
  if (!player.history.length) return 0;
  return player.history.reduce((sum, item) => sum + item.score, 0) / player.history.length;
}

function buildInitialTrait(player: PlayerProfile, levels: Record<ProfessionalAttributeId, number>, examPercentage: number): ProfessionalTrait[] {
  const now = new Date().toISOString();
  const strongest = ATTRIBUTE_ORDER.reduce((best, current) => levels[current] > levels[best] ? current : best, 'LEGAL_KNOWLEDGE');
  const strongestTrait: Record<ProfessionalAttributeId, Omit<ProfessionalTrait, 'acquiredAt'>> = {
    LEGAL_KNOWLEDGE: {
      id: 'base-tecnica-solida',
      name: 'Base Técnica Sólida',
      description: 'Seu desempenho inicial demonstra boa segurança na fundamentação jurídica.',
      polarity: 'positive',
      source: 'Perfil definido após a OAB',
    },
    INVESTIGATION: {
      id: 'investigador-meticuloso',
      name: 'Investigador Meticuloso',
      description: 'Seu histórico mostra atenção especial à construção e conferência das provas.',
      polarity: 'positive',
      source: 'Histórico de estágio',
    },
    PERCEPTION: {
      id: 'olhar-analitico',
      name: 'Olhar Analítico',
      description: 'Você tende a perceber detalhes e inconsistências antes de tomar decisões.',
      polarity: 'positive',
      source: 'Histórico de estágio',
    },
    PERSUASION: {
      id: 'boa-argumentacao',
      name: 'Boa Argumentação',
      description: 'Sua trajetória demonstra facilidade para estruturar argumentos e negociar.',
      polarity: 'positive',
      source: 'Histórico de estágio',
    },
    INFLUENCE: {
      id: 'networking-em-formacao',
      name: 'Networking em Formação',
      description: 'Você começou a construir uma rede profissional que pode crescer ao longo da carreira.',
      polarity: 'positive',
      source: 'Reputação profissional',
    },
    SELF_CONTROL: {
      id: 'sangue-frio',
      name: 'Sangue Frio',
      description: 'Você demonstrou consistência mesmo sob pressão de prazos e avaliações.',
      polarity: 'positive',
      source: 'Perfil definido após a OAB',
    },
  };

  const traits: ProfessionalTrait[] = [{ ...strongestTrait[strongest], acquiredAt: now }];

  if (examPercentage >= 85) {
    traits.push({
      id: 'aprovacao-de-destaque',
      name: 'Aprovação de Destaque',
      description: 'Sua primeira aprovação profissional veio com desempenho técnico elevado.',
      polarity: 'positive',
      source: 'Exame da Ordem',
      acquiredAt: now,
    });
  } else if (player.casesSolved >= 4 && player.casesFailed === 0) {
    traits.push({
      id: 'historico-consistente',
      name: 'Histórico Consistente',
      description: 'Você chegou à advocacia sem derrotas registradas durante a fase de estágio.',
      polarity: 'positive',
      source: 'Histórico de estágio',
      acquiredAt: now,
    });
  }

  return traits;
}

export function createInitialProfessionalProfile(player: PlayerProfile): ProfessionalRpgProfile | null {
  if (!player.oabRegistration) return null;

  const passedAttempt = getLatestPassedOabAttempt(player);
  const examScore = passedAttempt?.score ?? player.oabRegistration.score ?? 0;
  const examTotalQuestions = passedAttempt?.totalQuestions ?? (examScore <= 20 ? 20 : 80);
  const examPercentage = examTotalQuestions > 0 ? clamp((examScore / examTotalQuestions) * 100, 0, 100) : 60;
  const ratio = examPercentage / 100;
  const examBase = clamp(2 + Math.round(ratio * 5), 3, 7);
  const avgScore = averageCaseScore(player);
  const totalCases = Math.max(1, player.casesSolved + player.casesFailed);
  const successRate = player.casesSolved / totalCases;

  const levels: Record<ProfessionalAttributeId, number> = {
    LEGAL_KNOWLEDGE: clamp(examBase + (examPercentage >= 85 ? 1 : 0), 1, 8),
    INVESTIGATION: clamp(examBase - 1 + (avgScore >= 75 ? 1 : 0) + (player.casesSolved >= 4 ? 1 : 0), 2, 8),
    PERCEPTION: clamp(examBase - 1 + (avgScore >= 85 ? 1 : 0) + (successRate >= 0.8 ? 1 : 0), 2, 8),
    PERSUASION: clamp(examBase - 2 + (player.reputation >= 35 ? 1 : 0) + (player.reputation >= 55 ? 1 : 0), 2, 8),
    INFLUENCE: clamp(2 + Math.floor(player.reputation / 25) + (player.casesSolved >= 4 ? 1 : 0), 2, 7),
    SELF_CONTROL: clamp(examBase - 1 + (player.casesFailed === 0 ? 1 : 0) + (examPercentage >= 75 ? 1 : 0), 2, 8),
  };

  const attributes = Object.fromEntries(
    ATTRIBUTE_ORDER.map((id) => [id, { id, level: levels[id], xp: 0 }]),
  ) as Record<ProfessionalAttributeId, ProfessionalAttributeState>;

  return {
    version: 1,
    ownerKey: getProfessionalOwnerKey(player),
    unlockedAt: new Date().toISOString(),
    source: {
      examScore,
      examTotalQuestions,
      examPercentage: Math.round(examPercentage * 10) / 10,
    },
    attributes,
    availableXp: 0,
    ethics: 100,
    character: 100,
    exposure: 0,
    traits: buildInitialTrait(player, levels, examPercentage),
    modifiers: [],
    claimedCaseKeys: player.history.map(caseClaimKey),
  };
}

export function loadProfessionalProfile(player: Pick<PlayerProfile, 'cloudCareerId' | 'name'>): ProfessionalRpgProfile | null {
  try {
    const raw = localStorage.getItem(getStorageKey(player));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfessionalRpgProfile;
    if (parsed?.version !== 1 || !parsed.attributes) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveProfessionalProfile(player: Pick<PlayerProfile, 'cloudCareerId' | 'name'>, profile: ProfessionalRpgProfile): void {
  localStorage.setItem(getStorageKey(player), JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent('rota:professional-profile-updated', { detail: profile }));
}

function advanceModifiersAfterCase(profile: ProfessionalRpgProfile): ProfessionalRpgProfile {
  return {
    ...profile,
    modifiers: profile.modifiers
      .map((modifier) => modifier.remainingCases == null
        ? modifier
        : { ...modifier, remainingCases: modifier.remainingCases - 1 })
      .filter((modifier) => modifier.remainingCases == null || modifier.remainingCases > 0),
  };
}

export function syncProfessionalProfileWithPlayer(player: PlayerProfile): ProfessionalRpgProfile | null {
  if (!player.oabRegistration) return null;

  let profile = loadProfessionalProfile(player);
  let changed = false;

  if (!profile) {
    profile = createInitialProfessionalProfile(player);
    if (!profile) return null;
    saveProfessionalProfile(player, profile);
    window.dispatchEvent(new CustomEvent('rota:professional-profile-unlocked', { detail: profile }));
    return profile;
  }

  const claimed = new Set(profile.claimedCaseKeys || []);
  const newHistory = player.history.filter((item) => !claimed.has(caseClaimKey(item)));

  for (const item of newHistory) {
    profile = advanceModifiersAfterCase(profile);
    profile = {
      ...profile,
      availableXp: Math.max(0, profile.availableXp + item.earnedXp),
      claimedCaseKeys: [...profile.claimedCaseKeys, caseClaimKey(item)],
    };
    changed = true;
  }

  if (changed) saveProfessionalProfile(player, profile);
  return profile;
}

export function allocateProfessionalXp(
  profile: ProfessionalRpgProfile,
  attributeId: ProfessionalAttributeId,
  requestedAmount: number,
): ProfessionalRpgProfile {
  const current = profile.attributes[attributeId];
  if (!current || current.level >= 10 || profile.availableXp <= 0) return profile;

  let amount = Math.min(Math.max(0, Math.floor(requestedAmount)), profile.availableXp);
  if (amount <= 0) return profile;

  let level = current.level;
  let xp = current.xp;
  const invested = amount;

  while (amount > 0 && level < 10) {
    const cost = getNextAttributeLevelCost(level);
    if (!cost) break;
    const missing = Math.max(0, cost - xp);
    const applied = Math.min(missing, amount);
    xp += applied;
    amount -= applied;

    if (xp >= cost) {
      level += 1;
      xp = 0;
    }
  }

  const actuallySpent = invested - amount;
  return {
    ...profile,
    availableXp: Math.max(0, profile.availableXp - actuallySpent),
    attributes: {
      ...profile.attributes,
      [attributeId]: { ...current, level, xp },
    },
  };
}

export function applyProfessionalConsequence(
  profile: ProfessionalRpgProfile,
  consequence: ProfessionalConsequence,
): ProfessionalRpgProfile {
  const nextAttributes = { ...profile.attributes };

  for (const attributeId of ATTRIBUTE_ORDER) {
    const current = nextAttributes[attributeId];
    const levelDelta = consequence.attributeLevelDeltas?.[attributeId] ?? 0;
    const xpDelta = consequence.attributeXpDeltas?.[attributeId] ?? 0;
    if (levelDelta === 0 && xpDelta === 0) continue;

    const nextLevel = clamp(current.level + levelDelta, 1, 10);
    const cost = getNextAttributeLevelCost(nextLevel);
    nextAttributes[attributeId] = {
      ...current,
      level: nextLevel,
      xp: cost == null ? 0 : clamp(current.xp + xpDelta, 0, Math.max(0, cost - 1)),
    };
  }

  const removeIds = new Set(consequence.removeTraitIds || []);
  const traits = profile.traits.filter((trait) => !removeIds.has(trait.id));
  for (const trait of consequence.addTraits || []) {
    if (!traits.some((existing) => existing.id === trait.id)) traits.push(trait);
  }

  const modifiers = [...profile.modifiers];
  for (const modifier of consequence.addModifiers || []) {
    const index = modifiers.findIndex((existing) => existing.id === modifier.id);
    if (index >= 0) modifiers[index] = modifier;
    else modifiers.push(modifier);
  }

  return {
    ...profile,
    attributes: nextAttributes,
    ethics: clamp(profile.ethics + (consequence.ethicsDelta ?? 0), 0, 100),
    character: clamp(profile.character + (consequence.characterDelta ?? 0), 0, 100),
    exposure: clamp(profile.exposure + (consequence.exposureDelta ?? 0), 0, 100),
    availableXp: Math.max(0, profile.availableXp + (consequence.availableXpDelta ?? 0)),
    traits,
    modifiers,
  };
}

export function getCharacterBand(value: number): string {
  if (value >= 81) return 'Íntegro';
  if (value >= 61) return 'Pragmático';
  if (value >= 41) return 'Questionável';
  if (value >= 21) return 'Corruptível';
  if (value >= 1) return 'Corrupto';
  return 'Sem Escrúpulos';
}

export function getEffectiveAttributeLevel(profile: ProfessionalRpgProfile, attributeId: ProfessionalAttributeId): number {
  const base = profile.attributes[attributeId]?.level ?? 1;
  const modifier = profile.modifiers
    .filter((item) => item.attributeId === attributeId)
    .reduce((sum, item) => sum + item.amount, 0);
  return clamp(base + modifier, 1, 10);
}

export function readCurrentPlayerSnapshot(): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(PLAYER_SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerProfile;
  } catch {
    return null;
  }
}
