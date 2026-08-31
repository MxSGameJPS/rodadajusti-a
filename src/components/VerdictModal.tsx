import React from 'react';
import { LegalCase, CaseHistoryRecord, PlayerProfile, CareerTierId } from '../types/game';
import { CAREER_TIERS } from '../data/careers';
import { 
  Scale, 
  Award, 
  Sparkles, 
  Coins, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { sound } from '../utils/sound';

interface VerdictModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CaseHistoryRecord;
  currentCase: LegalCase;
  player: PlayerProfile;
  promotedToTier: CareerTierId | null;
  onNextCaseOrHub: () => void;
}

export const VerdictModal: React.FC<VerdictModalProps> = ({
  isOpen,
  onClose,
  result,
  currentCase,
  player,
  promotedToTier,
  onNextCaseOrHub,
}) => {
  if (!isOpen) return null;

  const isWin = result.success;
  const promotedTierObj = promotedToTier ? CAREER_TIERS[promotedToTier] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/90 backdrop-blur-lg overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-6">
        {/* Top Court Banner */}
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

          {/* Official Stamp badge */}
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

        {/* Career Promotion Announcement Banner (if achieved) */}
        {promotedTierObj && (
          <div className="p-4 bg-[#C5A059] text-[#0A0A0B] px-6 py-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0A0A0B]/20 text-[#0A0A0B]">
                <Award size={22} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block">
                  ★ Promoção de Carreira Desbloqueada!
                </span>
                <strong className="text-sm sm:text-base font-extrabold">
                  {player.name} foi promovido(a) a {promotedTierObj.title}!
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Sentence Text & Judge's Reasoning */}
        <div className="p-6 space-y-4 text-xs sm:text-sm bg-[#0A0A0B]">
          <div className="p-4 bg-[#161618] rounded-xl border border-[#2A2A2E] space-y-2">
            <div className="flex items-center justify-between text-[#888888] text-xs">
              <span className="font-bold uppercase tracking-wider text-[#C5A059] font-serif">
                Fundamentação do Magistrado:
              </span>
              <span className="font-mono text-[11px]">{result.completedDate}</span>
            </div>
            <p className="text-[#CCCCCC] leading-relaxed italic font-serif">
              "{result.judgeFeedback}"
            </p>
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {/* Dinheiro */}
            <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E]">
              <Coins size={18} className="mx-auto text-[#34D399] mb-1" />
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Honorários</span>
              <span className="font-bold text-[#34D399] text-sm sm:text-base font-mono">
                +{result.earnedMoney.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            {/* XP */}
            <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E]">
              <Sparkles size={18} className="mx-auto text-[#60A5FA] mb-1" />
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Experiência</span>
              <span className="font-bold text-[#60A5FA] text-sm sm:text-base font-mono">
                +{result.earnedXp} XP
              </span>
            </div>

            {/* Reputação */}
            <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E]">
              <Award size={18} className="mx-auto text-[#C5A059] mb-1" />
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Reputação</span>
              <span className={`font-bold text-sm sm:text-base font-mono ${result.earnedReputation >= 0 ? 'text-[#C5A059]' : 'text-[#F87171]'}`}>
                {result.earnedReputation >= 0 ? `+${result.earnedReputation}%` : `${result.earnedReputation}%`}
              </span>
            </div>
          </div>

          {/* Time Analysis */}
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

        {/* Footer Next Case Action */}
        <div className="p-5 bg-[#111113] border-t border-[#2A2A2E] flex items-center justify-end">
          <button
            onClick={() => {
              sound.playClick();
              onNextCaseOrHub();
            }}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#C5A059] hover:bg-[#D4B475] text-[#0A0A0B] font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#C5A059]/20 transition-all cursor-pointer transform active:scale-98"
          >
            <span>Retornar ao Escritório e Avançar</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
