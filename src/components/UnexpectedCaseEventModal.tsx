import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, X } from 'lucide-react';
import type { UnexpectedCaseEvent, UnexpectedCaseEventChoice } from '../lib/reactiveWorldStore';
import { sound } from '../utils/sound';

interface UnexpectedCaseEventModalProps {
  isOpen: boolean;
  event: UnexpectedCaseEvent | null;
  onResolve: (choice: UnexpectedCaseEventChoice) => void;
  onCloseAfterResolution: () => void;
}

export const UnexpectedCaseEventModal: React.FC<UnexpectedCaseEventModalProps> = ({
  isOpen,
  event,
  onResolve,
  onCloseAfterResolution,
}) => {
  const [resolvedChoice, setResolvedChoice] = useState<UnexpectedCaseEventChoice | null>(null);

  if (!isOpen || !event) return null;

  const choose = (choice: UnexpectedCaseEventChoice) => {
    if (resolvedChoice) return;
    sound.playPaper();
    onResolve(choice);
    setResolvedChoice(choice);
  };

  const finish = () => {
    sound.playClick();
    setResolvedChoice(null);
    onCloseAfterResolution();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-[#070708]/92 p-3 backdrop-blur-md sm:p-6">
      <div className="my-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-[#C5A059]/30 bg-[#111113] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#2A2A2E] bg-gradient-to-r from-[#171513] to-[#111113] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#F5B942]">
              <AlertTriangle size={21} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C5A059]">{event.eyebrow}</span>
              <h2 className="mt-1 font-serif text-xl font-black text-[#F1EEE7]">{event.title}</h2>
              <span className="mt-1 block text-[10px] uppercase tracking-wider text-[#7F7A72]">Origem: {event.sourceLabel}</span>
            </div>
          </div>

          {resolvedChoice && (
            <button type="button" onClick={finish} className="rounded-lg border border-[#2A2A2E] bg-[#171719] p-2 text-[#888] hover:text-[#EEE]" aria-label="Fechar">
              <X size={17} />
            </button>
          )}
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <p className="text-sm leading-7 text-[#BCB7AE]">{event.description}</p>

          {!resolvedChoice ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#C5A059]">Como você vai agir?</span>
                <span className="text-[10px] text-[#6F6B65]">Não há opção marcada como correta</span>
              </div>

              {event.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => choose(choice)}
                  className="group flex w-full items-start justify-between gap-4 rounded-xl border border-[#2A2A2E] bg-[#161618] p-4 text-left transition hover:border-[#C5A059]/45 hover:bg-[#1A1A1D]"
                >
                  <div>
                    <strong className="text-sm text-[#E8E4DB]">{choice.label}</strong>
                    <p className="mt-1 text-xs leading-relaxed text-[#8F8A83]">{choice.description}</p>
                  </div>
                  <ArrowRight size={17} className="mt-1 shrink-0 text-[#C5A059] transition group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#34D399]/25 bg-[#34D399]/[0.06] p-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#6EE7B7]">
                  <CheckCircle2 size={15} /> Decisão registrada
                </div>
                <strong className="mt-2 block text-sm text-[#E5E1D8]">{resolvedChoice.label}</strong>
                <p className="mt-2 text-xs leading-6 text-[#A9A49C]">{resolvedChoice.resolution}</p>
              </div>

              {resolvedChoice.timePenaltyHours > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-[#F59E0B]/25 bg-[#F59E0B]/[0.05] p-3 text-xs leading-relaxed text-[#D8BD80]">
                  <Clock3 size={15} className="mt-0.5 shrink-0" />
                  <span>Essa decisão consumiu aproximadamente <strong>{resolvedChoice.timePenaltyHours}h</strong> da preparação do caso. O prazo processual passa a considerar esse tempo.</span>
                </div>
              )}

              <button
                type="button"
                onClick={finish}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#0A0A0B] hover:bg-[#D4B475]"
              >
                Continuar o caso <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
