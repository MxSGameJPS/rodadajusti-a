import React, { useEffect, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, MessageCircleMore } from 'lucide-react';
import { sound } from '../utils/sound';

export interface NpcGuidanceStep {
  eyebrow: string;
  text: string;
}

interface NpcGuidanceDialogProps {
  isOpen: boolean;
  npcName: string;
  npcRole: string;
  portraitSrc: string;
  portraitAlt: string;
  contextLabel?: string;
  dialogues: NpcGuidanceStep[];
  finalActionLabel: string;
  onComplete: () => void;
}

export const NpcGuidanceDialog: React.FC<NpcGuidanceDialogProps> = ({
  isOpen,
  npcName,
  npcRole,
  portraitSrc,
  portraitAlt,
  contextLabel,
  dialogues,
  finalActionLabel,
  onComplete,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [visibleCharacters, setVisibleCharacters] = useState(0);

  const currentDialogue = dialogues[stepIndex] || dialogues[0];
  const isLastStep = stepIndex === dialogues.length - 1;
  const isTextComplete = currentDialogue
    ? visibleCharacters >= currentDialogue.text.length
    : true;

  useEffect(() => {
    if (!isOpen) return;
    setStepIndex(0);
    setVisibleCharacters(0);
  }, [isOpen, dialogues]);

  useEffect(() => {
    if (!isOpen || !currentDialogue || isTextComplete) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setVisibleCharacters(currentDialogue.text.length);
      return;
    }

    const timer = window.setTimeout(() => {
      setVisibleCharacters((current) => Math.min(current + 2, currentDialogue.text.length));
    }, 22);

    return () => window.clearTimeout(timer);
  }, [currentDialogue, isOpen, isTextComplete, visibleCharacters]);

  if (!isOpen || !currentDialogue || dialogues.length === 0) return null;

  const handleAdvance = () => {
    sound.playClick();

    if (!isTextComplete) {
      setVisibleCharacters(currentDialogue.text.length);
      return;
    }

    if (isLastStep) {
      onComplete();
      return;
    }

    setStepIndex((current) => current + 1);
    setVisibleCharacters(0);
  };

  return (
    <div
      className="fixed inset-0 z-[130] overflow-hidden bg-[#080809] text-[#ECE8DE]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="npc-guidance-dialog-title"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_23%_28%,rgba(197,160,89,0.13),transparent_32%),radial-gradient(circle_at_78%_14%,rgba(255,255,255,0.05),transparent_26%),linear-gradient(145deg,#121214_0%,#09090A_48%,#050506_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C5A059]/70 to-transparent" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-end px-4 pb-5 pt-8 sm:px-8 sm:pb-8 lg:flex-row lg:items-end lg:gap-8 lg:px-10 lg:pb-10">
        <div className="pointer-events-none relative mx-auto flex h-[42vh] min-h-[300px] w-full max-w-[520px] items-end justify-center lg:mx-0 lg:h-[78vh] lg:min-h-[620px] lg:max-w-[560px]">
          <div className="absolute bottom-[4%] h-[66%] w-[74%] rounded-full bg-[#C5A059]/10 blur-[80px]" />
          <img
            src={portraitSrc}
            alt={portraitAlt}
            className="relative z-10 max-h-full w-auto max-w-full object-contain object-bottom drop-shadow-[0_28px_45px_rgba(0,0,0,0.55)]"
            draggable={false}
          />
        </div>

        <div className="relative z-20 -mt-8 w-full pb-1 lg:mb-8 lg:mt-0 lg:max-w-2xl">
          <div className="overflow-hidden rounded-2xl border border-[#C5A059]/30 bg-[#111113]/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 border-b border-[#2B2926] bg-[#171617] px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C5A059]/35 bg-[#C5A059]/10 text-[#D8B56B]">
                  <MessageCircleMore size={20} />
                </div>
                <div className="min-w-0">
                  <h2 id="npc-guidance-dialog-title" className="truncate font-serif text-lg font-bold text-[#F2EEE5] sm:text-xl">
                    {npcName}
                  </h2>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A49C8F] sm:text-[11px]">
                    <BriefcaseBusiness size={12} className="text-[#C5A059]" />
                    {npcRole}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                {contextLabel && (
                  <span className="hidden max-w-[210px] truncate text-[9px] font-bold uppercase tracking-[0.17em] text-[#8E877C] sm:block">
                    {contextLabel}
                  </span>
                )}
                <span className="rounded-full border border-[#C5A059]/25 bg-[#C5A059]/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#CDB06F]">
                  {stepIndex + 1} / {dialogues.length}
                </span>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-7 sm:py-7">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#C5A059]">
                {currentDialogue.eyebrow}
              </p>
              <p className="min-h-[112px] text-base leading-7 text-[#DDD8CF] sm:min-h-[126px] sm:text-lg sm:leading-8">
                {currentDialogue.text.slice(0, visibleCharacters)}
                {!isTextComplete && (
                  <span
                    className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[#C5A059] align-[-0.12em]"
                    aria-hidden="true"
                  />
                )}
              </p>

              <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
                {dialogues.map((_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === stepIndex
                        ? 'w-8 bg-[#C5A059]'
                        : index < stepIndex
                          ? 'w-3 bg-[#7C6940]'
                          : 'w-3 bg-[#343238]'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-[#2B2926] bg-[#0D0D0F] px-5 py-4 sm:px-6">
              <p className="hidden text-[11px] text-[#77737A] sm:block">
                {isTextComplete ? 'Continue quando estiver pronto(a).' : 'Clique para exibir a fala completa.'}
              </p>

              <button
                type="button"
                onClick={handleAdvance}
                className="ml-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#111113] shadow-lg shadow-[#C5A059]/15 transition hover:bg-[#D8B56B] active:scale-[0.98] sm:min-w-[210px]"
              >
                {isLastStep && isTextComplete ? (
                  <>
                    <CheckCircle2 size={17} />
                    {finalActionLabel}
                  </>
                ) : (
                  <>
                    {isTextComplete ? 'Continuar' : 'Mostrar fala'}
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
