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
  FileText,
  Scale
} from 'lucide-react';
import { sound } from '../utils/sound';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-6 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="bg-[#111113] px-6 py-5 border-b border-[#2A2A2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1A1A1D] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059]">
              <Scale size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0A0A0B] text-[#C5A059] border border-[#2A2A2E]">
                  {caseData.code}
                </span>
                <span className="text-xs text-[#888888] font-semibold">{caseData.area}</span>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-[#0A0A0B]">
          {/* Client Card */}
          <div className="p-4 bg-[#161618] rounded-xl border border-[#2A2A2E] flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#C5A059] flex items-center justify-center text-[#0A0A0B] font-bold text-lg shrink-0 shadow-inner">
              <User size={22} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#E0E0E0]">{caseData.client.name}</h3>
                <span className="text-xs text-[#888888]">({caseData.client.occupation})</span>
              </div>
              <p className="text-xs text-[#AAAAAA] leading-relaxed">
                {caseData.client.summary}
              </p>
            </div>
          </div>

          {/* Mentor Quote & Instructions */}
          <div className="p-4 bg-[#161618] border-l-4 border-l-[#C5A059] border-y border-r border-[#2A2A2E] rounded-r-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#C5A059] uppercase tracking-wider">
              <Briefcase size={14} />
              <span>Instruções da Coordenação Forense:</span>
            </div>
            <p className="text-xs text-[#CCCCCC] leading-relaxed italic font-serif">
              "{caseData.briefing.mentorQuote}"
            </p>
          </div>

          {/* Key Facts Checklist */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888]">
              Fatos Iniciais Apurados:
            </h4>
            <div className="space-y-1.5">
              {caseData.briefing.facts.map((fact, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#111113] rounded-xl border border-[#222226] text-xs text-[#CCCCCC] flex items-start gap-2.5"
                >
                  <span className="text-[#C5A059] font-bold text-sm">▶</span>
                  <span className="leading-snug">{fact}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rewards & Constraints Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
            <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E]">
              <Clock size={16} className="mx-auto text-[#C5A059] mb-1" />
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Prazo Fatal</span>
              <span className="font-bold text-[#C5A059] text-sm font-mono">{caseData.deadlineHours} horas</span>
            </div>

            <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E]">
              <Coins size={16} className="mx-auto text-[#34D399] mb-1" />
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Honorários</span>
              <span className="font-bold text-[#34D399] text-sm font-mono">
                R$ {caseData.honorariosReward.toLocaleString('pt-BR')}
              </span>
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

        {/* Footer Action */}
        <div className="p-5 bg-[#111113] border-t border-[#2A2A2E] flex items-center justify-between">
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
            onClick={() => {
              sound.playGavel();
              onAcceptCase(caseData);
            }}
            className="px-8 py-3 rounded-xl bg-[#C5A059] hover:bg-[#D4B475] text-[#0A0A0B] font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#C5A059]/20 transition-all cursor-pointer transform active:scale-98"
          >
            <span>Aceitar Caso e Iniciar Diligências</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
