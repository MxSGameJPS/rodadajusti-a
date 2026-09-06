import React from 'react';
import { AlertTriangle, CheckCircle2, Gavel, Info, XCircle } from 'lucide-react';
import type { CaseHistoryRecord, LegalCase } from '../types/game';
import { getCaseReactiveOutcome } from '../lib/reactiveWorldStore';

type FactorStatus = 'POSITIVE' | 'WARNING' | 'NEGATIVE' | 'NEUTRAL';

interface VerdictFactor {
  id: string;
  status: FactorStatus;
  title: string;
  detail: string;
}

interface VerdictFactorsPanelProps {
  result: CaseHistoryRecord;
  currentCase: LegalCase;
}

const STATUS_STYLES: Record<FactorStatus, { wrapper: string; icon: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  POSITIVE: {
    wrapper: 'border-[#34D399]/25 bg-[#34D399]/[0.05]',
    icon: 'text-[#6EE7B7]',
    Icon: CheckCircle2,
  },
  WARNING: {
    wrapper: 'border-[#F59E0B]/25 bg-[#F59E0B]/[0.05]',
    icon: 'text-[#F5B942]',
    Icon: AlertTriangle,
  },
  NEGATIVE: {
    wrapper: 'border-[#F87171]/30 bg-[#F87171]/[0.06]',
    icon: 'text-[#F87171]',
    Icon: XCircle,
  },
  NEUTRAL: {
    wrapper: 'border-[#60A5FA]/20 bg-[#60A5FA]/[0.04]',
    icon: 'text-[#60A5FA]',
    Icon: Info,
  },
};

function buildFactors(result: CaseHistoryRecord, currentCase: LegalCase): VerdictFactor[] {
  const assessment = result.judicialAssessment;
  const reactiveOutcome = getCaseReactiveOutcome(currentCase.id);
  const issues = new Set(assessment?.issues || []);
  const factors: VerdictFactor[] = [];

  factors.push(
    result.hoursUsed <= result.totalAllowedHours
      ? {
          id: 'deadline',
          status: 'POSITIVE',
          title: 'Prazo respeitado',
          detail: 'A medida foi apresentada dentro do tempo disponível.',
        }
      : {
          id: 'deadline',
          status: 'NEGATIVE',
          title: 'Prazo processual perdido',
          detail: 'A intempestividade limita fortemente o resultado, independentemente dos demais acertos.',
        },
  );

  if (assessment) {
    if (issues.has('NO_INVESTIGATION')) {
      factors.push({ id: 'investigation', status: 'NEGATIVE', title: 'Investigação não realizada', detail: 'O processo chegou ao protocolo sem apuração mínima dos fatos.' });
    } else if (issues.has('INSUFFICIENT_INVESTIGATION')) {
      factors.push({ id: 'investigation', status: 'WARNING', title: 'Investigação incompleta', detail: `A cobertura dos elementos cruciais ficou em ${assessment.investigationCoveragePercent}%.` });
    } else {
      factors.push({ id: 'investigation', status: 'POSITIVE', title: 'Investigação adequada', detail: 'A apuração trouxe base suficiente para o juiz examinar os fatos relevantes.' });
    }

    if (issues.has('NO_EVIDENCE')) {
      factors.push({ id: 'evidence', status: 'NEGATIVE', title: 'Nenhuma prova foi juntada', detail: 'Alegações sem suporte probatório não sustentaram o pedido.' });
    } else if (issues.has('FALSE_EVIDENCE')) {
      factors.push({ id: 'evidence', status: 'NEGATIVE', title: 'Prova inautêntica nos autos', detail: 'A autenticidade comprometida reduziu a confiabilidade do conjunto probatório.' });
    } else if (issues.has('MISSING_CRUCIAL_EVIDENCE')) {
      factors.push({ id: 'evidence', status: 'NEGATIVE', title: 'Prova essencial não apresentada', detail: assessment.missingRequiredEvidenceTitles.length > 0 ? `Faltou: ${assessment.missingRequiredEvidenceTitles.join(', ')}.` : 'Faltou elemento crucial exigido pela estratégia escolhida.' });
    } else if (issues.has('INCOMPATIBLE_EVIDENCE') || issues.has('IRRELEVANT_EVIDENCE')) {
      factors.push({ id: 'evidence', status: 'WARNING', title: 'Seleção probatória com problemas', detail: 'Parte do material juntado não ajudava a tese ou era incompatível com ela.' });
    } else {
      factors.push({ id: 'evidence', status: 'POSITIVE', title: 'Conjunto probatório coerente', detail: 'As provas juntadas eram compatíveis com a medida apresentada.' });
    }

    factors.push(
      issues.has('WRONG_STRATEGY')
        ? { id: 'strategy', status: 'WARNING', title: 'Estratégia jurídica inadequada', detail: `A medida “${assessment.strategyTitle}” não era a melhor correspondência para fatos e provas.` }
        : { id: 'strategy', status: 'POSITIVE', title: 'Estratégia compatível', detail: `A medida “${assessment.strategyTitle}” foi coerente com o caso apresentado.` },
    );
  }

  if (reactiveOutcome.events.length > 0) {
    if (reactiveOutcome.scoreModifier >= 4) {
      factors.push({ id: 'events', status: 'POSITIVE', title: 'Intercorrências bem administradas', detail: `${reactiveOutcome.events.length} acontecimento(s) externo(s) foram enfrentados sem desorganizar a estratégia.` });
    } else if (reactiveOutcome.scoreModifier <= -4) {
      factors.push({ id: 'events', status: 'NEGATIVE', title: 'Intercorrências prejudicaram a preparação', detail: 'Algumas decisões tomadas diante de acontecimentos inesperados enfraqueceram a causa.' });
    } else {
      factors.push({ id: 'events', status: 'WARNING', title: 'Intercorrências tiveram efeito misto', detail: `${reactiveOutcome.events.length} acontecimento(s) inesperado(s) influenciaram a preparação, sem definir sozinho o resultado.` });
    }
  }

  if (reactiveOutcome.hearing) {
    const hearing = reactiveOutcome.hearing;
    if (hearing.performancePercent >= 75) {
      factors.push({ id: 'hearing', status: 'POSITIVE', title: 'Atuação oral consistente', detail: hearing.summary });
    } else if (hearing.performancePercent >= 45) {
      factors.push({ id: 'hearing', status: 'WARNING', title: 'Atuação oral irregular', detail: hearing.summary });
    } else {
      factors.push({ id: 'hearing', status: 'NEGATIVE', title: 'Atuação oral desfavorável', detail: hearing.summary });
    }
  }

  return factors;
}

export const VerdictFactorsPanel: React.FC<VerdictFactorsPanelProps> = ({ result, currentCase }) => {
  const factors = buildFactors(result, currentCase);

  return (
    <section className="rounded-xl border border-[#C5A059]/30 bg-[#15140F] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-[#C5A059]/25 bg-[#C5A059]/10 p-2 text-[#C5A059]">
          <Gavel size={18} />
        </div>
        <div>
          <span className="block text-[9px] font-black uppercase tracking-[0.17em] text-[#C5A059]">Entenda a decisão</span>
          <h3 className="mt-1 font-serif text-base font-black text-[#F0ECE3]">Por que o processo terminou assim?</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-[#98938A]">Estes são os principais fatores percebidos pelo jogador. A sentença resulta do conjunto do processo, não de uma única escolha.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {factors.map((factor) => {
          const style = STATUS_STYLES[factor.status];
          const Icon = style.Icon;
          return (
            <div key={factor.id} className={`rounded-lg border p-3 ${style.wrapper}`}>
              <div className="flex items-start gap-2.5">
                <Icon size={16} className={`mt-0.5 shrink-0 ${style.icon}`} />
                <div>
                  <strong className="block text-[11px] text-[#E7E2D8]">{factor.title}</strong>
                  <p className="mt-1 text-[10px] leading-5 text-[#A39E95]">{factor.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg border border-[#60A5FA]/15 bg-[#60A5FA]/[0.04] px-3 py-2.5 text-[10px] leading-relaxed text-[#90A9C8]">
        A audiência oral e as intercorrências podem fortalecer ou enfraquecer a causa, mas não substituem prova, investigação, estratégia e prazo.
      </div>
    </section>
  );
};
