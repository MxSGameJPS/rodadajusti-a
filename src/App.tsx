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
import { CareerModal } from './components/CareerModal';
import { AcademicModal } from './components/AcademicModal';
import { ConcursoModal } from './components/ConcursoModal';
import { OfficeManagementModal } from './components/OfficeManagementModal';
import { OabExamModal } from './components/OabExamModal';
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

  const handleSubmitPetition = (strategyId: string, selectedEvidenceIds: string[]) => {
    if (!player.activeCase || !activeCaseData) return;

    setIsCourtroomOpen(false);

    const chosenStrategy = activeCaseData.strategies.find((s) => s.id === strategyId);
    let totalScore = 0;

    if (chosenStrategy?.isOptimal) totalScore += 50;
    else totalScore += (chosenStrategy?.scoreWeight || 20) * 0.5;

    const crucialCluesInCase = activeCaseData.availableClues.filter((c) => c.relevance === 'crucial');
    const crucialSelected = selectedEvidenceIds.filter((id) =>
      crucialCluesInCase.some((c) => c.id === id)
    );
    const evidenceRatio = crucialCluesInCase.length > 0
      ? crucialSelected.length / crucialCluesInCase.length
      : 1;
    totalScore += Math.round(evidenceRatio * 40);

    if (player.activeCase.hoursSpent <= activeCaseData.deadlineHours) totalScore += 10;
    else totalScore += 2;

    const isSuccess = totalScore >= activeCaseData.minimumPassingScore;
    const verdict: 'PROCEDENTE' | 'PARCIALMENTE PROCEDENTE' | 'IMPROCEDENTE' = isSuccess
      ? 'PROCEDENTE'
      : totalScore >= 50
      ? 'PARCIALMENTE PROCEDENTE'
      : 'IMPROCEDENTE';

    let earnedXp = 0;
    let earnedMoney = 0;
    let earnedReputation = 0;
    let feedback = '';

    if (isSuccess) {
      sound.playVictory();
      earnedXp = activeCaseData.xpReward;
      earnedMoney = activeCaseData.honorariosReward;
      earnedReputation = activeCaseData.reputationReward;
      feedback = 'Vistos, etc. Diante do robusto acervo probatório pré-constituído e da acertada fundamentação legal requerida pela parte autora, JULGO TOTALMENTE PROCEDENTE a pretensão formulada, deferindo de plano a tutela de urgência antecipada e condenando a parte ré em custas e honorários advocatícios.';
    } else {
      sound.playFailure();
      earnedXp = Math.round(activeCaseData.xpReward * 0.25);
      earnedMoney = 0;
      earnedReputation = -8;
      feedback = 'Vistos, etc. A parte autora não logrou êxito em demonstrar a verossimilhança de suas alegações, carecendo os autos de elementos de convicção indispensáveis à declaração do direito pretendido. JULGO IMPROCEDENTE o pedido.';
    }

    const newSolvedCount = isSuccess ? player.casesSolved + 1 : player.casesSolved;
    const newFailedCount = !isSuccess ? player.casesFailed + 1 : player.casesFailed;

    let newTier = player.careerTier;
    let promotionAnnouncement: CareerTierId | null = null;

    if (newSolvedCount >= 14 && player.careerTier === 'ADVOGADO_SENIOR') {
      newTier = 'SOCIO_ESCRITORIO';
      promotionAnnouncement = 'SOCIO_ESCRITORIO';
    } else if (newSolvedCount >= 9 && player.careerTier === 'ADVOGADO_CONTRATADO') {
      newTier = 'ADVOGADO_SENIOR';
      promotionAnnouncement = 'ADVOGADO_SENIOR';
    } else if (newSolvedCount >= 2 && player.careerTier === 'ESTAGIARIO') {
      newTier = 'ESTAGIARIO_SENIOR';
      promotionAnnouncement = 'ESTAGIARIO_SENIOR';
    }

    const resultRecord: CaseHistoryRecord = {
      caseId: activeCaseData.id,
      caseTitle: activeCaseData.title,
      completedDate: `${String(player.gameCurrentDay).padStart(2, '0')}/${String(player.gameCurrentMonth).padStart(2, '0')}/${player.gameCurrentYear}`,
      success: isSuccess,
      score: Math.min(100, totalScore),
      verdict,
      earnedXp,
      earnedMoney,
      earnedReputation,
      hoursUsed: player.activeCase.hoursSpent,
      totalAllowedHours: activeCaseData.deadlineHours,
      judgeFeedback: feedback,
    };

    setVerdictCase(activeCaseData);
    setVerdictResult(resultRecord);
    setPromotedTierAnnouncement(promotionAnnouncement);

    setPlayer((prev) => ({
      ...prev,
      money: prev.money + earnedMoney,
      xp: prev.xp + earnedXp,
      reputation: Math.max(0, Math.min(100, prev.reputation + earnedReputation)),
      casesSolved: newSolvedCount,
      casesFailed: newFailedCount,
      careerTier: newTier,
      activeCase: null,
      history: [resultRecord, ...prev.history],
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
          onSubmitPetition={handleSubmitPetition}
        />
      )}

      {verdictResult && verdictCase && (
        <VerdictModal
          isOpen={!!verdictResult}
          onClose={() => {
            setVerdictResult(null);
            setVerdictCase(null);
          }}
          result={verdictResult}
          currentCase={verdictCase}
          player={player}
          promotedToTier={promotedTierAnnouncement}
          onNextCaseOrHub={() => {
            setVerdictResult(null);
            setVerdictCase(null);
            setCurrentView('HUB');
          }}
        />
      )}

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
    </div>
  );
}
