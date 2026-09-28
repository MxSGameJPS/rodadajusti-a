export type AcademicTrackId = 'MESTRADO' | 'DOUTORADO';
export type SpecialCareerId = 'MINISTRO_STF' | 'MINISTRO_STE' | 'MINISTRO_JUSTICA' | 'PGR';

export const CAREER_LEVEL_SUMMARY = {
  internship: {
    label: 'Estágio',
    levels: ['Estagiário de Direito', 'Estagiário Sênior'],
  },
  advocacy: {
    label: 'Advocacia',
    levels: ['Advogado Contratado', 'Advogado Sênior', 'Sócio do Escritório'],

  },
};

export const ACADEMIC_TRACKS = {
  MESTRADO: {
    id: 'MESTRADO' as const,
    label: 'Mestrado',
    maxLevel: 5,
    questionsPerExam: 40,
    description: 'Progressão acadêmica em cinco níveis. Cada avaliação publicada pelo Admin possui 40 questões.',
  },
  DOUTORADO: {
    id: 'DOUTORADO' as const,
    label: 'Doutorado',
    maxLevel: 5,
    questionsPerExam: 40,
    description: 'Progressão acadêmica avançada em cinco níveis. Cada avaliação publicada pelo Admin possui 40 questões.',
  },
};

export const PUBLIC_EXAM_RULES = {
  JUIZ: {
    label: 'Concurso para Juiz',
    examType: 'concurso_juiz',
    questions: 20,
    minLegalPracticeYears: 3,
    requirementText: '3 anos de atividade jurídica',
  },
  PROMOTOR: {
    label: 'Concurso para Promotor de Justiça',
    examType: 'concurso_promotor',
    questions: 20,
    minLegalPracticeYears: 3,
    requirementText: '3 anos de atividade jurídica',
  },
};

export const SPECIAL_CAREER_RULES = [
  {
    id: 'MINISTRO_STF' as SpecialCareerId,
    label: 'Ministro do STF',
    minMasterLevel: 4,
    minReputation: 86,
    termYears: 5,
    endBehavior: 'Após 5 anos, o jogo pergunta se o personagem deseja se aposentar.',
    nextPossibilities: [] as string[],
  },
  {
    id: 'MINISTRO_STE' as SpecialCareerId,
    label: 'Ministro do STE',
    minMasterLevel: 4,
    minReputation: 86,
    termYears: 5,
    endBehavior: 'Após 5 anos, dependendo da reputação, pode receber convite para o STF.',
    nextPossibilities: ['MINISTRO_STF'],
  },
  {
    id: 'MINISTRO_JUSTICA' as SpecialCareerId,
    label: 'Ministro da Justiça',
    minMasterLevel: 4,
    minReputation: 56,
    termYears: 4,
    endBehavior: 'Após no máximo 4 anos, retorna à rotina como advogado mantendo sua progressão acadêmica.',
    nextPossibilities: ['MINISTRO_STF', 'MINISTRO_STE'],
  },
  {
    id: 'PGR' as SpecialCareerId,
    label: 'Procurador-Geral da República',
    minMasterLevel: 3,
    minReputation: 86,
    termYears: 5,
    endBehavior: 'Após 5 anos no cargo, o personagem se aposenta.',
    nextPossibilities: [] as string[],
  },
];

export function isPublicExamEligible(legalPracticeMonths: number) {
  return legalPracticeMonths >= 36;
}

export function isSpecialCareerEligible(
  rule: (typeof SPECIAL_CAREER_RULES)[number],
  masterLevel: number,
  reputation: number,
) {
  return masterLevel >= rule.minMasterLevel && reputation >= rule.minReputation;
}
