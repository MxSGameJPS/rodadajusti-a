import React from 'react';
import { LegalCase, PlayerProfile, CareerTierId } from '../types/game';
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
import { sound } from '../utils/sound';

interface CaseBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: LegalCase;
  player: PlayerProfile;
  onAcceptCase: (c: LegalCase) => void;
}

const CAREER_ORDER: CareerTierId[] = [
  'ESTAGIARIO',
  'ESTAGIARIO_SENIOR',
  'ADVOGADO_CONTRATADO',
  'ADVOGADO_SENIOR',
  'SOCIO_ESCRITORIO',
  'DONO_ESCRITORIO',
  'MAGISTRADO_SUBSTITUTO',
  'JUIZ_TITULAR',
  'DESEMBARGADOR',
  'MINISTRO_STF'
];

export const CaseBriefingModal: React.FC<CaseBriefingModalProps> = ({
  isOpen,
  onClose,
  caseData,
  player,
  onAcceptCase,
}) => {
  if (!isOpen) return null;

  const currentCareerIndex = CAREER_ORDER.indexOf(player.careerTier);
  const requiredCareerIndex = CAREER_ORDER.indexOf(caseData.minCareerTier);
  const hasCareerAccess = currentCareerIndex >= requiredCareerIndex;
  const alreadyCompleted = player.history.some((item) => item.caseId === caseData.id && item.success);
  const isCurrentActiveCase = player.activeCase?.caseId === caseData.id;
  const hasAnotherActiveCase = !!player.activeCase && !isCurrentActiveCase;
  const canAccept = hasCareerAccess && !alreadyCompleted && !isCurrentActiveCase && !hasAnotherActiveCase;
  const requiredCareerTitle = CAREER_TIERS[caseData.minCareerTier]?.title || caseData.minCareerTier;

  const blockedReason = alreadyCompleted
    ? 'Este processo já foi concluído com êxito. Ele permanece disponível para consulta no histórico, mas não concede novamente XP, reputação ou progressão de carreira.'
    : isCurrentActiveCase
    ? 'Este é o processo que já está em andamento. Retorne ao mapa de diligências para continuar a investigação.'
    : hasAnotherActiveCase
    ? 'Há outro processo em andamento. Conclua o caso atual antes de assumir uma nova responsabilidade profissional.'
    : !hasCareerAccess
    ? `Este processo exige o nível profissional ${requiredCareerTitle}. Continue resolvendo os casos adequados ao seu estágio de carreira para desbloqueá-lo.`
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
          {blockedReason && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              alreadyCompleted
                ? 'bg-[#34D399]/8 border-[#34D399]/30 text-[#B7F7D8]'
                : 'bg-[#F87171]/8 border-[#F87171]/30 text-[#FCA5A5]'
            }`}>
              {alreadyCompleted ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <LockKeyhole size={18} className="shrink-0 mt-0.5" />}
              <div>
                <div className="font-bold text-xs uppercase tracking-wider mb-1">
                  {alreadyCompleted ? 'Caso já concluído' : 'Responsabilidade profissional bloqueada'}
                </div>
                <p className="text-xs leading-relaxed opacity-90">{blockedReason}</p>
              </div>
            </div>
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
              {alreadyCompleted
                ? 'Caso Concluído'
                : isCurrentActiveCase
                ? 'Caso em Andamento'
                : hasAnotherActiveCase
                ? 'Conclua o Caso Atual'
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
