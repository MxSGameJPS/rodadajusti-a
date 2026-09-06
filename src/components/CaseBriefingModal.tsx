import React from 'react';
import { LegalCase, PlayerProfile } from '../types/game';
import {
  X,
  Briefcase,
  Clock,
  Coins,
  Sparkles,
  Award,
  ArrowRight,
  User,
  AlertCircle,
  Scale,
  LockKeyhole,
  CheckCircle2
} from 'lucide-react';
import { CAREER_TIERS } from '../data/careers';
import { GAME_CASES } from '../data/cases';
import { getCareerRank, getCaseRewardBreakdown } from '../lib/caseRules';
import {
  STAGE_CONFIG,
  getAppealOfCaseId,
  getCaseRepercussionLevel,
  getProceduralStage,
} from '../lib/caseMetadata';
import { getProcessStatusInfo } from '../lib/processLifecycle';
import { sound } from '../utils/sound';
import { CaseMetadataBadges, ProcessStatusPanel } from './CaseLifecycle/CaseLifecycle';

interface CaseBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: LegalCase;
  player: PlayerProfile;
  onAcceptCase: (c: LegalCase) => void;
}

export const CaseBriefingModal: React.FC<CaseBriefingModalProps> = ({
  isOpen,
  onClose,
  caseData,
  player,
  onAcceptCase,
}) => {
  if (!isOpen) return null;

  const stage = getProceduralStage(caseData);
  const currentCareerIndex = getCareerRank(player.careerTier);
  const requiredCareerIndex = Math.max(
    getCareerRank(caseData.minCareerTier),
    getCareerRank(STAGE_CONFIG[stage].minimumCareerTier),
  );
  const hasCareerAccess = currentCareerIndex >= requiredCareerIndex;
  const previousRecord = player.history.find((item) => item.caseId === caseData.id) || null;
  const alreadyHandled = !!previousRecord;
  const isCurrentActiveCase = player.activeCase?.caseId === caseData.id;
  const hasAnotherActiveCase = !!player.activeCase && !isCurrentActiveCase;
  const appealOfCaseId = getAppealOfCaseId(caseData);
  const isAppealCase = !!appealOfCaseId;
  const predecessorExists = appealOfCaseId
    ? player.history.some((item) => item.caseId === appealOfCaseId)
    : true;
  const canAccept = hasCareerAccess && !alreadyHandled && !isCurrentActiveCase && !hasAnotherActiveCase && !isAppealCase;
  const minimumTier = Object.values(CAREER_TIERS).find((tier) => getCareerRank(tier.id) === requiredCareerIndex);
  const requiredCareerTitle = minimumTier?.title || CAREER_TIERS[caseData.minCareerTier]?.title || caseData.minCareerTier;
  const rewardBreakdown = getCaseRewardBreakdown(caseData);
  const hasRepercussion = getCaseRepercussionLevel(caseData) !== 'COMUM';
  const processStatus = previousRecord ? getProcessStatusInfo(previousRecord, player, GAME_CASES) : null;

  const blockedReason = alreadyHandled
    ? processStatus?.status === 'TRANSITO_EM_JULGADO'
      ? 'Esta fase processual já foi julgada e o processo está em trânsito em julgado. Ela permanece no histórico, mas não pode ser repetida.'
      : 'Esta fase processual já foi julgada. O próximo passo, quando cabível, é o recurso indicado no status do processo — nunca repetir a mesma instância.'
    : isCurrentActiveCase
      ? 'Este é o processo que já está em andamento. Retorne ao mapa de diligências para continuar a investigação.'
      : hasAnotherActiveCase
        ? 'Há outro processo em andamento. Conclua o caso atual antes de assumir uma nova responsabilidade profissional.'
        : isAppealCase
          ? predecessorExists
            ? 'Esta é uma fase recursal vinculada a um processo anterior. Recursos são distribuídos pelo CRM do escritório e não podem ser iniciados como um caso independente.'
            : 'Esta fase recursal depende de uma decisão anterior do mesmo processo e não pode ser iniciada isoladamente.'
          : !hasCareerAccess
            ? `Este processo exige o nível profissional ${requiredCareerTitle}. Continue evoluindo na carreira para desbloqueá-lo.`
            : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-6 flex flex-col max-h-[90vh]">
        <div className="bg-[#111113] px-6 py-5 border-b border-[#2A2A2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1A1A1D] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059]">
              <Scale size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0A0A0B] text-[#C5A059] border border-[#2A2A2E]">
                  {caseData.code}
                </span>
                <span className="text-xs text-[#888888] font-semibold">{caseData.area}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  hasCareerAccess
                    ? 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/30'
                    : 'bg-[#F87171]/10 text-[#F87171] border-[#F87171]/30'
                }`}>
                  {hasCareerAccess ? 'Nível compatível' : `Requer ${requiredCareerTitle}`}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-serif text-[#E0E0E0] mt-0.5">
                {caseData.title}
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-lg bg-[#1A1A1D] hover:bg-[#2A2A2E] text-[#888888] hover:text-[#E0E0E0] border border-[#2A2A2E] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-[#0A0A0B]">
          <CaseMetadataBadges caseItem={caseData} />

          {blockedReason && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              alreadyHandled
                ? 'bg-[#C5A059]/8 border-[#C5A059]/30 text-[#E6D2A2]'
                : 'bg-[#F87171]/8 border-[#F87171]/30 text-[#FCA5A5]'
            }`}>
              {alreadyHandled ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <LockKeyhole size={18} className="shrink-0 mt-0.5" />}
              <div>
                <div className="font-bold text-xs uppercase tracking-wider mb-1">
                  {alreadyHandled ? 'Fase processual já julgada' : 'Responsabilidade profissional bloqueada'}
                </div>
                <p className="text-xs leading-relaxed opacity-90">{blockedReason}</p>
              </div>
            </div>
          )}

          {previousRecord && (
            <ProcessStatusPanel record={previousRecord} player={player} catalog={GAME_CASES} />
          )}

          <div className="p-4 bg-[#161618] rounded-xl border border-[#2A2A2E] flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#C5A059] flex items-center justify-center text-[#0A0A0B] font-bold text-lg shrink-0 shadow-inner">
              <User size={22} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-[#E0E0E0]">{caseData.client.name}</h3>
                <span className="text-xs text-[#888888]">({caseData.client.occupation})</span>
              </div>
              <p className="text-xs text-[#AAAAAA] leading-relaxed">{caseData.client.summary}</p>
            </div>
          </div>

          <div className="p-4 bg-[#161618] border-l-4 border-l-[#C5A059] border-y border-r border-[#2A2A2E] rounded-r-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#C5A059] uppercase tracking-wider">
              <Briefcase size={14} />
              <span>Instruções da Coordenação Forense:</span>
            </div>
            <p className="text-xs text-[#CCCCCC] leading-relaxed italic font-serif">"{caseData.briefing.mentorQuote}"</p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888]">Fatos Iniciais Apurados:</h4>
            <div className="space-y-1.5">
              {caseData.briefing.facts.map((fact, idx) => (
                <div key={idx} className="p-3 bg-[#111113] rounded-xl border border-[#222226] text-xs text-[#CCCCCC] flex items-start gap-2.5">
                  <span className="text-[#C5A059] font-bold text-sm">▶</span>
                  <span className="leading-snug">{fact}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-[#111113] rounded-xl border border-[#2A2A2E]">
            <div className="flex items-start gap-3">
              <AlertCircle size={17} className="text-[#60A5FA] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#60A5FA] font-bold">Contexto de aprendizado</span>
                <p className="text-xs text-[#CCCCCC] leading-relaxed">{caseData.briefing.legalContext}</p>
                <p className="text-xs text-[#AAAAAA] leading-relaxed"><strong className="text-[#E0E0E0]">Objetivo:</strong> {caseData.briefing.mainObjective}</p>
              </div>
            </div>
          </div>

          {hasRepercussion && (
            <div className="p-4 rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/[0.06]">
              <span className="text-[10px] uppercase tracking-wider text-[#D9BD7A] font-bold">Recompensa ampliada por repercussão</span>
              <p className="mt-1 text-xs leading-relaxed text-[#CFC4AA]">
                XP-base: <strong>{rewardBreakdown.baseXp}</strong> • bônus: <strong>+{rewardBreakdown.repercussionXpBonus} XP</strong> • reputação adicional: <strong>+{rewardBreakdown.repercussionReputationBonus}%</strong>.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
            <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E]">
              <Clock size={16} className="mx-auto text-[#C5A059] mb-1" />
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Prazo Fatal</span>
              <span className="font-bold text-[#C5A059] text-sm font-mono">{caseData.deadlineHours} horas</span>
            </div>
            <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E]">
              <Coins size={16} className="mx-auto text-[#34D399] mb-1" />
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Honorários</span>
              <span className="font-bold text-[#34D399] text-sm font-mono">R$ {caseData.honorariosReward.toLocaleString('pt-BR')}</span>
            </div>
            <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E]">
              <Sparkles size={16} className="mx-auto text-[#60A5FA] mb-1" />
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Recompensa XP</span>
              <span className="font-bold text-[#60A5FA] text-sm font-mono">+{caseData.xpReward} XP</span>
            </div>
            <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E]">
              <Award size={16} className="mx-auto text-[#C5A059] mb-1" />
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Reputação</span>
              <span className="font-bold text-[#C5A059] text-sm font-mono">+{caseData.reputationReward}%</span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-[#111113] border-t border-[#2A2A2E] flex items-center justify-between gap-3">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-[#1A1A1D] hover:bg-[#222226] text-[#AAAAAA] hover:text-[#E0E0E0] border border-[#2A2A2E] font-semibold text-xs transition-colors cursor-pointer"
          >
            Examinar Mais Tarde
          </button>

          <button
            disabled={!canAccept}
            onClick={() => {
              if (!canAccept) return;
              sound.playGavel();
              onAcceptCase(caseData);
            }}
            className={`px-8 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 transition-all ${
              canAccept
                ? 'bg-[#C5A059] hover:bg-[#D4B475] text-[#0A0A0B] shadow-lg shadow-[#C5A059]/20 cursor-pointer transform active:scale-98'
                : 'bg-[#222226] text-[#666666] border border-[#2A2A2E] cursor-not-allowed'
            }`}
          >
            <span>
              {alreadyHandled
                ? processStatus?.status === 'TRANSITO_EM_JULGADO' ? 'Trânsito em Julgado' : 'Consulte o Recurso no CRM'
                : isCurrentActiveCase
                  ? 'Caso em Andamento'
                  : hasAnotherActiveCase
                    ? 'Conclua o Caso Atual'
                    : isAppealCase
                      ? 'Fase Recursal via CRM'
                      : !hasCareerAccess
                        ? `Requer ${requiredCareerTitle}`
                        : 'Aceitar Caso e Iniciar Diligências'}
            </span>
            {canAccept ? <ArrowRight size={16} /> : <LockKeyhole size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
};
