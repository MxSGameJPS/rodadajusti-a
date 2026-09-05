import type {
  ActiveCaseState,
  JudicialAssessment,
  JudicialIssueCode,
  LegalCase,
  SupervisorReviewSeverity,
} from '../types/game';
import { resolveCollectedClueIds } from './evidenceProgress';
import { getCaseReactiveOutcome } from './reactiveWorldStore';

export type JudicialDecision = {
  score: number;
  success: boolean;
  verdict: 'PROCEDENTE' | 'PARCIALMENTE PROCEDENTE' | 'IMPROCEDENTE' | 'EXTINTO SEM JULGAMENTO';
  feedback: string;
  assessment: JudicialAssessment;
  supervisorSeverity: SupervisorReviewSeverity | null;
  shouldIssueWarning: boolean;
};

type EvaluatePetitionInput = {
  currentCase: LegalCase;
  activeState: ActiveCaseState;
  strategyId: string;
  selectedEvidenceIds: string[];
  socialJuridicoBonus: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function unique(values: string[]) {
  return [...new Set(values)];
}

function buildJudgeFeedback(
  currentCase: LegalCase,
  assessment: JudicialAssessment,
  verdict: JudicialDecision['verdict'],
) {
  const issueSet = new Set(assessment.issues);

  if (issueSet.has('DEADLINE_MISSED')) {
    return 'Vistos. A manifestação foi apresentada após o esgotamento do prazo processual. A intempestividade impede o exame útil da pretensão nesta oportunidade, razão pela qual reconheço a perda da oportunidade processual, com as consequências cabíveis.';
  }

  if (issueSet.has('NO_INVESTIGATION') || issueSet.has('NO_EVIDENCE')) {
    return 'Vistos. A pretensão foi apresentada sem instrução probatória mínima. Alegações desacompanhadas de elementos concretos não permitem ao Juízo reconhecer a probabilidade do direito invocado. A parte deixou de trazer aos autos documentos e elementos essenciais disponíveis durante a fase de preparação.';
  }

  if (assessment.falseEvidenceTitles.length > 0) {
    return `Vistos. A instrução contém material que não resistiu ao exame de autenticidade (${assessment.falseEvidenceTitles.join(', ')}). A presença de prova inidônea compromete a confiabilidade do conjunto apresentado e impede acolhimento integral da pretensão, sem prejuízo da análise dos elementos autênticos remanescentes.`;
  }

  if (assessment.missingRequiredEvidenceTitles.length > 0) {
    return `Vistos. Embora haja elementos favoráveis à tese apresentada, a instrução permaneceu incompleta. Não foram juntados elementos essenciais para a medida escolhida: ${assessment.missingRequiredEvidenceTitles.join(', ')}. A ausência dessas provas reduz a força demonstrativa do pedido.`;
  }

  if (issueSet.has('WRONG_STRATEGY')) {
    return 'Vistos. O acervo reunido possui utilidade, porém a medida jurídica escolhida não é a que melhor corresponde aos fatos e às provas produzidas. A inadequação entre tese e suporte probatório impede o acolhimento integral da pretensão.';
  }

  if (verdict === 'PROCEDENTE') {
    return `Vistos. A tese jurídica adotada encontra suporte em prova autêntica, pertinente e suficiente. A investigação reuniu os elementos essenciais ao pedido e o conjunto probatório demonstra adequadamente os fatos relevantes do caso ${currentCase.code}. JULGO PROCEDENTE a pretensão.`;
  }

  if (verdict === 'PARCIALMENTE PROCEDENTE') {
    return 'Vistos. O conjunto probatório oferece suporte parcial às alegações, mas apresenta lacunas relevantes de investigação ou de seleção probatória. Reconheço apenas a parcela suficientemente demonstrada pela prova constante dos autos.';
  }

  return 'Vistos. A parte autora não logrou demonstrar, com prova suficiente e adequada, os fatos indispensáveis à pretensão formulada. As lacunas da instrução e da estratégia processual impedem o reconhecimento do direito nos termos requeridos. JULGO IMPROCEDENTE o pedido.';
}

function appendReactiveFeedback(base: string, eventModifier: number, hearingModifier: number) {
  const notes: string[] = [];

  if (eventModifier >= 4) {
    notes.push('As intercorrências surgidas durante a preparação foram administradas com cautela e contribuíram para preservar a coerência da tese.');
  } else if (eventModifier <= -4) {
    notes.push('Decisões tomadas diante de intercorrências conhecidas fragilizaram a preparação do processo e reduziram a confiabilidade da estratégia apresentada.');
  }

  if (hearingModifier >= 5) {
    notes.push('Em audiência, a atuação foi objetiva, tecnicamente coerente e aderente aos elementos efetivamente constantes dos autos.');
  } else if (hearingModifier <= -4) {
    notes.push('A condução da audiência apresentou respostas inadequadas e reduziu a força persuasiva do conjunto probatório, embora o julgamento permaneça vinculado ao conteúdo integral dos autos.');
  } else if (hearingModifier !== 0) {
    notes.push('A atuação em audiência teve impacto moderado sobre a apreciação final da causa.');
  }

  return notes.length > 0 ? `${base} ${notes.join(' ')}` : base;
}

function determineSupervisorConsequence(
  issues: JudicialIssueCode[],
  missingRequiredCount: number,
  requiredCount: number,
): { severity: SupervisorReviewSeverity | null; warning: boolean } {
  const issueSet = new Set(issues);

  if (
    issueSet.has('DEADLINE_MISSED') ||
    issueSet.has('NO_INVESTIGATION') ||
    issueSet.has('NO_EVIDENCE') ||
    issueSet.has('FALSE_EVIDENCE')
  ) {
    return { severity: 'GRAVE', warning: true };
  }

  const missingRatio = requiredCount > 0 ? missingRequiredCount / requiredCount : 0;
  if (missingRatio >= 0.67 || issueSet.has('INCOMPATIBLE_EVIDENCE')) {
    return { severity: 'ADVERTENCIA', warning: true };
  }

  if (
    missingRequiredCount > 0 ||
    issueSet.has('WRONG_STRATEGY') ||
    issueSet.has('IRRELEVANT_EVIDENCE') ||
    issueSet.has('INSUFFICIENT_INVESTIGATION')
  ) {
    return { severity: 'ORIENTACAO', warning: false };
  }

  return { severity: null, warning: false };
}

export function evaluatePetition({
  currentCase,
  activeState,
  strategyId,
  selectedEvidenceIds,
  socialJuridicoBonus,
}: EvaluatePetitionInput): JudicialDecision {
  const reactiveOutcome = getCaseReactiveOutcome(currentCase.id);
  const eventModifier = clamp(reactiveOutcome.scoreModifier, -12, 12);
  const hearingModifier = clamp(reactiveOutcome.hearing?.scoreModifier || 0, -8, 8);
  const effectiveHoursSpent = activeState.hoursSpent + reactiveOutcome.timePenaltyHours;
  const deadlineMissed = strategyId === '__PRAZO_FATAL_PERDIDO__' || effectiveHoursSpent > currentCase.deadlineHours;
  const chosenStrategy = currentCase.strategies.find((strategy) => strategy.id === strategyId) || null;
  const resolvedDiscoveredIds = resolveCollectedClueIds(currentCase, activeState);
  const discoveredSet = new Set(resolvedDiscoveredIds);
  const selectedIds = unique(selectedEvidenceIds).filter((id) => discoveredSet.has(id));
  const selectedClues = currentCase.availableClues.filter((clue) => selectedIds.includes(clue.id));

  const authenticCrucialClues = currentCase.availableClues.filter(
    (clue) => clue.relevance === 'crucial' && clue.isAuthentic,
  );
  const authenticClues = currentCase.availableClues.filter((clue) => clue.isAuthentic);
  const discoveredAuthenticCrucial = authenticCrucialClues.filter((clue) => discoveredSet.has(clue.id));
  const discoveredAuthentic = authenticClues.filter((clue) => discoveredSet.has(clue.id));

  const declaredRequiredIds = chosenStrategy?.requiredCrucialClueIds || [];
  const requiredIds = (declaredRequiredIds.length > 0 ? declaredRequiredIds : authenticCrucialClues.map((clue) => clue.id))
    .filter((id) => currentCase.availableClues.some((clue) => clue.id === id));
  const requiredClues = currentCase.availableClues.filter((clue) => requiredIds.includes(clue.id));
  const selectedRequired = requiredClues.filter((clue) => selectedIds.includes(clue.id) && clue.isAuthentic);
  const missingRequired = requiredClues.filter((clue) => !selectedRequired.some((selected) => selected.id === clue.id));

  const falseEvidence = selectedClues.filter((clue) => !clue.isAuthentic);
  const irrelevantEvidence = selectedClues.filter((clue) => clue.relevance === 'irrelevante');
  const incompatibleIds = chosenStrategy?.incompatibleClueIds || [];
  const incompatibleEvidence = selectedClues.filter((clue) => incompatibleIds.includes(clue.id));
  const complementaryEvidence = selectedClues.filter(
    (clue) => clue.isAuthentic && clue.relevance === 'complementar' && !incompatibleIds.includes(clue.id),
  );

  const issues: JudicialIssueCode[] = [];
  if (deadlineMissed) issues.push('DEADLINE_MISSED');
  if (resolvedDiscoveredIds.length === 0) issues.push('NO_INVESTIGATION');
  else if (
    authenticCrucialClues.length > 0 &&
    discoveredAuthenticCrucial.length / authenticCrucialClues.length < 0.5
  ) issues.push('INSUFFICIENT_INVESTIGATION');
  if (selectedClues.length === 0) issues.push('NO_EVIDENCE');
  if (missingRequired.length > 0) issues.push('MISSING_CRUCIAL_EVIDENCE');
  if (falseEvidence.length > 0) issues.push('FALSE_EVIDENCE');
  if (irrelevantEvidence.length > 0) issues.push('IRRELEVANT_EVIDENCE');
  if (incompatibleEvidence.length > 0) issues.push('INCOMPATIBLE_EVIDENCE');
  if (chosenStrategy && !chosenStrategy.isOptimal) issues.push('WRONG_STRATEGY');

  const strategyScore = chosenStrategy
    ? chosenStrategy.isOptimal
      ? 25
      : Math.round((clamp(chosenStrategy.scoreWeight, 0, 100) / 100) * 20)
    : 0;

  const requiredCoverage = requiredClues.length > 0 ? selectedRequired.length / requiredClues.length : 1;
  const evidenceBase = Math.round(requiredCoverage * 45);
  const complementaryBonus = Math.min(9, complementaryEvidence.length * 3);
  const falsePenalty = Math.min(60, falseEvidence.length * 35);
  const irrelevantPenalty = Math.min(20, irrelevantEvidence.length * 10);
  const incompatiblePenalty = Math.min(30, incompatibleEvidence.length * 15);
  const evidenceScore = clamp(
    evidenceBase + complementaryBonus - falsePenalty - irrelevantPenalty - incompatiblePenalty,
    0,
    54,
  );

  const crucialInvestigationCoverage = authenticCrucialClues.length > 0
    ? discoveredAuthenticCrucial.length / authenticCrucialClues.length
    : 1;
  const generalInvestigationCoverage = authenticClues.length > 0
    ? discoveredAuthentic.length / authenticClues.length
    : 1;
  const investigationScore = Math.round((crucialInvestigationCoverage * 10) + (generalInvestigationCoverage * 5));
  const deadlineScore = deadlineMissed ? 0 : 5;

  let score = strategyScore + evidenceScore + investigationScore + deadlineScore + socialJuridicoBonus + eventModifier + hearingModifier;

  if (deadlineMissed) score = Math.min(score, 5);
  if (issues.includes('NO_INVESTIGATION') || issues.includes('NO_EVIDENCE')) score = Math.min(score, 20);
  if (requiredClues.length > 0 && selectedRequired.length === 0) score = Math.min(score, 39);
  if (falseEvidence.length > 0) score = Math.min(score, falseEvidence.length > 1 ? 39 : 59);
  if (incompatibleEvidence.length > 0) score = Math.min(score, 64);
  if (hearingModifier <= -5) score = Math.min(score, 69);
  if (reactiveOutcome.professionalRisk >= 6) score = Math.min(score, 72);
  score = clamp(Math.round(score), 0, 100);

  const success = !deadlineMissed && score >= currentCase.minimumPassingScore;
  const verdict: JudicialDecision['verdict'] = deadlineMissed
    ? 'EXTINTO SEM JULGAMENTO'
    : success
      ? 'PROCEDENTE'
      : score >= 50
        ? 'PARCIALMENTE PROCEDENTE'
        : 'IMPROCEDENTE';

  const assessment: JudicialAssessment = {
    strategyTitle: chosenStrategy?.title || 'Nenhuma medida válida selecionada',
    strategyScore,
    evidenceScore,
    investigationScore,
    deadlineScore,
    socialJuridicoBonus,
    discoveredEvidenceCount: resolvedDiscoveredIds.length,
    selectedEvidenceCount: selectedClues.length,
    crucialEvidenceRequired: requiredClues.length,
    crucialEvidenceSelected: selectedRequired.length,
    investigationCoveragePercent: Math.round(crucialInvestigationCoverage * 100),
    missingRequiredEvidenceIds: missingRequired.map((clue) => clue.id),
    missingRequiredEvidenceTitles: missingRequired.map((clue) => clue.title),
    falseEvidenceIds: falseEvidence.map((clue) => clue.id),
    falseEvidenceTitles: falseEvidence.map((clue) => clue.title),
    irrelevantEvidenceIds: irrelevantEvidence.map((clue) => clue.id),
    irrelevantEvidenceTitles: irrelevantEvidence.map((clue) => clue.title),
    incompatibleEvidenceIds: incompatibleEvidence.map((clue) => clue.id),
    incompatibleEvidenceTitles: incompatibleEvidence.map((clue) => clue.title),
    issues,
  };

  const consequence = determineSupervisorConsequence(issues, missingRequired.length, requiredClues.length);
  const baseFeedback = buildJudgeFeedback(currentCase, assessment, verdict);

  return {
    score,
    success,
    verdict,
    feedback: appendReactiveFeedback(baseFeedback, eventModifier, hearingModifier),
    assessment,
    supervisorSeverity: success ? null : consequence.severity,
    shouldIssueWarning: !success && consequence.warning,
  };
}
