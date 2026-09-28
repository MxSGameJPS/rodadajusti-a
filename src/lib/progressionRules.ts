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
  { id: 'MINISTRO_STF' as SpecialCareerId, label: 'Ministro do STF', minMasterLevel: 0, minReputation: 94, termYears: null, endBehavior: 'Cargo de cúpula acessível apenas por evento próprio de indicação e nomeação.', nextPossibilities: [] as string[] },
  { id: 'MINISTRO_STE' as SpecialCareerId, label: 'Ministro do TSE', minMasterLevel: 0, minReputation: 90, termYears: null, endBehavior: 'Composição e investidura são tratadas como evento institucional próprio, não como promoção comum.', nextPossibilities: [] as string[] },
  { id: 'MINISTRO_JUSTICA' as SpecialCareerId, label: 'Ministro da Justiça', minMasterLevel: 0, minReputation: 82, termYears: null, endBehavior: 'Função política tratada como convite/nomeação temporária, sem progressão automática.', nextPossibilities: [] as string[] },
  { id: 'PGR' as SpecialCareerId, label: 'Procurador-Geral da República', minMasterLevel: 0, minReputation: 90, termYears: null, endBehavior: 'Chefia institucional tratada por evento de nomeação e aprovação, não como promoção automática.', nextPossibilities: [] as string[] },
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
