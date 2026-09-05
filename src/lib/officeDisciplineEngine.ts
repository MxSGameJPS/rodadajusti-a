import type {
  JudicialIssueCode,
  OfficeDisciplineState,
  SupervisorReview,
  SupervisorReviewSeverity,
} from '../types/game';
import type { JudicialDecision } from './judicialDecisionEngine';

type BuildSupervisorReviewInput = {
  decision: JudicialDecision;
  caseId: string;
  caseTitle: string;
  completedDate: string;
  currentDiscipline: OfficeDisciplineState;
};

function messageForIssues(
  issues: JudicialIssueCode[],
  severity: SupervisorReviewSeverity,
  warningNumber: number,
  contractTerminated: boolean,
) {
  const issueSet = new Set(issues);
  let core = '';

  if (issueSet.has('NO_INVESTIGATION') || issueSet.has('NO_EVIDENCE')) {
    core = 'Você protocolou uma ação sem realizar a investigação mínima e sem instruir adequadamente o processo. Isso expôs o cliente a um resultado previsivelmente ruim e colocou o nome do escritório em risco. Não é aceitável tratar um caso como se a petição, sozinha, substituísse a prova.';
  } else if (issueSet.has('DEADLINE_MISSED')) {
    core = 'Perder um prazo processual é uma das falhas mais graves da prática profissional. O mérito do cliente sequer pôde ser examinado como deveria porque a atuação aconteceu fora do tempo correto. Prazo não é detalhe administrativo; é parte da defesa do cliente.';
  } else if (issueSet.has('FALSE_EVIDENCE')) {
    core = 'Você juntou aos autos um elemento que não resistiu à verificação de autenticidade. Antes de usar uma prova, precisamos conferir origem, coerência e integridade. Uma peça pode ter uma boa tese e ainda assim desmoronar se o conjunto probatório não for confiável.';
  } else if (issueSet.has('MISSING_CRUCIAL_EVIDENCE')) {
    core = 'Você trabalhou o caso, mas deixou de juntar prova essencial para a medida escolhida. A investigação produziu caminhos úteis, porém a seleção final dos anexos ficou incompleta. Em processo, descobrir a prova e não levá-la aos autos pode custar o resultado.';
  } else if (issueSet.has('INCOMPATIBLE_EVIDENCE')) {
    core = 'A prova escolhida não conversa adequadamente com a tese que você apresentou. O problema não foi falta de trabalho, mas falta de coerência entre o que você pediu e o que levou ao juiz para sustentar o pedido.';
  } else if (issueSet.has('WRONG_STRATEGY')) {
    core = 'Você reuniu material útil, mas escolheu uma medida jurídica que não era a mais adequada ao conjunto dos fatos. Esse tipo de erro exige mais atenção na hora de transformar investigação em estratégia processual.';
  } else {
    core = 'A atuação teve pontos positivos, mas faltou atenção na preparação final do processo. Revise o caminho entre investigação, tese e prova antes de protocolar o próximo caso.';
  }

  if (contractTerminated) {
    return `${core} Esta é sua segunda advertência formal por falha profissional. Nós já conversamos sobre o padrão de responsabilidade esperado aqui. Por isso, seu contrato com Ramos & Associados está encerrado.`;
  }

  if (severity === 'GRAVE') {
    return `${core} Estou registrando uma advertência formal. Esta é a advertência ${warningNumber} de 2. Se houver uma nova ocorrência grave que gere advertência, seu contrato será encerrado.`;
  }

  if (severity === 'ADVERTENCIA') {
    return `${core} A falha teve impacto suficiente para gerar advertência formal. Quero que você corrija esse padrão antes do próximo protocolo.`;
  }

  return `${core} Desta vez isso fica como orientação de desempenho, não como advertência formal. Use esse erro para ajustar seu método de trabalho.`;
}

export function buildSupervisorReview({
  decision,
  caseId,
  caseTitle,
  completedDate,
  currentDiscipline,
}: BuildSupervisorReviewInput): { review: SupervisorReview | null; discipline: OfficeDisciplineState } {
  if (decision.success || !decision.supervisorSeverity) {
    return { review: null, discipline: currentDiscipline };
  }

  const warningNumber = decision.shouldIssueWarning
    ? Math.min(2, currentDiscipline.warningCount + 1)
    : currentDiscipline.warningCount;
  const contractTerminated = decision.shouldIssueWarning && warningNumber >= 2;

  const review: SupervisorReview = {
    severity: decision.supervisorSeverity,
    title:
      contractTerminated
        ? 'Seu vínculo com o escritório foi encerrado'
        : decision.supervisorSeverity === 'GRAVE'
          ? 'Precisamos falar seriamente sobre este protocolo'
          : decision.supervisorSeverity === 'ADVERTENCIA'
            ? 'Este erro gerou uma advertência formal'
            : 'Vamos revisar onde sua atuação falhou',
    message: messageForIssues(
      decision.assessment.issues,
      decision.supervisorSeverity,
      warningNumber,
      contractTerminated,
    ),
    warningIssued: decision.shouldIssueWarning,
    warningNumber,
    contractTerminated,
    issueCodes: decision.assessment.issues,
    caseId,
    caseTitle,
  };

  const discipline: OfficeDisciplineState = {
    warningCount: warningNumber,
    employmentStatus: contractTerminated ? 'TERMINATED' : currentDiscipline.employmentStatus,
    incidents: [
      {
        id: `incident-${caseId}-${Date.now()}`,
        caseId,
        caseTitle,
        completedDate,
        severity: decision.supervisorSeverity,
        warningIssued: decision.shouldIssueWarning,
        issueCodes: decision.assessment.issues,
      },
      ...currentDiscipline.incidents,
    ].slice(0, 30),
  };

  return { review, discipline };
}
