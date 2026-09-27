import React from 'react';
import { AlertTriangle, BriefcaseBusiness, Clock3, Scale } from 'lucide-react';
import type { PlayerProfile } from '../types/game';
import { getSeniorDailyDesk } from '../lib/seniorInternEngine';

interface Props { player: PlayerProfile; onChoosePriority: (id: string) => void; }

export const SeniorInternDesk: React.FC<Props> = ({ player, onChoosePriority }) => {
  if (player.careerTier !== 'ESTAGIARIO_SENIOR') return null;
  const desk = getSeniorDailyDesk(player);
  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-[#C5A059]/30 bg-[#0D0D0F]">
      <div className="border-b border-[#2A2A2E] p-5">
        <span className="text-[9px] font-black uppercase tracking-[.18em] text-[#C5A059]">Mesa do Estagiário Sênior</span>
        <h3 className="mt-1 font-serif text-xl font-black text-[#F1EFE9]">Você define a prioridade</h3>
        <p className="mt-1 text-xs text-[#969188]">Mariana apresenta as demandas; agora cabe a você decidir o que merece atenção primeiro.</p>
      </div>
      <div className="grid gap-3 p-5 md:grid-cols-2">
        {desk.map((item) => (
          <button key={item.id} type="button" onClick={() => onChoosePriority(item.id)} className="rounded-xl border border-[#29292E] bg-[#0B0B0D] p-4 text-left transition hover:border-[#C5A059]/45 hover:bg-[#C5A059]/[.05]">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-[#C5A059]"><BriefcaseBusiness size={14}/>{item.urgency}</span>
              <span className="flex items-center gap-1 font-mono text-[9px] text-[#77777F]"><Clock3 size={12}/>{item.minutes} min</span>
            </div>
            <strong className="mt-2 block text-sm text-[#E4E1DA]">{item.title}</strong>
            <p className="mt-1 text-[10px] leading-relaxed text-[#8F8F96]">{item.detail}</p>
            <div className="mt-3 flex items-center justify-between text-[9px]">
              <span className="text-[#9C978D]">Prazo: {item.dueLabel}</span>
              {item.recommended && <span className="flex items-center gap-1 text-[#D8B66B]"><AlertTriangle size={11}/> risco prioritário</span>}
            </div>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-[#29292E] px-5 py-3 text-[10px] text-[#77777F]"><Scale size={14}/> A autonomia é supervisionada: decisões continuam sujeitas à revisão do advogado responsável.</div>
    </section>
  );
};
