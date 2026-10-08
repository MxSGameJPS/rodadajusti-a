import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, MessageCircleMore } from 'lucide-react';
import { sound } from '../utils/sound';

interface OfficeWelcomeDialogProps {
  isOpen: boolean;
  playerName: string;
  city: string;
  initialFocus?: string;
  initialStep: number;
  onAdvance: (nextStep: number) => Promise<boolean>;
  onComplete: () => void;
  isCompleting?: boolean;
}

interface DialogueStep {
  eyebrow: string;
  text: string;
}

export const OfficeWelcomeDialog: React.FC<OfficeWelcomeDialogProps> = ({
  isOpen,
  playerName,
  city,
  initialFocus,
  initialStep,
  onAdvance,
  onComplete,
  isCompleting = false,
}) => {
  const focus = initialFocus === 'consumidor' ? 'Direito do Consumidor' : initialFocus === 'empresarial' ? 'Direito Empresarial' : 'Direito Civil';
  const dialogues = useMemo<DialogueStep[]>(() => [
    { eyebrow: 'Boas-vindas', text: `Olá, ${playerName || 'colega'}! Seja bem-vindo(a) ao Ramos & Associados, em ${city || 'sua cidade'}. Eu sou Mariana Duarte, secretária do escritório. Vou mostrar como tudo funciona por aqui.` },
    { eyebrow: 'Sua supervisão', text: 'O Dr. Roberto Ramos acompanha seu estágio. Você vai trabalhar sob orientação, receber tarefas e ser avaliado(a) por pontualidade, qualidade e conduta. Não precisa saber tudo: precisa perguntar e aprender.' },
    { eyebrow: 'Conheça sua mesa', text: 'Na tela do escritório, a Agenda reúne presença, tarefas e avaliações. Em Casos você consulta as oportunidades supervisionadas, enquanto sua equipe e os outros setores ficam no menu lateral.' },
    { eyebrow: 'Sua rotina', text: 'Fique de olho no relógio: registrar a chegada e a saída faz diferença. Atrasos, faltas e prazos têm consequências. Se precisar de orientação, consulte a agenda e seu supervisor.' },
    { eyebrow: 'Primeiras diligências', text: `Você demonstrou interesse inicial em ${focus}. É um ponto de partida, não uma limitação. Algumas tarefas exigirão visitar lugares no mapa, conversar e reunir documentos antes de qualquer decisão.` },
    { eyebrow: 'Além do trabalho', text: 'Sua carreira também depende da vida fora daqui. Cuide da energia, alimentação, higiene, faculdade e despesas. Você poderá ir para casa ou percorrer a cidade pelo mapa.' },
    { eyebrow: 'Ética e confiança', text: 'A confiança da equipe e dos clientes é conquistada. Suas escolhas profissionais, relacionamentos e respeito às regras poderão abrir portas ou trazer consequências importantes.' },
    { eyebrow: 'Sua primeira atividade', text: 'Agora vamos abrir o escritório. Comece pela Agenda e verifique se já é hora de registrar sua chegada. Depois, consulte as tarefas supervisionadas. Boa sorte: estamos torcendo por você!' },
  ], [city, focus, playerName]);

  const [stepIndex, setStepIndex] = useState(Math.max(0, Math.min(initialStep, dialogues.length - 1)));
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [saveError, setSaveError] = useState('');

  const currentDialogue = dialogues[stepIndex];
  const isLastStep = stepIndex === dialogues.length - 1;
  const isTextComplete = visibleCharacters >= currentDialogue.text.length;

  useEffect(() => {
    if (!isOpen) return;
    setStepIndex(Math.max(0, Math.min(initialStep, dialogues.length - 1)));
    setVisibleCharacters(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isTextComplete) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setVisibleCharacters(currentDialogue.text.length);
      return;
    }

    const timer = window.setTimeout(() => {
      setVisibleCharacters((current) => Math.min(current + 2, currentDialogue.text.length));
    }, 22);

    return () => window.clearTimeout(timer);
  }, [currentDialogue.text, isOpen, isTextComplete, visibleCharacters]);

  if (!isOpen) return null;

  const handleAdvance = async () => {
    if (isAdvancing || isCompleting) return;
    sound.playClick();

    if (!isTextComplete) {
      setVisibleCharacters(currentDialogue.text.length);
      return;
    }

    if (isLastStep) {
      onComplete();
      return;
    }

    setIsAdvancing(true);
    setSaveError('');
    try {
      const saved = await onAdvance(stepIndex + 1);
      if (!saved) { setSaveError('Não foi possível salvar a conversa. Tente novamente.'); return; }
      setStepIndex((current) => current + 1);
      setVisibleCharacters(0);
    } catch {
      setSaveError('Falha de conexão. Tente novamente.');
    } finally { setIsAdvancing(false); }
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-[#080809] text-[#ECE8DE]" role="dialog" aria-modal="true" aria-labelledby="mariana-dialog-title">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_23%_28%,rgba(197,160,89,0.13),transparent_32%),radial-gradient(circle_at_78%_14%,rgba(255,255,255,0.05),transparent_26%),linear-gradient(145deg,#121214_0%,#09090A_48%,#050506_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C5A059]/70 to-transparent" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-end px-4 pb-5 pt-8 sm:px-8 sm:pb-8 lg:flex-row lg:items-end lg:gap-8 lg:px-10 lg:pb-10">
        <div className="pointer-events-none relative mx-auto flex h-[42vh] min-h-[300px] w-full max-w-[520px] items-end justify-center lg:mx-0 lg:h-[78vh] lg:min-h-[620px] lg:max-w-[560px]">
          <div className="absolute bottom-[4%] h-[66%] w-[74%] rounded-full bg-[#C5A059]/10 blur-[80px]" />
          <img
            src="/personagens/mariana-duarte.png"
            alt="Mariana Duarte, secretária do escritório Ramos & Associados"
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
                  <h2 id="mariana-dialog-title" className="truncate font-serif text-lg font-bold text-[#F2EEE5] sm:text-xl">
                    Mariana Duarte
                  </h2>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A49C8F] sm:text-[11px]">
                    <BriefcaseBusiness size={12} className="text-[#C5A059]" />
                    Secretária do Escritório
                  </div>
                </div>
              </div>

              <span className="shrink-0 rounded-full border border-[#C5A059]/25 bg-[#C5A059]/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#CDB06F]">
                {stepIndex + 1} / {dialogues.length}
              </span>
            </div>

            <div className="px-5 py-5 sm:px-7 sm:py-7">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#C5A059]">
                {currentDialogue.eyebrow}
              </p>
              <p className="min-h-[112px] text-base leading-7 text-[#DDD8CF] sm:min-h-[126px] sm:text-lg sm:leading-8">
                {currentDialogue.text.slice(0, visibleCharacters)}
                {!isTextComplete && <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[#C5A059] align-[-0.12em]" aria-hidden="true" />}
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

            {saveError && <p role="alert" className="px-5 py-2 text-sm text-[#FCA5A5]">{saveError}</p>}
            <div className="flex items-center justify-between gap-4 border-t border-[#2B2926] bg-[#0D0D0F] px-5 py-4 sm:px-6">
              <p className="hidden text-[11px] text-[#77737A] sm:block">
                {isTextComplete ? 'Continue quando estiver pronto(a).' : 'Clique para exibir a fala completa.'}
              </p>

              <button
                type="button"
                disabled={isAdvancing || isCompleting}
                onClick={() => void handleAdvance()}
                className="ml-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#111113] shadow-lg shadow-[#C5A059]/15 transition hover:bg-[#D8B56B] active:scale-[0.98] sm:min-w-[190px]"
              >
                {isLastStep && isTextComplete ? (
                  <>
                    <CheckCircle2 size={17} />
                    Conhecer meu posto
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
