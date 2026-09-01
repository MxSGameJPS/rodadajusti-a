import React from 'react';
import { PlayerProfile } from '../types/game';
import { PUBLIC_EXAM_RULES, isPublicExamEligible } from '../lib/progressionRules';
import { X, Landmark, Lock, CheckCircle2, FileQuestion } from 'lucide-react';
import { sound } from '../utils/sound';

interface ConcursoModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onPassPhase: (phaseId: string) => void;
}

export const ConcursoModal: React.FC<ConcursoModalProps> = ({ isOpen, onClose, player }) => {
  if (!isOpen) return null;
  const extended = player as PlayerProfile & { doctorateLevel?: number };
  const doctorateLevel = Number(extended.doctorateLevel || 0);
  const eligible = isPublicExamEligible(doctorateLevel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-6">
        <div className="bg-[#111113] px-6 py-4 border-b border-[#2A2A2E] flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-[#F87171]/10 border border-[#F87171]/30 flex items-center justify-center text-[#F87171]"><Landmark size={21}/></div><div><h2 className="text-lg font-bold font-serif">Concursos da Magistratura</h2><p className="text-xs text-[#888]">As provas agora são administradas pelo Rota Admin e publicadas no Supabase.</p></div></div>
          <button onClick={() => { sound.playClick(); onClose(); }} className="p-2 rounded-lg bg-[#1A1A1D] text-[#888] border border-[#2A2A2E]"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4 bg-[#0A0A0B]">
          <div className={`p-4 rounded-xl border ${eligible ? 'border-[#34D399]/35 bg-[#34D399]/5' : 'border-[#F87171]/30 bg-[#F87171]/5'}`}>
            <div className="flex items-start gap-3">{eligible ? <CheckCircle2 className="text-[#34D399]" size={20}/> : <Lock className="text-[#F87171]" size={20}/>}<div><h3 className="font-bold">Elegibilidade acadêmica</h3><p className="text-sm text-[#AAA] mt-1">Doutorado atual: <strong className="text-[#E0E0E0]">{doctorateLevel}/5</strong>. Para prestar concurso de Juiz ou Desembargador é necessário nível superior ao Doutorado 3, portanto nível 4 ou 5.</p></div></div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {Object.values(PUBLIC_EXAM_RULES).map((rule) => <div key={rule.examType} className="p-5 rounded-xl border border-[#2A2A2E] bg-[#111113]">
              <div className="flex items-center gap-2"><FileQuestion size={18} className="text-[#C5A059]"/><h3 className="font-bold">{rule.label}</h3></div>
              <p className="text-sm text-[#AAA] mt-2">{rule.questions} questões objetivas.</p>
              <p className="text-xs text-[#888] mt-2">Requisito: {rule.requirementText}.</p>
              <div className={`mt-4 text-xs font-bold ${eligible ? 'text-[#34D399]' : 'text-[#777]'}`}>{eligible ? 'Elegível quando houver prova publicada para este concurso.' : 'Bloqueado pela progressão acadêmica.'}</div>
            </div>)}
          </div>

          <div className="p-4 rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/5 text-xs text-[#CFC5AD]">
            O antigo concurso hardcoded de 100 questões e fases fixas foi desativado. A quantidade, nota de corte, duração e conteúdo passam a vir das provas publicadas pelo administrador.
          </div>
        </div>

        <div className="p-4 bg-[#111113] border-t border-[#2A2A2E] flex justify-end"><button onClick={() => { sound.playClick(); onClose(); }} className="px-5 py-2 rounded-xl bg-[#1A1A1D] border border-[#2A2A2E] text-sm font-semibold">Fechar</button></div>
      </div>
    </div>
  );
};
