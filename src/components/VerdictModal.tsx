import React from 'react';
import { LegalCase, CaseHistoryRecord, PlayerProfile, CareerTierId, JudicialIssueCode } from '../types/game';
import { CAREER_TIERS } from '../data/careers';
import {
  Scale,
  Award,
  Sparkles,
  Coins,
  Clock,
  ArrowRight,
  CheckCircle2,
  Laptop,
  AlertTriangle,
  FileSearch,
  ShieldCheck,
} from 'lucide-react';
import { sound } from '../utils/sound';
import { CelebrationBurst } from './CelebrationBurst/CelebrationBurst';

interface VerdictModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CaseHistoryRecord;
  currentCase: LegalCase;
  player: PlayerProfile;
  promotedToTier: CareerTierId | null;
  onNextCaseOrHub: () => void;
}

const PROMOTION_MESSAGES: Partial<Record<CareerTierId, string>> = {
  ESTAGIARIO_SENIOR:
    'Seu trabalho começou a ser reconhecido dentro do escritório. Agora você recebe mais responsabilidade, casos mais desafiadores e está um passo mais perto da advocacia profissional.',
  ADVOGADO_CONTRATADO:
    'A fase de estágio ficou para trás. Uma nova etapa profissional começa, com mais autonomia, responsabilidade e oportunidades na sua carreira jurídica.',
  ADVOGADO_SENIOR:
    'Sua experiência e seus resultados colocaram você entre os profissionais de confiança do escritório. Os casos mais complexos agora fazem parte da sua rotina.',
  SOCIO_ESCRITORIO:
    'Você deixou de ser apenas parte da equipe e passou a participar das decisões que definem o futuro do escritório. Esta é uma conquista de carreira memorável.',
  MAGISTRADO_SUBSTITUTO:
    'Uma nova perspectiva da Justiça se abre diante de você. A partir de agora, suas decisões passam a ter impacto direto na vida de outras pessoas.',
};

const ISSUE_LABELS: Record<JudicialIssueCode, string> = {
  DEADLINE_MISSED: 'Prazo processual perdido',
  NO_INVESTIGATION: 'Nenhuma investigação realizada',
  INSUFFICIENT_INVESTIGATION: 'Investigação insuficiente',
  NO_EVIDENCE: 'Petição protocolada sem prova',
  MISSING_CRUCIAL_EVIDENCE: 'Prova essencial não juntada',
  FALSE_EVIDENCE: 'Prova inautêntica incluída',
  IRRELEVANT_EVIDENCE: 'Prova irrelevante incluída',
  INCOMPATIBLE_EVIDENCE: 'Prova incompatível com a tese',
  WRONG_STRATEGY: 'Estratégia jurídica inadequada',
};

export const VerdictModal: React.FC<VerdictModalProps> = ({
  isOpen,
  result,
  currentCase,
  player,
  promotedToTier,
  onNextCaseOrHub,
}) => {
  if (!isOpen) return null;

  const isWin = result.success;
  const assessment = result.judicialAssessment;
  const promotedTierObj = promotedToTier ? CAREER_TIERS[promotedToTier] : null;
  const promotionMessage = promotedToTier
    ? PROMOTION_MESSAGES[promotedToTier] || 'Sua dedicação abriu uma nova etapa na sua trajetória jurídica.'
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/90 backdrop-blur-lg overflow-y-auto">
      {isWin && <CelebrationBurst intensity={promotedTierObj ? 'strong' : 'normal'} />}

      <div className="relative w-full max-w-3xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-6">
        <div
          className={`p-6 text-center border-b relative overflow-hidden bg-[#111113] ${
            isWin ? 'border-b-[#34D399]/40' : 'border-b-[#F87171]/40'
          }`}
        >
          <div
            className={`inline-flex p-3 rounded-xl mb-3 shadow-inner ${
              isWin
                ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30'
                : 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30'
            }`}
          >
            <Scale size={32} />
          </div>

          <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#888888] block">
            Tribunal de Justiça • Sentença Publicada
          </span>

          <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight mt-1 text-[#E0E0E0]">
            {result.verdict}
          </h2>

          <p className="text-xs sm:text-sm text-[#AAAAAA] mt-1 max-w-md mx-auto">
            {currentCase.title}
          </p>

          {isWin && (
            <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 rounded-xl border border-[#34D399]/25 bg-[#34D399]/[0.07] px-4 py-2.5 text-xs font-semibold text-[#8BE7C3]">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Parabéns! O resultado só foi reconhecido depois da análise da tese, da investigação e das provas efetivamente juntadas.</span>
            </div>
          )}

          <div className="mt-4 inline-block">
            <div
              className={`px-4 py-1.5 rounded-lg font-mono font-bold text-xs border ${
                isWin
                  ? 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/40'
                  : 'bg-[#F87171]/10 text-[#F87171] border-[#F87171]/40'
              }`}
            >
              PONTUAÇÃO PROBATÓRIA: {result.score} / 100 PONTOS
            </div>
          </div>
        </div>

        {promotedTierObj && (
          <div className="border-b border-[#C5A059]/35 bg-gradient-to-r from-[#C5A059] via-[#D9B96E] to-[#C5A059] px-6 py-5 text-[#0A0A0B] shadow-lg">
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-xl bg-[#0A0A0B]/15 p-3 text-[#0A0A0B] shadow-inner">
                <Award size={28} />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.22em]">
                  ★ Nova etapa da sua carreira
                </span>
                <strong className="mt-1 block font-serif text-lg font-extrabold sm:text-xl">
                  Parabéns, {player.name}! Você foi promovido(a) a {promotedTierObj.title}!
                </strong>
                <p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-[#1C1810]/80 sm:text-sm">
                  {promotionMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 space-y-4 text-xs sm:text-sm bg-[#0A0A0B]">
          <div className="p-4 bg-[#161618] rounded-xl border border-[#2A2A2E] space-y-2">
            <div className="flex items-center justify-between text-[#888888] text-xs">
              <span className="font-bold uppercase tracking-wider text-[#C5A059] font-serif">
                Fundamentação do Magistrado:
              </span>
              <span className="font-mono text-[11px]">{result.completedDate}</span>
            </div>
            <p className="text-[#CCCCCC] leading-relaxed italic font-serif">
              “{result.judgeFeedback}”
            </p>
          </div>

          {assessment && (
            <div className="rounded-xl border border-[#2A2A2E] bg-[#121316] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileSearch size={17} className="text-[#C5A059]" />
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#C5A059]">Análise judicial do processo</span>
                    <strong className="mt-0.5 block text-xs text-[#E7E3DA]">O juiz avaliou a tese, o que você investigou e somente as provas anexadas.</strong>
                  </div>
                </div>
                <ShieldCheck size={18} className={isWin ? 'text-[#34D399]' : 'text-[#F87171]'} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-[#292A30] bg-[#0B0C0E] p-3 text-center">
                  <span className="block text-[9px] uppercase tracking-wider text-[#747984]">Tese</span>
                  <strong className="mt-1 block font-mono text-sm text-[#E5C87F]">{assessment.strategyScore}</strong>
                </div>
                <div className="rounded-lg border border-[#292A30] bg-[#0B0C0E] p-3 text-center">
                  <span className="block text-[9px] uppercase tracking-wider text-[#747984]">Provas</span>
                  <strong className="mt-1 block font-mono text-sm text-[#E5C87F]">{assessment.evidenceScore}</strong>
                </div>
                <div className="rounded-lg border border-[#292A30] bg-[#0B0C0E] p-3 text-center">
                  <span className="block text-[9px] uppercase tracking-wider text-[#747984]">Investigação</span>
                  <strong className="mt-1 block font-mono text-sm text-[#E5C87F]">{assessment.investigationScore}</strong>
                </div>
                <div className="rounded-lg border border-[#292A30] bg-[#0B0C0E] p-3 text-center">
                  <span className="block text-[9px] uppercase tracking-wider text-[#747984]">Prazo</span>
                  <strong className="mt-1 block font-mono text-sm text-[#E5C87F]">{assessment.deadlineScore}</strong>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-[#292A30] bg-[#0B0C0E] px-3 py-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-[#747984]">Provas descobertas</span>
                  <strong className="ml-2 font-mono text-[#D9DCE2]">{assessment.discoveredEvidenceCount}</strong>
                </div>
                <div className="rounded-lg border border-[#292A30] bg-[#0B0C0E] px-3 py-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-[#747984]">Provas juntadas</span>
                  <strong className="ml-2 font-mono text-[#D9DCE2]">{assessment.selectedEvidenceCount}</strong>
                </div>
                <div className="rounded-lg border border-[#292A30] bg-[#0B0C0E] px-3 py-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-[#747984]">Cobertura crucial</span>
                  <strong className="ml-2 font-mono text-[#D9DCE2]">{assessment.investigationCoveragePercent}%</strong>
                </div>
              </div>

              {assessment.issues.length > 0 && (
                <div className="mt-4 rounded-lg border border-[#F87171]/25 bg-[#F87171]/[0.05] p-3">
                  <div className="flex items-center gap-2 text-[#FCA5A5]">
                    <AlertTriangle size={15} />
                    <span className="text-[9px] font-black uppercase tracking-[0.14em]">Falhas encontradas pelo magistrado</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {assessment.issues.map((issue) => (
                      <span key={issue} className="rounded-md border border-[#F87171]/25 bg-[#160D0F] px-2 py-1 text-[10px] text-[#E7A4A4]">
                        {ISSUE_LABELS[issue]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {assessment.missingRequiredEvidenceTitles.length > 0 && (
                <p className="mt-3 text-[11px] leading-relaxed text-[#B6BAC3]">
                  <strong className="text-[#E1C477]">Provas essenciais não juntadas:</strong> {assessment.missingRequiredEvidenceTitles.join(', ')}.
                </p>
              )}

              {assessment.falseEvidenceTitles.length > 0 && (
                <p className="mt-2 text-[11px] leading-relaxed text-[#F0A5A5]">
                  <strong>Material considerado inautêntico:</strong> {assessment.falseEvidenceTitles.join(', ')}.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E]">
              <Coins size={18} className="mx-auto text-[#34D399] mb-1" />
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Honorários</span>
              <span className="font-bold text-[#34D399] text-sm sm:text-base font-mono">
                +{result.earnedMoney.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E]">
              <Sparkles size={18} className="mx-auto text-[#60A5FA] mb-1" />
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Experiência</span>
              <span className="font-bold text-[#60A5FA] text-sm sm:text-base font-mono">
                +{result.earnedXp} XP
              </span>
            </div>

            <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E]">
              <Award size={18} className="mx-auto text-[#C5A059] mb-1" />
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Reputação</span>
              <span className={`font-bold text-sm sm:text-base font-mono ${result.earnedReputation >= 0 ? 'text-[#C5A059]' : 'text-[#F87171]'}`}>
                {result.earnedReputation >= 0 ? `+${result.earnedReputation}%` : `${result.earnedReputation}%`}
              </span>
            </div>
          </div>

          {(result.socialJuridicoBonus || 0) > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/[0.07] p-3.5">
              <div className="rounded-lg bg-[#C5A059]/15 p-2 text-[#C5A059]">
                <Laptop size={17} />
              </div>
              <div>
                <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#C5A059]">Apoio tecnológico utilizado</span>
                <p className="mt-1 text-xs leading-relaxed text-[#CFC4AA]">
                  As ferramentas simuladas do Notebook Social Jurídico contribuíram com <strong className="text-[#F1D79D]">+{result.socialJuridicoBonus} pontos</strong> para a preparação do caso. O limite máximo de apoio tecnológico é de 10 pontos por processo.
                </p>
              </div>
            </div>
          )}

          <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E] flex items-center justify-between text-xs text-[#888888]">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-[#C5A059]" />
              <span>Tempo Utilizado: <strong className="text-[#E0E0E0]">{result.hoursUsed}h</strong> de {result.totalAllowedHours}h disponíveis</span>
            </div>
            <span className={result.hoursUsed <= result.totalAllowedHours ? 'text-[#34D399] font-semibold' : 'text-[#F87171] font-semibold'}>
              {result.hoursUsed <= result.totalAllowedHours ? '✓ Tempestivo (No Prazo)' : '⚠ Extemporâneo (Fora do Prazo)'}
            </span>
          </div>
        </div>

        <div className="p-5 bg-[#111113] border-t border-[#2A2A2E] flex items-center justify-end">
          <button
            onClick={() => {
              sound.playClick();
              onNextCaseOrHub();
            }}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#C5A059] hover:bg-[#D4B475] text-[#0A0A0B] font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#C5A059]/20 transition-all cursor-pointer transform active:scale-98"
          >
            <span>{result.supervisorReview ? 'Retornar ao Escritório' : 'Retornar ao Escritório e Avançar'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};