import React, { useState, useEffect } from 'react';
import {
  PlayerProfile,
  LegalCase,
  ActiveCaseState,
  CaseHistoryRecord,
  Character,
  DialogueOption,
  SearchableSpot,
  LocationScene,
  AcademicCourse,
  OfficeEmployee,
  CareerTierId,
  ProfessionalExam,
  ProfessionalExamResult,
  SocialJuridicoToolUse,
  SupervisorReview,
} from './types/game';
import { GAME_CASES } from './data/cases';
import { CAREER_TIERS, ACADEMIC_COURSES } from './data/careers';
import { HeaderBar } from './components/HeaderBar';
import { OfficeHub } from './components/OfficeHub';
import { InvestigationMap } from './components/InvestigationMap';
import { LocationScene as LocationSceneComponent } from './components/LocationScene';
import { NewGameModal } from './components/NewGameModal';
import { CaseBriefingModal } from './components/CaseBriefingModal';
import { CaseDossierModal } from './components/CaseDossierModal';
import { LegalCourtroomModal } from './components/LegalCourtroomModal';
import { VerdictModal } from './components/VerdictModal';
import { SupervisorReviewModal } from './components/SupervisorReviewModal';
import { CareerModal } from './components/CareerModal';
import { AcademicModal } from './components/AcademicModal';
import { ConcursoModal } from './components/ConcursoModal';
import { OfficeManagementModal } from './components/OfficeManagementModal';
import { OabExamModal } from './components/OabExamModal';
import { SocialJuridicoExperience } from './components/SocialJuridicoExperience';
import { InternshipCareerPanel } from './components/InternshipCareerPanel';
import { InternPromotionCeremonyModal } from './components/InternPromotionCeremonyModal';
import { evaluatePetition } from './lib/judicialDecisionEngine';
import { buildSupervisorReview } from './lib/officeDisciplineEngine';
import {
  DEFAULT_OFFICE_PERFORMANCE,
  applyCasePerformance,
  completeOfficeTask,
  getInternPromotionStatus,
  normalizeOfficePerformance,
} from './lib/internCareerEngine';
import { sound } from './utils/sound';

const STORAGE_KEY = 'rota_da_justica_save_v1';

const INITIAL_PLAYER_STATE: PlayerProfile = {
  name: '',
  avatarSeed: 'gabriel',
  careerTier: 'ESTAGIARIO',
  academicDegree: 'GRADUANDO',
  completedCourseIds: [],
  money: 1200,
  xp: 0,
  reputation: 15,
  casesSolved: 0,
  casesFailed: 0,
  activeCase: null,
  history: [],
  officeFinances: {
    isOfficeOpen: false,
    officeName: 'Sociedade de Advocacia',
    bankBalance: 1200,
    rentMonthly: 2400,
    utilitiesMonthly: 890,
    adminExpensesMonthly: 500,
    employees: [],
    monthlyRevenueHistory: [],
  },
  officeDiscipline: {
    warningCount: 0,
    employmentStatus: 'ACTIVE',
    incidents: [],
  },
  officePerformance: DEFAULT_OFFICE_PERFORMANCE,
  concursoCompletedPhases: [],
  professionalExamAttempts: [],
  oabRegistration: null,
  cloudCareerId: null,
  gameCurrentDay: 2,
  gameCurrentMonth: 3,
  gameCurrentYear: 2026,
  unlockedAchievements: [],
  soundEnabled: true,
};

function normalizeSavedPlayer(saved: Partial<PlayerProfile>): PlayerProfile {
  return {
    ...INITIAL_PLAYER_STATE,
    ...saved,
    activeCase: saved.activeCase
      ? {
          ...saved.activeCase,
          socialJuridicoActions: Array.isArray(saved.activeCase.socialJuridicoActions)
            ? saved.activeCase.socialJuridicoActions
            : [],
        }
      : null,
    completedCourseIds: Array.isArray(saved.completedCourseIds) ? saved.completedCourseIds : [],
    history: Array.isArray(saved.history) ? saved.history : [],
    concursoCompletedPhases: Array.isArray(saved.concursoCompletedPhases)
      ? saved.concursoCompletedPhases
      : [],
    professionalExamAttempts: Array.isArray(saved.professionalExamAttempts)
      ? saved.professionalExamAttempts
      : [],
    oabRegistration: saved.oabRegistration || null,
    cloudCareerId: saved.cloudCareerId || null,
    officeFinances: {
      ...INITIAL_PLAYER_STATE.officeFinances,
      ...(saved.officeFinances || {}),
      employees: Array.isArray(saved.officeFinances?.employees)
        ? saved.officeFinances!.employees
        : [],
      monthlyRevenueHistory: Array.isArray(saved.officeFinances?.monthlyRevenueHistory)
        ? saved.officeFinances!.monthlyRevenueHistory
        : [],
    },
    officeDiscipline: {
      ...INITIAL_PLAYER_STATE.officeDiscipline,
      ...(saved.officeDiscipline || {}),
      incidents: Array.isArray(saved.officeDiscipline?.incidents)
        ? saved.officeDiscipline!.incidents
        : [],
    },
    officePerformance: normalizeOfficePerformance(saved.officePerformance),
  };
}

export default function App() {
  const [player, setPlayer] = useState<PlayerProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return normalizeSavedPlayer(JSON.parse(saved));
    } catch {
      // ignore invalid local cache
    }
    return INITIAL_PLAYER_STATE;
  });

  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'HUB' | 'INVESTIGATION_MAP' | 'LOCATION_SCENE'>('HUB');

  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState<boolean>(!player.name);
  const [selectedCaseToBrief, setSelectedCaseToBrief] = useState<LegalCase | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [isCourtroomOpen, setIsCourtroomOpen] = useState<boolean>(false);
  const [isCareerModalOpen, setIsCareerModalOpen] = useState<boolean>(false);
  const [isAcademicModalOpen, setIsAcademicModalOpen] = useState<boolean>(false);
  const [isConcursoModalOpen, setIsConcursoModalOpen] = useState<boolean>(false);
  const [isOfficeModalOpen, setIsOfficeModalOpen] = useState<boolean>(false);
  const [isOabExamOpen, setIsOabExamOpen] = useState<boolean>(false);

  const [verdictResult, setVerdictResult] = useState<CaseHistoryRecord | null>(null);
  const [verdictCase, setVerdictCase] = useState<LegalCase | null>(null);
  const [promotedTierAnnouncement, setPromotedTierAnnouncement] = useState<CareerTierId | null>(null);
  const [pendingSupervisorReview, setPendingSupervisorReview] = useState<SupervisorReview | null>(null);
  const [isInternPromotionCeremonyOpen, setIsInternPromotionCeremonyOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
    } catch {
      // ignore
    }
  }, [player]);

  const activeCaseData = GAME_CASES.find((c) => c.id === player.activeCase?.caseId) || null;

  const handleStartNewGame = (name: string) => {
    const freshProfile: PlayerProfile = {
      ...INITIAL_PLAYER_STATE,
      name,
      money: 1200,
      xp: 0,
      reputation: 15,
      careerTier: 'ESTAGIARIO',
      officeFinances: {
        ...INITIAL_PLAYER_STATE.officeFinances,
        officeName: `${name} Advocacia & Consultoria`,
      },
      officeDiscipline: {
        warningCount: 0,
        employmentStatus: 'ACTIVE',
        incidents: [],
      },
      officePerformance: { ...DEFAULT_OFFICE_PERFORMANCE, completedTaskIds: [], evaluations: [] },
    };
    setPlayer(freshProfile);
    setIsNewGameModalOpen(false);
    setSelectedCaseToBrief(GAME_CASES[0]);
  };

  const handleAcceptCase = (caseItem: LegalCase) => {
    const initialState: ActiveCaseState = {
      caseId: caseItem.id,
      hoursSpent: 0,
      currentLocationId: caseItem.locations[0]?.id || 'LOC_ESCRITORIO_RAMOS',
      discoveredClueIds: [],
      unlockedLocationIds: caseItem.locations.filter((l) => l.unlockedByDefault).map((l) => l.id),
      askedDialogueIds: [],
      inspectedSpotIds: [],
      logs: [
        {
          id: `log-${Date.now()}`,
          timestampGameHours: 0,
          message: `Início do atendimento: ${caseItem.title}`,
          type: 'alerta',
        },
      ],
      selectedStrategyId: null,
      selectedEvidenceIds: [],
      socialJuridicoActions: [],
    };

    setPlayer((prev) => ({ ...prev, activeCase: initialState }));
    setSelectedCaseToBrief(null);
    setCurrentView('INVESTIGATION_MAP');
  };

  const handleTravelToLocation = (loc: LocationScene) => {
    if (!player.activeCase || !activeCaseData) return;

    const newHoursSpent = player.activeCase.hoursSpent + loc.travelTimeHours;
    const newMoney = Math.max(0, player.money - loc.travelCost);

    setPlayer((prev) => {
      if (!prev.activeCase) return prev;
      return {
        ...prev,
        money: newMoney,
        activeCase: {
          ...prev.activeCase,
          hoursSpent: newHoursSpent,
          currentLocationId: loc.id,
          logs: [
            ...prev.activeCase.logs,
            {
              id: `log-${Date.now()}`,
              timestampGameHours: newHoursSpent,
              message: `Deslocamento para ${loc.name} (+${loc.travelTimeHours}h, -R$ ${loc.travelCost})`,
              type: 'viagem',
            },
          ],
        },
      };
    });

    setCurrentView('LOCATION_SCENE');
  };

  const handleAskQuestion = (character: Character, option: DialogueOption) => {
    if (!player.activeCase) return;

    sound.playPaper();
    const additionalHours = Math.ceil(option.timeCostMinutes / 60);
    const newHoursSpent = player.activeCase.hoursSpent + additionalHours;

    const updatedDiscoveredClues = [...player.activeCase.discoveredClueIds];
    const updatedUnlockedLocations = [...player.activeCase.unlockedLocationIds];

    if (option.revealsClueId && !updatedDiscoveredClues.includes(option.revealsClueId)) {
      updatedDiscoveredClues.push(option.revealsClueId);
      sound.playClueFound();
    }

    if (option.unlocksLocationId && !updatedUnlockedLocations.includes(option.unlocksLocationId)) {
      updatedUnlockedLocations.push(option.unlocksLocationId);
    }

    const updatedAskedDialogues = player.activeCase.askedDialogueIds.includes(option.id)
      ? player.activeCase.askedDialogueIds
      : [...player.activeCase.askedDialogueIds, option.id];

    setPlayer((prev) => {
      if (!prev.activeCase) return prev;
      return {
        ...prev,
        activeCase: {
          ...prev.activeCase,
          hoursSpent: newHoursSpent,
          discoveredClueIds: updatedDiscoveredClues,
          unlockedLocationIds: updatedUnlockedLocations,
          askedDialogueIds: updatedAskedDialogues,
          logs: [
            ...prev.activeCase.logs,
            {
              id: `log-${Date.now()}`,
              timestampGameHours: newHoursSpent,
              message: `Depoimento de ${character.name}: "${option.question}"`,
              type: 'depoimento',
            },
          ],
        },
      };
    });
  };

  const handleInspectSpot = (spot: SearchableSpot) => {
    if (!player.activeCase) return;

    sound.playPaper();
    const additionalHours = Math.ceil(spot.timeCostMinutes / 60);
    const newHoursSpent = player.activeCase.hoursSpent + additionalHours;

    const updatedDiscoveredClues = [...player.activeCase.discoveredClueIds];
    if (spot.foundClueId && !updatedDiscoveredClues.includes(spot.foundClueId)) {
      updatedDiscoveredClues.push(spot.foundClueId);
      sound.playClueFound();
    }

    const updatedInspected = player.activeCase.inspectedSpotIds.includes(spot.id)
      ? player.activeCase.inspectedSpotIds
      : [...player.activeCase.inspectedSpotIds, spot.id];

    setPlayer((prev) => {
      if (!prev.activeCase) return prev;
      return {
        ...prev,
        activeCase: {
          ...prev.activeCase,
          hoursSpent: newHoursSpent,
          discoveredClueIds: updatedDiscoveredClues,
          inspectedSpotIds: updatedInspected,
          logs: [
            ...prev.activeCase.logs,
            {
              id: `log-${Date.now()}`,
              timestampGameHours: newHoursSpent,
              message: `Perícia no ponto "${spot.name}" (+${spot.timeCostMinutes}min)`,
              type: 'analise',
            },
          ],
        },
      };
    });
  };

  const handleUseSocialJuridicoTool = (tool: SocialJuridicoToolUse) => {
    setPlayer((prev) => {
      if (!prev.activeCase) return prev;

      const existingActions = Array.isArray(prev.activeCase.socialJuridicoActions)
        ? prev.activeCase.socialJuridicoActions
        : [];
      const duplicate = existingActions.some((action) =>
        action.featureId === tool.featureId && (tool.targetId ? action.targetId === tool.targetId : !action.targetId),
      );
      if (duplicate) return prev;

      const safeTimeCost = Math.max(0, Number(tool.timeCostHours) || 0);
      const nextHours = prev.activeCase.hoursSpent + safeTimeCost;
      const actionId = `sj-${tool.featureId}-${Date.now()}`;

      return {
        ...prev,
        activeCase: {
          ...prev.activeCase,
          hoursSpent: nextHours,
          socialJuridicoActions: [
            ...existingActions,
            {
              id: actionId,
              featureId: tool.featureId,
              targetId: tool.targetId,
              label: tool.label,
              scoreBonus: Math.max(0, Number(tool.scoreBonus) || 0),
              timeCostHours: safeTimeCost,
              timestampGameHours: nextHours,
            },
          ],
          logs: [
            ...prev.activeCase.logs,
            {
              id: `log-${actionId}`,
              timestampGameHours: nextHours,
              message: `Social Jurídico: ${tool.label}${safeTimeCost > 0 ? ` (+${safeTimeCost}h)` : ''}`,
              type: 'analise',
            },
          ],
        },
      };
    });
  };

  const handleCompleteOfficeTask = (taskId: string) => {
    if (player.activeCase) return;

    const completedDate = `${String(player.gameCurrentDay).padStart(2, '0')}/${String(player.gameCurrentMonth).padStart(2, '0')}/${player.gameCurrentYear}`;
    const { performance, task } = completeOfficeTask({
      current: player.officePerformance,
      careerTier: player.careerTier,
      taskId,
      completedDate,
    });

    if (!task) return;

    const nextXp = player.xp + task.xpReward;
    const nextMoney = player.money + task.moneyReward;
    let nextTier = player.careerTier;

    if (player.careerTier === 'ESTAGIARIO') {
      const promotion = getInternPromotionStatus({
        casesSolved: player.casesSolved,
        xp: nextXp,
        performance,
        discipline: player.officeDiscipline,
      });
      if (promotion.eligible) nextTier = 'ESTAGIARIO_SENIOR';
    }

    setPlayer((prev) => ({
      ...prev,
      xp: nextXp,
      money: nextMoney,
      careerTier: nextTier,
      officePerformance: performance,
      gameCurrentDay: prev.gameCurrentDay + 1,
    }));

    if (nextTier === 'ESTAGIARIO_SENIOR' && player.careerTier === 'ESTAGIARIO') {
      setPromotedTierAnnouncement('ESTAGIARIO_SENIOR');
      setIsInternPromotionCeremonyOpen(true);
    }
  };

  const handleSubmitPetition = (strategyId: string, selectedEvidenceIds: string[]) => {
    if (!player.activeCase || !activeCaseData) return;

    setIsCourtroomOpen(false);

    const socialJuridicoBonus = Math.min(
      10,
      (player.activeCase.socialJuridicoActions || []).reduce(
        (sum, action) => sum + Math.max(0, action.scoreBonus || 0),
        0,
      ),
    );

    const decision = evaluatePetition({
      currentCase: activeCaseData,
      activeState: player.activeCase,
      strategyId,
      selectedEvidenceIds,
      socialJuridicoBonus,
    });

    const completedDate = `${String(player.gameCurrentDay).padStart(2, '0')}/${String(player.gameCurrentMonth).padStart(2, '0')}/${player.gameCurrentYear}`;
    const { review: supervisorReview, discipline: nextDiscipline } = buildSupervisorReview({
      decision,
      caseId: activeCaseData.id,
      caseTitle: activeCaseData.title,
      completedDate,
      currentDiscipline: player.officeDiscipline,
    });

    let earnedXp = 0;
    let earnedMoney = 0;
    let earnedReputation = 0;

    if (decision.success) {
      sound.playVictory();
      earnedXp = activeCaseData.xpReward;
      earnedMoney = activeCaseData.honorariosReward;
      earnedReputation = activeCaseData.reputationReward;
    } else {
      sound.playFailure();
      earnedXp = Math.round(activeCaseData.xpReward * 0.25);
      earnedMoney = 0;
      earnedReputation = supervisorReview?.severity === 'GRAVE'
        ? -15
        : supervisorReview?.severity === 'ADVERTENCIA'
          ? -10
          : -6;
    }

    const newSolvedCount = decision.success ? player.casesSolved + 1 : player.casesSolved;
    const newFailedCount = !decision.success ? player.casesFailed + 1 : player.casesFailed;
    const nextXp = player.xp + earnedXp;
    const nextOfficePerformance = applyCasePerformance({
      current: player.officePerformance,
      assessment: decision.assessment,
      success: decision.success,
      supervisorReview,
      caseId: activeCaseData.id,
      caseTitle: activeCaseData.title,
      completedDate,
    });

    let newTier = player.careerTier;
    let promotionAnnouncement: CareerTierId | null = null;

    if (newSolvedCount >= 14 && player.careerTier === 'ADVOGADO_SENIOR') {
      newTier = 'SOCIO_ESCRITORIO';
      promotionAnnouncement = 'SOCIO_ESCRITORIO';
    } else if (newSolvedCount >= 9 && player.careerTier === 'ADVOGADO_CONTRATADO') {
      newTier = 'ADVOGADO_SENIOR';
      promotionAnnouncement = 'ADVOGADO_SENIOR';
    } else if (player.careerTier === 'ESTAGIARIO') {
      const promotion = getInternPromotionStatus({
        casesSolved: newSolvedCount,
        xp: nextXp,
        performance: nextOfficePerformance,
        discipline: nextDiscipline,
      });
      if (promotion.eligible) {
        newTier = 'ESTAGIARIO_SENIOR';
        promotionAnnouncement = 'ESTAGIARIO_SENIOR';
      }
    }

    const resultRecord: CaseHistoryRecord = {
      caseId: activeCaseData.id,
      caseTitle: activeCaseData.title,
      completedDate,
      success: decision.success,
      score: decision.score,
      verdict: decision.verdict,
      earnedXp,
      earnedMoney,
      earnedReputation,
      hoursUsed: player.activeCase.hoursSpent,
      totalAllowedHours: activeCaseData.deadlineHours,
      judgeFeedback: decision.feedback,
      socialJuridicoBonus,
      judicialAssessment: decision.assessment,
      supervisorReview: supervisorReview || undefined,
    };

    setVerdictCase(activeCaseData);
    setVerdictResult(resultRecord);
    setPromotedTierAnnouncement(promotionAnnouncement);

    setPlayer((prev) => ({
      ...prev,
      money: prev.money + earnedMoney,
      xp: nextXp,
      reputation: Math.max(0, Math.min(100, prev.reputation + earnedReputation)),
      casesSolved: newSolvedCount,
      casesFailed: newFailedCount,
      careerTier: newTier,
      activeCase: null,
      history: [resultRecord, ...prev.history],
      officeDiscipline: nextDiscipline,
      officePerformance: nextOfficePerformance,
      gameCurrentDay: prev.gameCurrentDay + 3,
    }));
  };

  const handleOabExamComplete = (result: ProfessionalExamResult, exam: ProfessionalExam) => {
    const completedDate = `${String(player.gameCurrentDay).padStart(2, '0')}/${String(
      player.gameCurrentMonth
    ).padStart(2, '0')}/${player.gameCurrentYear}`;

    setPlayer((prev) => {
      const attemptExists = prev.professionalExamAttempts.some(
        (attempt) => attempt.attemptId === result.attemptId
      );

      const attempts = attemptExists
        ? prev.professionalExamAttempts
        : [
            {
              attemptId: result.attemptId,
              examSlug: exam.slug,
              examTitle: exam.title,
              completedDate,
              score: result.score,
              totalQuestions: result.totalQuestions,
              passed: result.passed,
              registrationCode: result.registrationCode,
            },
            ...prev.professionalExamAttempts,
          ];

      if (!result.passed || !result.registrationCode) {
        return { ...prev, professionalExamAttempts: attempts };
      }

      return {
        ...prev,
        careerTier:
          prev.careerTier === 'ESTAGIARIO_SENIOR' ? 'ADVOGADO_CONTRATADO' : prev.careerTier,
        professionalExamAttempts: attempts,
        oabRegistration:
          prev.oabRegistration || {
            code: result.registrationCode,
            examSlug: exam.slug,
            examTitle: exam.title,
            score: result.score,
            issuedDate: completedDate,
            isSimulated: true,
          },
      };
    });
  };

  const handleEnrollCourse = (course: AcademicCourse) => {
    if (player.money < course.cost) return;

    setPlayer((prev) => ({
      ...prev,
      money: prev.money - course.cost,
      xp: prev.xp + course.xpReward,
      reputation: Math.min(100, prev.reputation + course.reputationReward),
      academicDegree: course.degree,
      completedCourseIds: [...prev.completedCourseIds, course.id],
      gameCurrentMonth:
        prev.gameCurrentMonth + course.durationMonths > 12
          ? (prev.gameCurrentMonth + course.durationMonths) % 12 || 12
          : prev.gameCurrentMonth + course.durationMonths,
      gameCurrentYear:
        prev.gameCurrentYear + Math.floor((prev.gameCurrentMonth + course.durationMonths - 1) / 12),
    }));
  };

  const handlePassConcursoPhase = (phaseId: string) => {
    const updatedPhases = player.concursoCompletedPhases.includes(phaseId)
      ? player.concursoCompletedPhases
      : [...player.concursoCompletedPhases, phaseId];

    let newTier = player.careerTier;
    if (updatedPhases.length === 3) newTier = 'MAGISTRADO_SUBSTITUTO';

    setPlayer((prev) => ({
      ...prev,
      concursoCompletedPhases: updatedPhases,
      careerTier: newTier,
      xp: prev.xp + 500,
      reputation: Math.min(100, prev.reputation + 15),
    }));
  };

  const handleHireEmployee = (employee: OfficeEmployee) => {
    setPlayer((prev) => ({
      ...prev,
      officeFinances: {
        ...prev.officeFinances,
        employees: [...prev.officeFinances.employees, employee],
      },
    }));
  };

  const handleFireEmployee = (employeeId: string) => {
    setPlayer((prev) => ({
      ...prev,
      officeFinances: {
        ...prev.officeFinances,
        employees: prev.officeFinances.employees.filter((e) => e.id !== employeeId),
      },
    }));
  };

  const handlePayOfficeExpenses = () => {
    const totalSalaries = player.officeFinances.employees.reduce(
      (acc, emp) => acc + emp.salaryMonthly,
      0
    );
    const totalFixedCosts =
      player.officeFinances.rentMonthly +
      player.officeFinances.utilitiesMonthly +
      player.officeFinances.adminExpensesMonthly +
      totalSalaries;

    if (player.money < totalFixedCosts) return;

    setPlayer((prev) => ({
      ...prev,
      money: prev.money - totalFixedCosts,
      reputation: Math.min(100, prev.reputation + 3),
      gameCurrentMonth: prev.gameCurrentMonth === 12 ? 1 : prev.gameCurrentMonth + 1,
      gameCurrentYear: prev.gameCurrentMonth === 12 ? prev.gameCurrentYear + 1 : prev.gameCurrentYear,
    }));
  };

  const handleToggleSound = () => {
    const nextVal = !player.soundEnabled;
    sound.setMuted(!nextVal);
    setPlayer((prev) => ({ ...prev, soundEnabled: nextVal }));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] flex flex-col items-center justify-start antialiased selection:bg-[#C5A059]/30 selection:text-[#C5A059]">
      <div
        className={`w-full transition-all duration-300 ${
          isMobileFrame
            ? 'max-w-[440px] my-4 rounded-[36px] border-4 border-[#2A2A2E] shadow-2xl ring-1 ring-[#3A3A42] overflow-hidden min-h-[850px] bg-[#0A0A0B]'
            : 'max-w-7xl mx-auto min-h-screen flex flex-col'
        }`}
      >
        <HeaderBar
          player={player}
          isMobileFrame={isMobileFrame}
          setIsMobileFrame={setIsMobileFrame}
          onOpenCareerModal={() => setIsCareerModalOpen(true)}
          onOpenAcademicModal={() => setIsAcademicModalOpen(true)}
          onOpenConcursoModal={() => setIsConcursoModalOpen(true)}
          onOpenOfficeModal={() => setIsOfficeModalOpen(true)}
          onToggleSound={handleToggleSound}
        />

        <main className="flex-1 p-3 sm:p-5 flex flex-col">
          {currentView === 'HUB' && (
            <>
              <InternshipCareerPanel player={player} onCompleteTask={handleCompleteOfficeTask} />
              <OfficeHub
                player={player}
                onSelectCaseToView={(c) => setSelectedCaseToBrief(c)}
                onResumeActiveCase={() => setCurrentView('INVESTIGATION_MAP')}
                onOpenCareerModal={() => setIsCareerModalOpen(true)}
                onOpenAcademicModal={() => setIsAcademicModalOpen(true)}
                onOpenConcursoModal={() => setIsConcursoModalOpen(true)}
                onOpenOfficeModal={() => setIsOfficeModalOpen(true)}
                onOpenOabExam={() => setIsOabExamOpen(true)}
              />
            </>
          )}

          {currentView === 'INVESTIGATION_MAP' && activeCaseData && player.activeCase && (
            <InvestigationMap
              currentCase={activeCaseData}
              activeState={player.activeCase}
              onTravelToLocation={handleTravelToLocation}
              onOpenDossier={() => setIsDossierOpen(true)}
              onOpenCourtroom={() => setIsCourtroomOpen(true)}
            />
          )}

          {currentView === 'LOCATION_SCENE' && activeCaseData && player.activeCase && (
            <LocationSceneComponent
              currentCase={activeCaseData}
              activeState={player.activeCase}
              onAskQuestion={handleAskQuestion}
              onInspectSpot={handleInspectSpot}
              onBackToMap={() => setCurrentView('INVESTIGATION_MAP')}
              onOpenDossier={() => setIsDossierOpen(true)}
            />
          )}
        </main>
      </div>

      <NewGameModal isOpen={isNewGameModalOpen} onStartNewGame={handleStartNewGame} />

      {selectedCaseToBrief && (
        <CaseBriefingModal
          isOpen={!!selectedCaseToBrief}
          onClose={() => setSelectedCaseToBrief(null)}
          caseData={selectedCaseToBrief}
          player={player}
          onAcceptCase={handleAcceptCase}
        />
      )}

      {activeCaseData && player.activeCase && (
        <CaseDossierModal
          isOpen={isDossierOpen}
          onClose={() => setIsDossierOpen(false)}
          currentCase={activeCaseData}
          activeState={player.activeCase}
        />
      )}

      {activeCaseData && player.activeCase && (
        <LegalCourtroomModal
          isOpen={isCourtroomOpen}
          onClose={() => setIsCourtroomOpen(false)}
          currentCase={activeCaseData}
          activeState={player.activeCase}
          careerTier={player.careerTier}
          onSubmitPetition={handleSubmitPetition}
        />
      )}

      {verdictResult && verdictCase && (
        <VerdictModal
          isOpen={!!verdictResult}
          onClose={() => {
            setVerdictResult(null);
            setVerdictCase(null);
            setPromotedTierAnnouncement(null);
          }}
          result={verdictResult}
          currentCase={verdictCase}
          player={player}
          promotedToTier={promotedTierAnnouncement}
          onNextCaseOrHub={() => {
            const review = verdictResult.supervisorReview || null;
            const promotion = promotedTierAnnouncement;
            setVerdictResult(null);
            setVerdictCase(null);
            setPromotedTierAnnouncement(null);
            setCurrentView('HUB');
            if (promotion === 'ESTAGIARIO_SENIOR') {
              setIsInternPromotionCeremonyOpen(true);
            } else if (review) {
              setPendingSupervisorReview(review);
            }
          }}
        />
      )}

      <SupervisorReviewModal
        isOpen={!!pendingSupervisorReview}
        review={pendingSupervisorReview}
        onClose={() => setPendingSupervisorReview(null)}
      />

      <InternPromotionCeremonyModal
        isOpen={isInternPromotionCeremonyOpen}
        playerName={player.name || 'Colega'}
        onClose={() => setIsInternPromotionCeremonyOpen(false)}
      />

      <CareerModal
        isOpen={isCareerModalOpen}
        onClose={() => setIsCareerModalOpen(false)}
        player={player}
      />

      <AcademicModal
        isOpen={isAcademicModalOpen}
        onClose={() => setIsAcademicModalOpen(false)}
        player={player}
        onEnrollCourse={handleEnrollCourse}
      />

      <ConcursoModal
        isOpen={isConcursoModalOpen}
        onClose={() => setIsConcursoModalOpen(false)}
        player={player}
        onPassPhase={handlePassConcursoPhase}
      />

      <OfficeManagementModal
        isOpen={isOfficeModalOpen}
        onClose={() => setIsOfficeModalOpen(false)}
        player={player}
        onHireEmployee={handleHireEmployee}
        onFireEmployee={handleFireEmployee}
        onPayOfficeExpenses={handlePayOfficeExpenses}
      />

      <OabExamModal
        isOpen={isOabExamOpen}
        onClose={() => setIsOabExamOpen(false)}
        player={player}
        onComplete={handleOabExamComplete}
      />

      <SocialJuridicoExperience
        player={player}
        currentCase={activeCaseData}
        onUseTool={handleUseSocialJuridicoTool}
      />
    </div>
  );
}
