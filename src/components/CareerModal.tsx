import React from 'react';
import { PlayerProfile, CareerTierId } from '../types/game';
import { CAREER_TIERS } from '../data/careers';
import { X, Award, CheckCircle2, Lock, ChevronRight, Scale, Landmark, Building } from 'lucide-react';
import { sound } from '../utils/sound';

interface CareerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onSelectCareerPath?: (tierId: CareerTierId) => void;
}

export const CareerModal: React.FC<CareerModalProps> = ({ isOpen, onClose, player }) => {
  if (!isOpen) return null;

  const tiers = Object.values(CAREER_TIERS);
  const currentTier = CAREER_TIERS[player.careerTier];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#111113] px-6 py-4 border-b border-[#2A2A2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1A1A1D] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059]">
              <Award size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-serif text-[#E0E0E0] flex items-center gap-2">
                Plano de Carreira Jurídica Nacional
              </h2>
              <p className="text-xs text-[#888888]">
                Progresso profissional de <strong className="text-[#C5A059]">{player.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-lg bg-[#1A1A1D] hover:bg-[#222226] text-[#888888] hover:text-[#E0E0E0] border border-[#2A2A2E] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Status Overview */}
        <div className="p-4 bg-[#0D0D0E] border-b border-[#222226] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="p-2.5 bg-[#161618] rounded-xl border border-[#2A2A2E]">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Cargo Atual</span>
            <span className="font-bold text-[#C5A059] text-sm">{currentTier.title}</span>
          </div>
          <div className="p-2.5 bg-[#161618] rounded-xl border border-[#2A2A2E]">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Casos Concluídos</span>
            <span className="font-bold text-[#34D399] text-sm">{player.casesSolved} caso(s)</span>
          </div>
          <div className="p-2.5 bg-[#161618] rounded-xl border border-[#2A2A2E]">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Experiência (XP)</span>
            <span className="font-bold text-[#60A5FA] text-sm">{player.xp} XP</span>
          </div>
          <div className="p-2.5 bg-[#161618] rounded-xl border border-[#2A2A2E]">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Reputação</span>
            <span className="font-bold text-[#C5A059] text-sm">{player.reputation}%</span>
          </div>
        </div>

        {/* Tiers List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-[#0A0A0B]">
          <h3 className="text-xs font-bold tracking-widest uppercase text-[#C5A059] flex items-center gap-1.5">
            <Scale size={14} className="text-[#C5A059]" />
            <span>Trilha da Advocacia Privada & Sociedade</span>
          </h3>

          <div className="space-y-3">
            {tiers
              .filter((t) => t.category === 'advocacia' || t.category === 'gestao')
              .map((tier) => {
                const isCurrent = player.careerTier === tier.id;
                const isUnlocked = player.casesSolved >= tier.minCasesSolved && player.xp >= tier.minXp;
                
                return (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-[#1A1A1D] border-[#C5A059] ring-1 ring-[#C5A059]/40 shadow-md'
                        : isUnlocked
                        ? 'bg-[#161618] border-[#2A2A2E] hover:border-[#3A3A42]'
                        : 'bg-[#111113] border-[#222226] opacity-75'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                            isCurrent
                              ? 'bg-[#C5A059] text-[#0A0A0B] shadow-md'
                              : isUnlocked
                              ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30'
                              : 'bg-[#1A1A1D] text-[#666666] border border-[#2A2A2E]'
                          }`}
                        >
                          {isCurrent ? <Award size={18} /> : isUnlocked ? <CheckCircle2 size={16} /> : <Lock size={15} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-[#E0E0E0] text-sm sm:text-base">{tier.title}</h4>
                            {isCurrent && (
                              <span className="text-[9px] px-2 py-0.5 bg-[#C5A059] text-[#0A0A0B] font-bold uppercase tracking-wider rounded-full">
                                Cargo Atual
                              </span>
                            )}
                            {tier.category === 'gestao' && (
                              <span className="text-[9px] px-2 py-0.5 bg-[#34D399]/10 text-[#34D399] font-semibold rounded border border-[#34D399]/30">
                                Módulo de Gestão
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#AAAAAA] mt-1 leading-relaxed">{tier.description}</p>
                        </div>
                      </div>

                      {/* Requirements and Salary */}
                      <div className="sm:text-right shrink-0 text-xs mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#2A2A2E]">
                        <div className="font-mono text-[#34D399] font-bold">
                          {tier.salaryBaseMonthly > 0
                            ? `R$ ${tier.salaryBaseMonthly.toLocaleString('pt-BR')}/mês`
                            : 'Honorários Próprios'}
                        </div>
                        <div className="text-[11px] text-[#888888] mt-0.5 font-mono">
                          Req: {tier.minCasesSolved} Casos • {tier.minXp} XP
                        </div>
                      </div>
                    </div>

                    {/* Perks List */}
                    <div className="mt-3 pt-2.5 border-t border-[#2A2A2E] flex flex-wrap gap-1.5">
                      {tier.perks.map((perk, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-[#111113] text-[#CCCCCC] px-2 py-0.5 rounded border border-[#222226]"
                        >
                          ✓ {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>

          <h3 className="text-xs font-bold tracking-widest uppercase text-[#F87171] flex items-center gap-1.5 pt-4">
            <Landmark size={14} className="text-[#F87171]" />
            <span>Trilha da Magistratura & Tribunais Superiores</span>
          </h3>

          <div className="space-y-3">
            {tiers
              .filter((t) => t.category === 'magistratura')
              .map((tier) => {
                const isCurrent = player.careerTier === tier.id;
                const isUnlocked = player.careerTier === tier.id;

                return (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-[#1A1A1D] border-[#F87171] ring-1 ring-[#F87171]/40 shadow-md'
                        : isUnlocked
                        ? 'bg-[#161618] border-[#2A2A2E]'
                        : 'bg-[#111113] border-[#222226] opacity-75'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                            isCurrent
                              ? 'bg-[#F87171] text-[#0A0A0B] shadow-md'
                              : 'bg-[#1A1A1D] text-[#666666] border border-[#2A2A2E]'
                          }`}
                        >
                          {isCurrent ? <Award size={18} /> : <Lock size={15} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-[#E0E0E0] text-sm sm:text-base">{tier.title}</h4>
                            {isCurrent && (
                              <span className="text-[9px] px-2 py-0.5 bg-[#F87171] text-[#0A0A0B] font-bold uppercase tracking-wider rounded-full">
                                Cargo Atual
                              </span>
                            )}
                            {tier.id === 'MINISTRO_STF' && (
                              <span className="text-[9px] px-2 py-0.5 bg-[#C5A059]/10 text-[#C5A059] font-bold rounded border border-[#C5A059]/30">
                                ★ Conquista Lendária Máxima
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#AAAAAA] mt-1 leading-relaxed">{tier.description}</p>
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0 text-xs mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#2A2A2E]">
                        <div className="font-mono text-[#34D399] font-bold">
                          Subsídio: R$ {tier.salaryBaseMonthly.toLocaleString('pt-BR')}/mês
                        </div>
                        <div className="text-[11px] text-[#888888] mt-0.5">
                          {tier.id === 'MINISTRO_STF' ? 'Requisito: Notável Saber Jurídico' : 'Via Concurso de Magistratura'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#2A2A2E] flex flex-wrap gap-1.5">
                      {tier.perks.map((perk, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-[#111113] text-[#CCCCCC] px-2 py-0.5 rounded border border-[#222226]"
                        >
                          ✓ {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#111113] border-t border-[#2A2A2E] flex items-center justify-end">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-[#1A1A1D] hover:bg-[#222226] text-[#E0E0E0] border border-[#2A2A2E] text-sm font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
