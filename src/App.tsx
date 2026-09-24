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
import { NewGameModal, type NewGameSetup } from './components/NewGameModal';
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
import {
  CityRelocationModal,
  CITY_RELOCATION_COST,
  CITY_RELOCATION_DAYS,
} from './components/CityRelocation/CityRelocationModal';
import { InternshipCareerPanel } from './components/InternshipCareerPanel';
import { CityWorldMapModal } from './components/CityWorldMap/CityWorldMapModal';
import { PlayerHomeModal } from './components/PlayerHome/PlayerHomeModal';
import { LifeTravelConfirmModal } from './components/LifeTravel/LifeTravelConfirmModal';
import { LifeTravelTransition } from './components/LifeTravel/LifeTravelTransition';
import {
  HomeActivityTransition,
  type HomeActivityKind,
} from './components/HomeActivityTransition/HomeActivityTransition';
import {
  ResidenceSetupModal,
  type ResidenceSetupResult,
} from './components/ResidenceSetup/ResidenceSetupModal';
import { OfficeScene } from './components/OfficeScene/OfficeScene';
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
import { PLAYER_SAVE_EXTERNAL_UPDATED_EVENT } from './lib/playerSaveEvents';
import { readProfessionalEmploymentState } from './lib/professionalEmployment';
import { addGameDays, addGameMonths, formatGameDate, getTodayGameDate, normalizeGameDate } from './lib/gameDate';
import { advanceGameClock, DEFAULT_GAME_START_MINUTES, normalizeGameMinutes } from './lib/gameTime';
import { sound } from './utils/sound';
import { normalizeCareerOrigin, saveCareerOrigin } from './lib/careerOrigin';
import { saveWorldMapProfile, type WorldAddressProfile, type WorldMapProfile } from './lib/worldMap';
import type { WorldEstablishment, WorldEstablishmentOffer } from './lib/worldEstablishments';
import {
  lifePlaceFromWorldLocation,
  type LifeTravelRequest,
  type LifeTravelResult,
  worldLocationForLifePlace,
} from './lib/lifeTravel';
import { supabase } from './lib/supabase';
import { canManageOwnOffice } from './lib/independentPractice';
import {
  DEFAULT_HOUSEHOLD_STATE,
  applyLifeTimePassage,
  currentGameDateLabel,
  currentHouseholdBillKey,
  getHouseholdBillSummary,
  getLifeBlockingReason,
  isHouseholdBillPaid,
  furnitureKindFromGameplay,
  normalizeHousehold,
  restoreAfterMeal,
  restoreAfterShower,
  restoreAfterSleep,
  restoreAfterStudy,
} from './lib/lifeSimulation';
import {
  appendPersonalFinanceTransaction,
  createPersonalExpense,
  createPersonalIncome,
  normalizePersonalFinances,
  recoverLegacyPersonalFinances,
} from './lib/personalFinance';

const STORAGE_KEY = 'rota_da_justica_save_v1';
const VIEW_STORAGE_KEY = 'rota_da_justica_view_v1';
const INITIAL_GAME_DATE = getTodayGameDate();

function getPlayerGameDate(player: Pick<PlayerProfile, 'gameCurrentDay' | 'gameCurrentMonth' | 'gameCurrentYear'>) {
  return normalizeGameDate({
    day: player.gameCurrentDay,
    month: player.gameCurrentMonth,
    year: player.gameCurrentYear,
  });
}

function gameDateFields(date: { day: number; month: number; year: number }) {
  return {
    gameCurrentDay: date.day,
    gameCurrentMonth: date.month,
    gameCurrentYear: date.year,
  };
}

function gameMonthKey(value: { month: number; year: number }) {
  return String(value.year) + '-' + String(value.month).padStart(2, '0');
}

function elapsedGameMonths(fromKey: string | null | undefined, toKey: string) {
  if (!fromKey) return 0;
  const [fromYear, fromMonth] = fromKey.split('-').map(Number);
  const [toYear, toMonth] = toKey.split('-').map(Number);
  if (![fromYear, fromMonth, toYear, toMonth].every(Number.isFinite)) return 0;
  return Math.max(0, Math.min(60, (toYear - fromYear) * 12 + (toMonth - fromMonth)));
}

function monthlyCompensationForPlayer(player: PlayerProfile) {
  const tier = CAREER_TIERS[player.careerTier];
  const base = Math.max(0, Number(tier?.salaryBaseMonthly) || 0);

  if (player.careerTier === 'DONO_ESCRITORIO') return 0;

  if (player.careerTier === 'ESTAGIARIO' || player.careerTier === 'ESTAGIARIO_SENIOR') {
    return player.officeDiscipline.employmentStatus === 'TERMINATED' ? 0 : base;
  }

  if (
    player.careerTier === 'MAGISTRADO_SUBSTITUTO'
    || player.careerTier === 'JUIZ_TITULAR'
    || player.careerTier === 'DESEMBARGADOR'
    || player.careerTier === 'MINISTRO_STF'
  ) {
    return base;
  }

  if (player.oabRegistration) {
    const employment = readProfessionalEmploymentState(player);
    if (
      employment?.contractStatus === 'SIGNED'
      && player.officeDiscipline.employmentStatus !== 'TERMINATED'
    ) {
      return Math.max(0, Number(employment.salaryMonthly) || base);
    }
  }

  return 0;
}

function compensationTitle(player: PlayerProfile, months: number) {
  const suffix = months > 1 ? ` • ${months} competências` : '';
  if (player.careerTier === 'ESTAGIARIO' || player.careerTier === 'ESTAGIARIO_SENIOR') {
    return 'Bolsa-estágio' + suffix;
  }
  if (
    player.careerTier === 'MAGISTRADO_SUBSTITUTO'
    || player.careerTier === 'JUIZ_TITULAR'
    || player.careerTier === 'DESEMBARGADOR'
    || player.careerTier === 'MINISTRO_STF'
  ) {
    return 'Subsídio da carreira' + suffix;
  }
  if (player.careerTier === 'SOCIO_ESCRITORIO') return 'Pró-labore' + suffix;
  return 'Remuneração mensal' + suffix;
}

function gameClockFields(player: PlayerProfile, minutesToAdd: number) {
  const next = advanceGameClock(
    getPlayerGameDate(player),
    player.gameCurrentMinutes,
    minutesToAdd,
  );

  return {
    ...gameDateFields(next.date),
    gameCurrentMinutes: next.minutes,
    household: applyLifeTimePassage(player.household, minutesToAdd),
  };
}

function gameDayFields(player: PlayerProfile, daysToAdd: number) {
  const safeDays = Math.max(0, Math.trunc(Number(daysToAdd) || 0));
  return {
    ...gameDateFields(addGameDays(getPlayerGameDate(player), safeDays)),
    household: applyLifeTimePassage(player.household, safeDays * 1440),
  };
}

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
  personalFinances: {
    transactions: [],
    lastCompensationMonthKey: gameMonthKey(INITIAL_GAME_DATE),
  },
  household: {
    ...DEFAULT_HOUSEHOLD_STATE,
    residence: { ...DEFAULT_HOUSEHOLD_STATE.residence },
    needs: { ...DEFAULT_HOUSEHOLD_STATE.needs },
    furniture: [],
    vehicles: [],
  },
  worldLocation: {
    kind: 'OFFICE',
    refId: null,
    label: 'Ramos & Associados',
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
  gameCurrentDay: INITIAL_GAME_DATE.day,
  gameCurrentMonth: INITIAL_GAME_DATE.month,
  gameCurrentYear: INITIAL_GAME_DATE.year,
  gameCurrentMinutes: DEFAULT_GAME_START_MINUTES,
  unlockedAchievements: [],
  soundEnabled: true,
};

function normalizeSavedPlayer(saved: Partial<PlayerProfile>): PlayerProfile {
  const normalizedSavedDate = normalizeGameDate({
    day: saved.gameCurrentDay ?? INITIAL_GAME_DATE.day,
    month: saved.gameCurrentMonth ?? INITIAL_GAME_DATE.month,
    year: saved.gameCurrentYear ?? INITIAL_GAME_DATE.year,
  });

  const normalizedPersonalFinances = saved.personalFinances
    ? normalizePersonalFinances(saved.personalFinances)
    : recoverLegacyPersonalFinances(saved);

  if (!normalizedPersonalFinances.lastCompensationMonthKey) {
    normalizedPersonalFinances.lastCompensationMonthKey = gameMonthKey(normalizedSavedDate);
  }

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
    personalFinances: normalizedPersonalFinances,
    household: normalizeHousehold(saved.household, saved.homeCity || '', saved.homeState || ''),
    worldLocation: saved.worldLocation
      ? {
          kind: saved.worldLocation.kind || 'OFFICE',
          refId: saved.worldLocation.refId || null,
          label: saved.worldLocation.label || 'Ramos & Associados',
        }
      : {
          kind: 'OFFICE',
          refId: null,
          label: 'Ramos & Associados',
        },
    officeDiscipline: {
      ...INITIAL_PLAYER_STATE.officeDiscipline,
      ...(saved.officeDiscipline || {}),
      incidents: Array.isArray(saved.officeDiscipline?.incidents)
        ? saved.officeDiscipline!.incidents
        : [],
    },
    officePerformance: normalizeOfficePerformance(saved.officePerformance),
    ...gameDateFields(normalizedSavedDate),
    gameCurrentMinutes: normalizeGameMinutes(saved.gameCurrentMinutes),
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
  const [currentView, setCurrentView] = useState<'HUB' | 'INVESTIGATION_MAP' | 'LOCATION_SCENE'>(() => {
    if (!player.activeCase) return 'HUB';

    try {
      const savedView = localStorage.getItem(VIEW_STORAGE_KEY);
      if (savedView === 'HUB' || savedView === 'INVESTIGATION_MAP' || savedView === 'LOCATION_SCENE') return savedView;
    } catch {
      // Mantém o mapa como recuperação segura quando a persistência estiver indisponível.
    }

    return 'INVESTIGATION_MAP';
  });

  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState<boolean>(!player.name);
  const [selectedCaseToBrief, setSelectedCaseToBrief] = useState<LegalCase | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [isCourtroomOpen, setIsCourtroomOpen] = useState<boolean>(false);
  const [isCareerModalOpen, setIsCareerModalOpen] = useState<boolean>(false);
  const [isAcademicModalOpen, setIsAcademicModalOpen] = useState<boolean>(false);
  const [isConcursoModalOpen, setIsConcursoModalOpen] = useState<boolean>(false);
  const [isOfficeModalOpen, setIsOfficeModalOpen] = useState<boolean>(false);
  const [isOabExamOpen, setIsOabExamOpen] = useState<boolean>(false);
  const [isCityRelocationOpen, setIsCityRelocationOpen] = useState<boolean>(false);
  const [isCityWorldMapOpen, setIsCityWorldMapOpen] = useState<boolean>(false);
  const [isPlayerHomeOpen, setIsPlayerHomeOpen] = useState<boolean>(false);
  const [lifeWarning, setLifeWarning] = useState('');
  const [lifeTravelConfirm, setLifeTravelConfirm] = useState<LifeTravelRequest | null>(null);
  const [lifeTravelRequest, setLifeTravelRequest] = useState<LifeTravelRequest | null>(null);
  const [homeActivity, setHomeActivity] = useState<HomeActivityKind | null>(null);

  const openOfficeManagement = () => {
    if (!canManageOwnOffice(player)) {
      setIsOfficeModalOpen(false);
      return;
    }
    setIsOfficeModalOpen(true);
  };

  const ensureLifeReady = () => {
    const reason = getLifeBlockingReason(player);
    if (!reason) return true;
    setLifeWarning(reason);
    setIsPlayerHomeOpen(true);
    return false;
  };

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

  useEffect(() => {
    if (!player.name) return;

    const currentKey = gameMonthKey({
      month: player.gameCurrentMonth,
      year: player.gameCurrentYear,
    });
    const previousKey = player.personalFinances.lastCompensationMonthKey;
    if (previousKey === currentKey) return;

    const monthCount = elapsedGameMonths(previousKey, currentKey);

    setPlayer((prev) => {
      const targetKey = gameMonthKey({
        month: prev.gameCurrentMonth,
        year: prev.gameCurrentYear,
      });
      if (prev.personalFinances.lastCompensationMonthKey === targetKey) return prev;

      const elapsed = elapsedGameMonths(
        prev.personalFinances.lastCompensationMonthKey,
        targetKey,
      );
      const monthlyAmount = monthlyCompensationForPlayer(prev);
      const totalAmount = monthlyAmount * elapsed;

      const baseFinances = {
        ...prev.personalFinances,
        lastCompensationMonthKey: targetKey,
      };

      if (elapsed <= 0 || totalAmount <= 0) {
        return {
          ...prev,
          personalFinances: baseFinances,
        };
      }

      return {
        ...prev,
        money: prev.money + totalAmount,
        personalFinances: appendPersonalFinanceTransaction(
          baseFinances,
          createPersonalIncome(prev, {
            category: 'REMUNERACAO',
            amount: totalAmount,
            title: compensationTitle(prev, elapsed),
            description: elapsed > 1
              ? `Crédito acumulado de ${elapsed} competências mensais.`
              : `Crédito referente à competência ${targetKey}.`,
            source: 'MONTHLY_COMPENSATION',
          }),
        ),
      };
    });
  }, [
    player.name,
    player.gameCurrentMonth,
    player.gameCurrentYear,
    player.personalFinances.lastCompensationMonthKey,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, currentView);
    } catch {
      // A navegação continua funcionando durante a sessão.
    }
  }, [currentView]);

  useEffect(() => {
    const refreshPlayerFromSave = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        setPlayer(normalizeSavedPlayer(JSON.parse(saved)));
      } catch {
        // Mantém o estado atual se o save externo estiver inválido.
      }
    };

    window.addEventListener(PLAYER_SAVE_EXTERNAL_UPDATED_EVENT, refreshPlayerFromSave);
    return () => window.removeEventListener(PLAYER_SAVE_EXTERNAL_UPDATED_EVENT, refreshPlayerFromSave);
  }, []);

  const activeCaseData = GAME_CASES.find((c) => c.id === player.activeCase?.caseId) || null;

  const needsResidenceSetup = Boolean(
    player.name
    && (
      !player.household?.residence?.street?.trim()
      || !player.household?.residence?.number?.trim()
      || !player.household?.residence?.city?.trim()
      || !player.household?.residence?.state?.trim()
      || player.household?.residence?.latitude == null
      || player.household?.residence?.longitude == null
      || player.household?.residence?.mapPointMode !== 'STREET_RANDOMIZED'
    )
  );

  const handleResidenceSetupComplete = (setup: ResidenceSetupResult) => {
    const origin = normalizeCareerOrigin(setup.city, setup.state);
    saveCareerOrigin(origin);

    setPlayer((prev) => ({
      ...prev,
      homeCity: origin.city,
      homeState: origin.state,
      household: {
        ...prev.household,
        residence: {
          ...prev.household.residence,
          street: setup.street,
          number: setup.number,
          city: origin.city,
          state: origin.state,
          latitude: setup.addressProfile.point.lat,
          longitude: setup.addressProfile.point.lng,
          mapPointMode: setup.addressProfile.mapPointMode,
          geocodedDisplayName: setup.addressProfile.displayName,
        },
      },
    }));
  };

  const handleStartNewGame = (setup: NewGameSetup) => {
    const careerStartDate = getTodayGameDate();
    const freshProfile: PlayerProfile = {
      ...INITIAL_PLAYER_STATE,
      name: setup.name,
      homeCity: setup.city,
      homeState: setup.state,
      money: 1200,
      xp: 0,
      reputation: 15,
      careerTier: 'ESTAGIARIO',
      officeFinances: {
        ...INITIAL_PLAYER_STATE.officeFinances,
        officeName: `${setup.name} Advocacia & Consultoria`,
      },
      household: {
        ...DEFAULT_HOUSEHOLD_STATE,
        residence: {
          ...DEFAULT_HOUSEHOLD_STATE.residence,
          street: setup.street,
          number: setup.number,
          city: setup.city,
          state: setup.state,
          latitude: setup.addressProfile.point.lat,
          longitude: setup.addressProfile.point.lng,
          mapPointMode: setup.addressProfile.mapPointMode,
          geocodedDisplayName: setup.addressProfile.displayName,
        },
        needs: { ...DEFAULT_HOUSEHOLD_STATE.needs },
        furniture: [],
        vehicles: [],
      },
      officeDiscipline: {
        warningCount: 0,
        employmentStatus: 'ACTIVE',
        incidents: [],
      },
      officePerformance: { ...DEFAULT_OFFICE_PERFORMANCE, completedTaskIds: [], evaluations: [] },
      ...gameDateFields(careerStartDate),
      gameCurrentMinutes: DEFAULT_GAME_START_MINUTES,
    };
    setPlayer(freshProfile);
    saveCareerOrigin(normalizeCareerOrigin(setup.city, setup.state));
    setIsNewGameModalOpen(false);
    setSelectedCaseToBrief(GAME_CASES[0]);
  };

  const handleAcceptCase = (caseItem: LegalCase) => {
    if (!ensureLifeReady()) return;
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
    if (!ensureLifeReady()) return;

    setPlayer((prev) => {
      if (!prev.activeCase) return prev;

      const newHoursSpent = prev.activeCase.hoursSpent + loc.travelTimeHours;

      return {
        ...prev,
        ...gameClockFields(prev, loc.travelTimeHours * 60),
        money: Math.max(0, prev.money - loc.travelCost),
        personalFinances: loc.travelCost > 0
          ? appendPersonalFinanceTransaction(
              prev.personalFinances,
              createPersonalExpense(prev, {
                category: 'DILIGENCIA',
                amount: loc.travelCost,
                title: `Diligência — ${loc.name}`,
                description: `Deslocamento profissional para ${loc.name}.`,
                source: 'CASE_TRAVEL',
              }),
            )
          : prev.personalFinances,
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
    if (!ensureLifeReady()) return;

    sound.playPaper();
    const additionalHours = Math.ceil(option.timeCostMinutes / 60);

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

      const newHoursSpent = prev.activeCase.hoursSpent + additionalHours;

      return {
        ...prev,
        ...gameClockFields(prev, additionalHours * 60),
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
              message: `Depoimento de ${character.name}: \"${option.question}\"`,
              type: 'depoimento',
            },
          ],
        },
      };
    });
  };

  const handleInspectSpot = (spot: SearchableSpot) => {
    if (!player.activeCase) return;
    if (!ensureLifeReady()) return;

    sound.playPaper();
    const additionalHours = Math.ceil(spot.timeCostMinutes / 60);

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

      const newHoursSpent = prev.activeCase.hoursSpent + additionalHours;

      return {
        ...prev,
        ...gameClockFields(prev, additionalHours * 60),
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
              message: `Perícia no ponto \"${spot.name}\" (+${spot.timeCostMinutes}min)`,
              type: 'analise',
            },
          ],
        },
      };
    });
  };

  const handleUseSocialJuridicoTool = (tool: SocialJuridicoToolUse) => {
    if (!ensureLifeReady()) return;
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
        ...gameClockFields(prev, safeTimeCost * 60),
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
    if (!ensureLifeReady()) return;
    if (
      (player.careerTier === 'ESTAGIARIO' || player.careerTier === 'ESTAGIARIO_SENIOR')
      && player.household.needs.study <= 8
    ) {
      setLifeWarning('Sua rotina de estudos está crítica. Estude em casa ou na faculdade antes de assumir novas tarefas do estágio.');
      setIsPlayerHomeOpen(true);
      return;
    }

    const completedDate = formatGameDate(getPlayerGameDate(player));
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
      ...gameDayFields(prev, 1),
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

    const completedDate = formatGameDate(getPlayerGameDate(player));
    const { review: supervisorReview, discipline: nextDiscipline } = buildSupervisorReview({
      decision,
      caseId: activeCaseData.id,
      caseTitle: activeCaseData.title,
      completedDate,
      currentDiscipline: player.officeDiscipline,
      officeName: readProfessionalEmploymentState(player)?.officeName || 'Ramos & Associados',
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
      ...gameDayFields(prev, 3),
    }));
  };

  const handleOabExamComplete = (result: ProfessionalExamResult, exam: ProfessionalExam) => {
    const completedDate = formatGameDate(getPlayerGameDate(player));

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
      personalFinances: appendPersonalFinanceTransaction(
        prev.personalFinances,
        createPersonalExpense(prev, {
          category: 'ESTUDOS',
          amount: course.cost,
          title: course.title,
          description: `Matrícula em ${course.institution}.`,
          source: 'ACADEMIC_COURSE',
        }),
      ),
      xp: prev.xp + course.xpReward,
      reputation: Math.min(100, prev.reputation + course.reputationReward),
      academicDegree: course.degree,
      completedCourseIds: [...prev.completedCourseIds, course.id],
      ...gameDateFields(addGameMonths(getPlayerGameDate(prev), course.durationMonths)),
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
    if (!canManageOwnOffice(player)) return;
    setPlayer((prev) => ({
      ...prev,
      officeFinances: {
        ...prev.officeFinances,
        employees: [...prev.officeFinances.employees, employee],
      },
    }));
  };

  const handleFireEmployee = (employeeId: string) => {
    if (!canManageOwnOffice(player)) return;
    setPlayer((prev) => ({
      ...prev,
      officeFinances: {
        ...prev.officeFinances,
        employees: prev.officeFinances.employees.filter((e) => e.id !== employeeId),
      },
    }));
  };

  const handlePayOfficeExpenses = () => {
    if (!canManageOwnOffice(player)) return;
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
      ...gameDateFields(addGameMonths(getPlayerGameDate(prev), 1)),
    }));
  };

  const handleToggleSound = () => {
    const nextVal = !player.soundEnabled;
    sound.setMuted(!nextVal);
    setPlayer((prev) => ({ ...prev, soundEnabled: nextVal }));
  };

  const handleSleepAtHome = () => {
    setPlayer((prev) => {
      const clock = gameClockFields(prev, 8 * 60);
      const nextPlayer = { ...prev, ...clock } as PlayerProfile;
      return {
        ...nextPlayer,
        household: restoreAfterSleep(
          clock.household,
          currentGameDateLabel(nextPlayer),
        ),
      };
    });
  };

  const handleShowerAtHome = () => {
    setPlayer((prev) => {
      const clock = gameClockFields(prev, 30);
      return {
        ...prev,
        ...clock,
        household: restoreAfterShower(clock.household),
      };
    });
  };

  const handleEatAtHome = () => {
    setPlayer((prev) => {
      if (prev.household.foodUnits <= 0) return prev;
      const clock = gameClockFields(prev, 45);
      return {
        ...prev,
        ...clock,
        household: restoreAfterMeal(clock.household),
      };
    });
  };

  const handleStudyAtHome = () => {
    setPlayer((prev) => {
      const clock = gameClockFields(prev, 120);
      const nextPlayer = { ...prev, ...clock } as PlayerProfile;
      return {
        ...nextPlayer,
        household: restoreAfterStudy(
          clock.household,
          currentGameDateLabel(nextPlayer),
        ),
      };
    });
  };

  const handlePayHouseholdBills = () => {
    setPlayer((prev) => {
      if (isHouseholdBillPaid(prev)) return prev;
      const billSummary = getHouseholdBillSummary(prev);
      if (prev.money < billSummary.totalDue) return prev;

      const clock = gameClockFields(prev, 15);
      return {
        ...prev,
        ...clock,
        money: Math.max(0, prev.money - billSummary.totalDue),
        household: {
          ...clock.household,
          residence: {
            ...clock.household.residence,
            billsPaidThroughKey: currentHouseholdBillKey(prev),
          },
        },
        personalFinances: appendPersonalFinanceTransaction(
          prev.personalFinances,
          createPersonalExpense(prev, {
            category: 'MORADIA',
            amount: billSummary.totalDue,
            title: billSummary.dueMonths > 1
              ? `Contas domésticas • ${billSummary.dueMonths} competências`
              : 'Contas domésticas do mês',
            description: billSummary.dueMonths > 1
              ? `Regularização de ${billSummary.dueMonths} competências de aluguel, água, energia elétrica, internet e gás.`
              : 'Aluguel, água, energia elétrica, internet e gás.',
            source: 'HOUSEHOLD_BILLS',
          }),
        ),
      };
    });
  };

  const handleStudyAtUniversity = () => {
    setPlayer((prev) => {
      const clock = gameClockFields(prev, 180);
      const nextPlayer = { ...prev, ...clock } as PlayerProfile;
      return {
        ...nextPlayer,
        household: restoreAfterStudy(
          {
            ...clock.household,
            needs: {
              ...clock.household.needs,
              study: Math.min(100, clock.household.needs.study + 12),
            },
          },
          currentGameDateLabel(nextPlayer),
        ),
      };
    });
  };

  const beginLifeTravel = (request: LifeTravelRequest) => {
    setLifeTravelConfirm(null);
    setLifeWarning('');
    setIsPlayerHomeOpen(false);
    setIsCityWorldMapOpen(false);
    setLifeTravelRequest(request);
  };

  const handleRequestGoHome = () => {
    if (player.worldLocation.kind === 'HOME') {
      setLifeWarning('');
      setIsCityWorldMapOpen(false);
      setIsPlayerHomeOpen(true);
      return;
    }

    setLifeTravelConfirm({
      origin: 'CURRENT',
      destination: 'HOME',
      reason: 'GO_HOME',
    });
  };

  const handleRequestGoOffice = () => {
    if (player.worldLocation.kind === 'OFFICE') {
      setIsCityWorldMapOpen(false);
      setIsPlayerHomeOpen(false);
      setCurrentView('HUB');
      return;
    }

    beginLifeTravel({
      origin: 'CURRENT',
      destination: 'OFFICE',
      reason: 'GO_OFFICE',
    });
  };

  const handleRequestUniversityTrip = () => {
    const isIntern = player.careerTier === 'ESTAGIARIO'
      || player.careerTier === 'ESTAGIARIO_SENIOR';
    if (!isIntern) return;

    if (player.worldLocation.kind === 'UNIVERSITY') {
      setIsPlayerHomeOpen(false);
      setIsCityWorldMapOpen(false);
      setHomeActivity('STUDY_UNIVERSITY');
      return;
    }

    beginLifeTravel({
      origin: 'CURRENT',
      destination: 'UNIVERSITY',
      reason: 'GO_UNIVERSITY',
    });
  };

  const handleLifeTravelComplete = (result: LifeTravelResult) => {
    const request = lifeTravelRequest;
    if (!request) return;

    setPlayer((prev) => {
      const clock = gameClockFields(prev, result.travelMinutes);
      const finances = result.cost > 0
        ? appendPersonalFinanceTransaction(
            prev.personalFinances,
            createPersonalExpense(prev, {
              category: result.expenseCategory,
              amount: result.cost,
              title: `Deslocamento — ${result.destination.label}`,
              description: `${result.transport === 'CAR' ? 'Carro próprio' : 'Ônibus'} • ${result.distanceKm.toFixed(1)} km.`,
              source: 'LIFE_TRAVEL',
            }),
          )
        : prev.personalFinances;

      return {
        ...prev,
        ...clock,
        money: Math.max(0, prev.money - result.cost),
        personalFinances: finances,
        worldLocation: worldLocationForLifePlace(
          request.destination,
          result.destination.label,
        ),
      };
    });

    setLifeTravelRequest(null);

    if (request.reason === 'GO_HOME' || request.reason === 'RETURN_HOME_AFTER_STUDY') {
      setIsPlayerHomeOpen(true);
      return;
    }

    if (request.reason === 'GO_OFFICE') {
      setCurrentView('HUB');
      return;
    }

    if (request.reason === 'GO_UNIVERSITY') {
      setHomeActivity('STUDY_UNIVERSITY');
    }
  };

  const handleHomeActivityComplete = () => {
    const activity = homeActivity;
    if (!activity) return;

    setHomeActivity(null);

    if (activity === 'SLEEP') {
      handleSleepAtHome();
      return;
    }

    if (activity === 'SHOWER') {
      handleShowerAtHome();
      return;
    }

    if (activity === 'MEAL') {
      handleEatAtHome();
      return;
    }

    if (activity === 'STUDY_HOME') {
      handleStudyAtHome();
      return;
    }

    handleStudyAtUniversity();
    setLifeTravelRequest({
      origin: 'UNIVERSITY',
      destination: 'HOME',
      reason: 'RETURN_HOME_AFTER_STUDY',
    });
  };

  const handleClosePlayerHome = () => {
    setLifeWarning('');
    setIsPlayerHomeOpen(false);

    if (player.worldLocation.kind === 'HOME') {
      setIsCityWorldMapOpen(true);
    }
  };

  const handlePurchaseWorldOffer = (
    establishment: WorldEstablishment,
    offer: WorldEstablishmentOffer,
  ) => {
    const price = Number(offer.price);
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, message: 'Este item ainda não possui preço de compra configurado.' };
    }
    if (player.money < price) {
      return { ok: false, message: 'Patrimônio insuficiente para esta compra.' };
    }

    const effects = offer.gameplayEffects || {};
    const kind = String(effects.kind || 'OTHER').toUpperCase();
    const numberEffect = (key: string, fallback = 0) => {
      const value = Number(effects[key]);
      return Number.isFinite(value) ? Math.max(0, value) : fallback;
    };

    let message = `${offer.title} adquirido por JR$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;

    setPlayer((prev) => {
      if (prev.money < price) return prev;

      const clock = gameClockFields(prev, kind === 'MEAL' ? 45 : 20);
      let household = clock.household;
      let category: Parameters<typeof createPersonalExpense>[1]['category'] = 'OUTROS';

      if (kind === 'FOOD') {
        const foodUnits = Math.max(1, Math.floor(numberEffect('foodUnits', 1)));
        household = {
          ...household,
          foodUnits: household.foodUnits + foodUnits,
        };
        category = 'SUPERMERCADO';
        message = `${offer.title}: +${foodUnits} unidade(s) adicionadas à despensa.`;
      } else if (kind === 'BED' || kind === 'FURNITURE' || kind === 'STUDY_FURNITURE') {
        const furnitureKind = kind === 'BED'
          ? 'BED'
          : kind === 'STUDY_FURNITURE'
            ? (String(effects.furnitureKind || '').toUpperCase() || 'DESK')
            : String(effects.furnitureKind || '').toUpperCase();

        household = {
          ...household,
          furniture: [
            ...household.furniture,
            {
              id: `furniture-${offer.id}-${Date.now()}`,
              offerId: offer.id,
              establishmentId: establishment.id,
              title: offer.title,
              kind: furnitureKindFromGameplay(furnitureKind),
              imageUrl: offer.imageUrl,
              comfortBonus: numberEffect('comfortBonus'),
              energyBonus: numberEffect('energyBonus'),
              studyBonus: numberEffect('studyBonus'),
              purchasedAtGameDate: currentGameDateLabel(prev),
            },
          ].slice(-100),
        };
        category = 'MOVEIS';
        message = `${offer.title} foi entregue na sua residência e seus bônus já estão ativos.`;
      } else if (kind === 'VEHICLE') {
        household = {
          ...household,
          vehicles: [
            ...household.vehicles,
            {
              id: `vehicle-${offer.id}-${Date.now()}`,
              offerId: offer.id,
              establishmentId: establishment.id,
              title: offer.title,
              imageUrl: offer.imageUrl,
              purchasedAtGameDate: currentGameDateLabel(prev),
            },
          ].slice(-40),
        };
        category = 'VEICULO';
        message = `${offer.title} agora faz parte do patrimônio do personagem.`;
      } else if (kind === 'MEAL') {
        const hungerRestore = Math.max(25, numberEffect('hungerRestore', 45));
        household = {
          ...household,
          needs: {
            ...household.needs,
            hunger: Math.min(100, household.needs.hunger + hungerRestore),
            energy: Math.min(100, household.needs.energy + 4),
          },
        };
        category = 'ALIMENTACAO';
        message = `Refeição concluída. Fome recuperada em +${Math.round(hungerRestore)}.`;
      } else if (offer.offerType === 'HOSPEDAGEM') {
        category = 'HOTEL';
      }

      return {
        ...prev,
        ...clock,
        money: Math.max(0, prev.money - price),
        household,
        personalFinances: appendPersonalFinanceTransaction(
          prev.personalFinances,
          createPersonalExpense(prev, {
            category,
            amount: price,
            title: offer.title,
            description: `Compra em ${establishment.name}.`,
            source: `ESTABLISHMENT:${establishment.id}`,
          }),
        ),
      };
    });

    return { ok: true, message };
  };

  const handleRelocateCity = async ({
    city,
    state,
    street,
    number,
    profile,
    addressProfile,
  }: {
    city: string;
    state: string;
    street: string;
    number: string;
    profile: WorldMapProfile;
    addressProfile: WorldAddressProfile;
  }) => {
    if (player.activeCase) {
      throw new Error('Finalize o caso ativo antes da mudança.');
    }
    if (player.money < CITY_RELOCATION_COST) {
      throw new Error('Patrimônio insuficiente para a mudança.');
    }

    const previousCity = player.homeCity || '';
    const previousState = player.homeState || '';
    const destination = normalizeCareerOrigin(city, state);
    const nextDate = addGameDays(getPlayerGameDate(player), CITY_RELOCATION_DAYS);
    const nextMoney = Math.max(0, player.money - CITY_RELOCATION_COST);

    saveCareerOrigin(destination);
    saveWorldMapProfile(player, {
      ...profile,
      city: destination.city,
      state: destination.state,
      source: 'USER_SETUP',
      updatedAt: new Date().toISOString(),
    });

    setPlayer((prev) => {
      const advanced = gameDayFields(prev, CITY_RELOCATION_DAYS);
      return {
        ...prev,
        ...advanced,
        homeCity: destination.city,
        homeState: destination.state,
        money: Math.max(0, prev.money - CITY_RELOCATION_COST),
        household: {
          ...advanced.household,
          residence: {
            ...advanced.household.residence,
            street,
            number,
            city: destination.city,
            state: destination.state,
            latitude: addressProfile.point.lat,
            longitude: addressProfile.point.lng,
            mapPointMode: addressProfile.mapPointMode,
            geocodedDisplayName: addressProfile.displayName,
            billsPaidThroughKey: null,
          },
        },
        personalFinances: appendPersonalFinanceTransaction(
          prev.personalFinances,
          createPersonalExpense(prev, {
            category: 'MUDANCA',
            amount: CITY_RELOCATION_COST,
            title: `Mudança para ${destination.city}/${destination.state}`,
            description: 'Custos pessoais e logísticos da mudança de cidade.',
            source: 'CITY_RELOCATION',
          }),
        ),
      };
    });

    if (supabase && player.cloudCareerId) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || null;

      const { error: careerError } = await supabase
        .from('careers')
        .update({
          current_city: `${destination.city}/${destination.state}`,
          money: nextMoney,
          last_played_at: new Date().toISOString(),
        })
        .eq('id', player.cloudCareerId);

      if (careerError) {
        console.warn('[Rota da Justiça] Mudança concluída localmente, mas a carreira em nuvem não foi sincronizada.', careerError);
      }

      if (userId) {
        const { error: eventError } = await supabase.from('career_events').insert({
          career_id: player.cloudCareerId,
          user_id: userId,
          event_type: 'CITY_RELOCATION',
          title: `Mudança para ${destination.city}/${destination.state}`,
          description: `Mudança residencial e profissional concluída com custo de JR$ ${CITY_RELOCATION_COST.toLocaleString('pt-BR')} e duração de ${CITY_RELOCATION_DAYS} dias.`,
          metadata: {
            previousCity,
            previousState,
            destinationCity: destination.city,
            destinationState: destination.state,
            costJR: CITY_RELOCATION_COST,
            elapsedGameDays: CITY_RELOCATION_DAYS,
            arrivalGameDate: formatGameDate(nextDate),
          },
        });
        if (eventError) {
          console.warn('[Rota da Justiça] Mudança concluída, mas o evento de carreira não pôde ser registrado.', eventError);
        }
      }
    }

    setCurrentView('HUB');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] flex flex-col items-center justify-start antialiased selection:bg-[#C5A059]/30 selection:text-[#C5A059]">
      {currentView === 'HUB' && !isMobileFrame ? (
        <OfficeScene
          player={player}
          onSelectCaseToView={(c) => setSelectedCaseToBrief(c)}
          onResumeActiveCase={() => setCurrentView('INVESTIGATION_MAP')}
          onOpenCareerModal={() => setIsCareerModalOpen(true)}
          onOpenAcademicModal={() => setIsAcademicModalOpen(true)}
          onOpenConcursoModal={() => setIsConcursoModalOpen(true)}
          onOpenOfficeModal={openOfficeManagement}
          onOpenOabExam={() => setIsOabExamOpen(true)}
          onOpenCityRelocation={() => setIsCityRelocationOpen(true)}
          onOpenCityWorldMap={() => setIsCityWorldMapOpen(true)}
          onOpenPlayerHome={() => setIsPlayerHomeOpen(true)}
          onCompleteOfficeTask={handleCompleteOfficeTask}
          onToggleSound={handleToggleSound}
          onEnableMobileFrame={() => setIsMobileFrame(true)}
        />
      ) : (
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
            onOpenOfficeModal={openOfficeManagement}
            onOpenCityRelocation={() => setIsCityRelocationOpen(true)}
            onOpenCityWorldMap={() => setIsCityWorldMapOpen(true)}
            onOpenPlayerHome={() => setIsPlayerHomeOpen(true)}
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
                  onOpenOfficeModal={openOfficeManagement}
                  onOpenOabExam={() => setIsOabExamOpen(true)}
                />
              </>
            )}

            {currentView !== 'HUB' && activeCaseData && player.activeCase && (
              <InvestigationMap
                currentCase={activeCaseData}
                activeState={player.activeCase}
                onTravelToLocation={handleTravelToLocation}
                onOpenDossier={() => setIsDossierOpen(true)}
                onOpenCourtroom={() => setIsCourtroomOpen(true)}
                onBackToOffice={() => setCurrentView('HUB')}
                onOpenPlayerHome={() => setIsPlayerHomeOpen(true)}
                onStudyAtUniversity={handleStudyAtUniversity}
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
      )}

      <NewGameModal isOpen={isNewGameModalOpen} onStartNewGame={handleStartNewGame} />

      <ResidenceSetupModal
        player={player}
        isOpen={!isNewGameModalOpen && needsResidenceSetup}
        onComplete={handleResidenceSetupComplete}
      />

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
        isOpen={isOfficeModalOpen && canManageOwnOffice(player)}
        onClose={() => setIsOfficeModalOpen(false)}
        player={player}
        onHireEmployee={handleHireEmployee}
        onFireEmployee={handleFireEmployee}
        onPayOfficeExpenses={handlePayOfficeExpenses}
      />

      <PlayerHomeModal
        player={player}
        isOpen={isPlayerHomeOpen}
        warningMessage={lifeWarning}
        onClose={() => {
          setLifeWarning('');
          setIsPlayerHomeOpen(false);
        }}
        onSleep={handleSleepAtHome}
        onShower={handleShowerAtHome}
        onEat={handleEatAtHome}
        onStudy={handleStudyAtHome}
        onPayBills={handlePayHouseholdBills}
        onOpenCityMap={() => {
          setIsPlayerHomeOpen(false);
          setIsCityWorldMapOpen(true);
        }}
      />

      <CityWorldMapModal
        player={player}
        isOpen={isCityWorldMapOpen}
        onClose={() => setIsCityWorldMapOpen(false)}
        onOpenHome={() => {
          setIsCityWorldMapOpen(false);
          setIsPlayerHomeOpen(true);
        }}
        onStudyAtUniversity={handleStudyAtUniversity}
        onPurchaseOffer={handlePurchaseWorldOffer}
      />

      <CityRelocationModal
        player={player}
        isOpen={isCityRelocationOpen}
        onClose={() => setIsCityRelocationOpen(false)}
        onConfirm={handleRelocateCity}
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
