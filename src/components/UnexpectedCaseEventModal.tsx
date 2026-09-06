import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Eye,
  Gavel,
  UserRound,
  X,
} from 'lucide-react';
import type { UnexpectedCaseEvent, UnexpectedCaseEventChoice } from '../lib/reactiveWorldStore';
import { sound } from '../utils/sound';

interface UnexpectedCaseEventModalProps {
  isOpen: boolean;
  event: UnexpectedCaseEvent | null;
  resumeLabel?: string;
  onResolve: (choice: UnexpectedCaseEventChoice) => void;
  onCloseAfterResolution: () => void;
}

function getSourceAppearance(sourceLabel: string) {
  const normalized = sourceLabel.toLocaleLowerCase('pt-BR');

  if (normalized.includes('juízo') || normalized.includes('juiz') || normalized.includes('tribunal')) {
    return {
      label: 'Juízo / Tribunal',
      Icon: Gavel,
      accent: 'text-[#F0C96E]',
      border: 'border-[#F0C96E]/35',
      background: 'bg-[#F0C96E]/10',
    };
  }

  if (normalized.includes('cliente')) {
    return {
      label: 'Cliente',
      Icon: UserRound,
      accent: 'text-[#60A5FA]',
      border: 'border-[#60A5FA]/35',
      background: 'bg-[#60A5FA]/10',
    };
  }

  if (normalized.includes('contrária') || normalized.includes('contraria')) {
    return {
      label: 'Parte contrária',
      Icon: BriefcaseBusiness,
      accent: 'text-[#F87171]',
      border: 'border-[#F87171]/35',
      background: 'bg-[#F87171]/10',
    };
  }

  if (normalized.includes('testemunha') || normalized.includes('fonte')) {
    return {
      label: 'Testemunha / Terceiro',
      Icon: Eye,
      accent: 'text-[#A78BFA]',
      border: 'border-[#A78BFA]/35',
      background: 'bg-[#A78BFA]/10',
    };
  }

  return {
    label: sourceLabel || 'Mundo do caso',
    Icon: Activity,
    accent: 'text-[#F59E0B]',
    border: 'border-[#F59E0B]/35',
    background: 'bg-[#F59E0B]/10',
  };
}

export const UnexpectedCaseEventModal: React.FC<UnexpectedCaseEventModalProps> = ({
  isOpen,
  event,
  resumeLabel,
  onResolve,
  onCloseAfterResolution,
}) => {
  const [resolvedChoice, setResolvedChoice] = useState<UnexpectedCaseEventChoice | null>(null);

  useEffect(() => {
    setResolvedChoice(null);
  }, [event?.id, isOpen]);

  const sourceAppearance = useMemo(
    () => getSourceAppearance(event?.sourceLabel || ''),
    [event?.sourceLabel],
  );

  if (!isOpen || !event) return null;

  const SourceIcon = sourceAppearance.Icon;

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
    <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-[#050506]/94 p-3 backdrop-blur-md sm:p-6">
      <div className="my-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-[#F59E0B]/45 bg-[#101012] shadow-[0_28px_100px_rgba(0,0,0,0.65)]">
        <div className="border-b border-[#3B2C18] bg-[linear-gradient(135deg,#2A1D0C_0%,#18130D_46%,#101012_100%)] px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/45 bg-[#F59E0B]/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#F5C56B]">
              <Activity size={12} /> Intercorrência do caso
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9C8462]">
              Evento externo à diligência atual
            </span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 border-b border-[#2A2A2E] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${sourceAppearance.border} ${sourceAppearance.background} ${sourceAppearance.accent}`}>
              <SourceIcon size={22} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C5A059]">{event.eyebrow}</span>
              <h2 className="mt-1 font-serif text-xl font-black text-[#F1EEE7]">{event.title}</h2>
              <span className={`mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${sourceAppearance.accent}`}>
                <SourceIcon size={12} /> Origem: {sourceAppearance.label}
              </span>
            </div>
          </div>

          {resolvedChoice && (
            <button type="button" onClick={finish} className="rounded-lg border border-[#2A2A2E] bg-[#171719] p-2 text-[#888] hover:text-[#EEE]" aria-label="Fechar">
              <X size={17} />
            </button>
          )}
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="rounded-xl border border-[#F59E0B]/25 bg-[#F59E0B]/[0.06] p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[#F5B942]" />
              <div>
                <strong className="text-xs text-[#F1D59A]">O mundo do caso reagiu enquanto você trabalhava.</strong>
                <p className="mt-1 text-xs leading-6 text-[#AFA08A]">
                  {resumeLabel
                    ? `Você estava na diligência em “${resumeLabel}”. Esta intercorrência aconteceu em paralelo e não substitui o que você estava fazendo.`
                    : 'Esta intercorrência aconteceu em paralelo e não substitui a diligência principal do caso.'}
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm leading-7 text-[#BCB7AE]">{event.description}</p>

          {!resolvedChoice ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#F5B942]">Decida como reagir à intercorrência</span>
                <span className="text-[10px] text-[#6F6B65]">O efeito só aparece depois da escolha</span>
              </div>

              {event.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => choose(choice)}
                  className="group flex w-full items-start justify-between gap-4 rounded-xl border border-[#332C24] bg-[#161412] p-4 text-left transition hover:border-[#F59E0B]/55 hover:bg-[#1D1914]"
                >
                  <div>
                    <strong className="text-sm text-[#E8E4DB]">{choice.label}</strong>
                    <p className="mt-1 text-xs leading-relaxed text-[#8F8A83]">{choice.description}</p>
                  </div>
                  <ArrowRight size={17} className="mt-1 shrink-0 text-[#F5B942] transition group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#34D399]/25 bg-[#34D399]/[0.06] p-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#6EE7B7]">
                  <CheckCircle2 size={15} /> Intercorrência resolvida
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

              {resumeLabel && (
                <div className="rounded-xl border border-[#60A5FA]/20 bg-[#60A5FA]/[0.05] px-4 py-3 text-xs text-[#9BBEEC]">
                  Após fechar esta janela, você retorna à diligência em <strong className="text-[#C9DDF7]">{resumeLabel}</strong>.
                </div>
              )}

              <button
                type="button"
                onClick={finish}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F0B94D] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#171008] hover:bg-[#F6C86C]"
              >
                {resumeLabel ? `Retomar diligência • ${resumeLabel}` : 'Retomar diligência'} <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
