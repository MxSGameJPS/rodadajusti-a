import type { ActiveCaseState, LegalCase, PlayerProfile } from '../types/game';

export const DEMO_LAWYER_ID = 'demo-lawyer-rafael-martins';

export function createDemoActiveCase(caseItem: LegalCase): ActiveCaseState {
  return {
    caseId: caseItem.id,
    hoursSpent: 3,
    currentLocationId: caseItem.locations[0]?.id || 'LOC_ESCRITORIO_RAMOS',
    discoveredClueIds: caseItem.availableClues.slice(0, 1).map((clue) => clue.id),
    unlockedLocationIds: caseItem.locations
      .filter((location) => location.unlockedByDefault)
      .map((location) => location.id),
    askedDialogueIds: [],
    inspectedSpotIds: [],
    logs: [
      {
        id: 'demo-crm-assignment',
        timestampGameHours: 0,
        message: `Mariana Duarte disponibilizou ${caseItem.code} no CRM por determinação do Dr. Roberto Ramos.`,
        type: 'alerta',
      },
    ],
    selectedStrategyId: null,
    selectedEvidenceIds: [],
    socialJuridicoActions: [],
  };
}

export function createDemoLawyer(caseItem: LegalCase | null): PlayerProfile {
  return {
    name: 'Rafael Martins',
    avatarSeed: 'rafael-demo',
    careerTier: 'ADVOGADO_CONTRATADO',
    academicDegree: 'BACHAREL',
    completedCourseIds: [],
    money: 18500,
    xp: 3200,
    reputation: 62,
    casesSolved: 4,
    casesFailed: 0,
    activeCase: caseItem ? createDemoActiveCase(caseItem) : null,
    history: [],
    officeFinances: {
      isOfficeOpen: false,
      officeName: 'Ramos & Associados',
      bankBalance: 18500,
      rentMonthly: 0,
      utilitiesMonthly: 0,
      adminExpensesMonthly: 0,
      employees: [],
      monthlyRevenueHistory: [],
    },
    officeDiscipline: {
      warningCount: 0,
      employmentStatus: 'ACTIVE',
      incidents: [],
    },
    officePerformance: {
      technique: 76,
      diligence: 82,
      ethics: 91,
      deadlineManagement: 78,
      supervisorTrust: 84,
      completedTaskIds: [],
      evaluations: [],
    },
    concursoCompletedPhases: [],
    professionalExamAttempts: [
      {
        attemptId: 'demo-oab-attempt',
        examSlug: '46-eou-2026-demo',
        examTitle: '46º Exame de Ordem Unificado • Simulação',
        completedDate: '05/09/2026',
        score: 58,
        totalQuestions: 80,
        passed: true,
        registrationCode: 'OAB/RS 999.999-DEMO',
      },
    ],
    oabRegistration: {
      code: 'OAB/RS 999.999-DEMO',
      examSlug: '46-eou-2026-demo',
      examTitle: '46º Exame de Ordem Unificado • Simulação',
      score: 58,
      issuedDate: '05/09/2026',
      isSimulated: true,
    },
    cloudCareerId: DEMO_LAWYER_ID,
    gameCurrentDay: 5,
    gameCurrentMonth: 9,
    gameCurrentYear: 2026,
    unlockedAchievements: ['OAB_APROVADO', 'ADVOGADO_CONTRATADO'],
    soundEnabled: true,
  };
}
