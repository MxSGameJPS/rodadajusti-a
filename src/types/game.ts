export type CareerTierId = 
  | 'ESTAGIARIO'
  | 'ESTAGIARIO_SENIOR'
  | 'ADVOGADO_CONTRATADO'
  | 'ADVOGADO_SENIOR'
  | 'SOCIO_ESCRITORIO'
  | 'DONO_ESCRITORIO'
  | 'MAGISTRADO_SUBSTITUTO'
  | 'JUIZ_TITULAR'
  | 'DESEMBARGADOR'
  | 'MINISTRO_STF';

export interface CareerTier {
  id: CareerTierId;
  title: string;
  category: 'advocacia' | 'gestao' | 'magistratura';
  minCasesSolved: number;
  minXp: number;
  minReputation: number;
  salaryBaseMonthly: number;
  description: string;
  perks: string[];
  badgeColor: string;
}

export type AcademicDegreeId = 'GRADUANDO' | 'BACHAREL' | 'ESPECIALISTA' | 'MESTRE' | 'DOUTOR';

export interface AcademicCourse {
  id: string;
  degree: AcademicDegreeId;
  title: string;
  institution: string;
  cost: number;
  durationMonths: number;
  requiredDegree: AcademicDegreeId | null;
  minXpRequired: number;
  xpReward: number;
  reputationReward: number;
  description: string;
  skillsUnlocked: string[];
}

export type ClueType = 'documento' | 'depoimento' | 'pericia' | 'comprovante' | 'registro_publico' | 'objeto';
export type ClueRelevance = 'crucial' | 'complementar' | 'irrelevante' | 'contraditoria';

export interface Clue {
  id: string;
  title: string;
  type: ClueType;
  relevance: ClueRelevance;
  isAuthentic: boolean;
  summary: string;
  fullDetail: string;
  locationFoundId: string;
  legalSignificance: string;
  foundAtTime?: string;
  iconName: string;
}

export interface DialogueOption {
  id: string;
  question: string;
  answer: string;
  revealsClueId?: string;
  unlocksLocationId?: string;
  timeCostMinutes: number;
  attitude?: 'neutro' | 'cooperativo' | 'suspeito' | 'nervoso';
}

export interface Character {
  id: string;
  name: string;
  role: string;
  avatarIcon: string;
  avatarBg: string;
  initialDialogue: string;
  dialogueOptions: DialogueOption[];
}

export interface SearchableSpot {
  id: string;
  name: string;
  description: string;
  timeCostMinutes: number;
  foundClueId?: string;
  inspectedMessage: string;
}

export interface LocationScene {
  id: string;
  name: string;
  category: 'cartorio' | 'tribunal' | 'delegacia' | 'residencia' | 'empresa' | 'banco' | 'escritorio';
  travelTimeHours: number;
  travelCost: number;
  description: string;
  address: string;
  iconName: string;
  color: string;
  unlockedByDefault: boolean;
  requiredClueOrDialogToUnlock?: string;
  characters: Character[];
  searchables: SearchableSpot[];
}

export interface LegalStrategy {
  id: string;
  title: string;
  branch: string;
  description: string;
  isOptimal: boolean;
  scoreWeight: number; // 0 to 100
  requiredCrucialClueIds: string[];
  incompatibleClueIds?: string[];
  rationale: string;
}

export interface LegalCase {
  id: string;
  code: string;
  title: string;
  area: string;
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado' | 'Complexo';
  difficultyStars: number;
  deadlineHours: number;
  honorariosReward: number;
  xpReward: number;
  reputationReward: number;
  minCareerTier: CareerTierId;
  client: {
    name: string;
    occupation: string;
    summary: string;
    avatarBg: string;
  };
  briefing: {
    mentorName: string;
    mentorQuote: string;
    facts: string[];
    mainObjective: string;
    legalContext: string;
  };
  locations: LocationScene[];
  availableClues: Clue[];
  strategies: LegalStrategy[];
  minimumPassingScore: number;
}

export interface ConcursoPhase {
  id: string;
  title: string;
  description: string;
  cost: number;
  requiredPraticaAnos: number;
  requiredXp: number;
  questions: {
    id: string;
    enunciado: string;
    options: { id: string; text: string; isCorrect: boolean; explanation: string }[];
  }[];
}

export interface OfficeEmployee {
  id: string;
  name: string;
  role: 'Estagiário' | 'Advogado Júnior' | 'Secretária Executiva' | 'Pesquisador Jurisprudencial';
  salaryMonthly: number;
  productivityBonus: number; // % bonus on case research
  avatarBg: string;
}

export interface OfficeFinances {
  isOfficeOpen: boolean;
  officeName: string;
  bankBalance: number;
  rentMonthly: number;
  utilitiesMonthly: number; // agua, luz, internet
  adminExpensesMonthly: number;
  employees: OfficeEmployee[];
  monthlyRevenueHistory: { month: string; revenue: number; expenses: number; profit: number }[];
}

export interface CaseLogEntry {
  id: string;
  timestampGameHours: number;
  message: string;
  type: 'viagem' | 'pista' | 'depoimento' | 'analise' | 'alerta';
}

export interface ActiveCaseState {
  caseId: string;
  hoursSpent: number;
  currentLocationId: string;
  discoveredClueIds: string[];
  unlockedLocationIds: string[];
  askedDialogueIds: string[];
  inspectedSpotIds: string[];
  logs: CaseLogEntry[];
  selectedStrategyId: string | null;
  selectedEvidenceIds: string[];
}

export interface CaseHistoryRecord {
  caseId: string;
  caseTitle: string;
  completedDate: string;
  success: boolean;
  score: number;
  verdict: 'PROCEDENTE' | 'PARCIALMENTE PROCEDENTE' | 'IMPROCEDENTE' | 'EXTINTO SEM JULGAMENTO';
  earnedXp: number;
  earnedMoney: number;
  earnedReputation: number;
  hoursUsed: number;
  totalAllowedHours: number;
  judgeFeedback: string;
}

export interface PlayerProfile {
  name: string;
  avatarSeed: string;
  careerTier: CareerTierId;
  academicDegree: AcademicDegreeId;
  completedCourseIds: string[];
  money: number;
  xp: number;
  reputation: number; // 0 to 100
  casesSolved: number;
  casesFailed: number;
  activeCase: ActiveCaseState | null;
  history: CaseHistoryRecord[];
  officeFinances: OfficeFinances;
  concursoCompletedPhases: string[];
  gameCurrentDay: number;
  gameCurrentMonth: number;
  gameCurrentYear: number;
  unlockedAchievements: string[];
  soundEnabled: boolean;
}
