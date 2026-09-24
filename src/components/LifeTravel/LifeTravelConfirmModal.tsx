import React from 'react';
import { ArrowRight, Home, MapPin, X } from 'lucide-react';

interface LifeTravelConfirmModalProps {
  isOpen: boolean;
  originLabel: string;
  destinationLabel: string;
  title?: string;
  message?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const LifeTravelConfirmModal: React.FC<LifeTravelConfirmModalProps> = ({
  isOpen,
  originLabel,
  destinationLabel,
  title = 'Deseja se deslocar?',
  message = 'O deslocamento será mostrado no mapa e consumirá tempo da rotina.',
  confirmLabel = 'Confirmar deslocamento',
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[235] grid place-items-center bg-black/85 p-4 backdrop-blur-md">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#3A3E45] bg-[#0D1014] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#292E35] bg-[#12161B] px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#D9B96E]">
              <Home size={21} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#9C865A]">Deslocamento</span>
              <h2 className="mt-1 font-serif text-xl font-black text-[#F1EEE8]">{title}</h2>
              <p className="mt-2 text-xs leading-5 text-[#9299A3]">{message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#343941] text-[#949BA4]"
            aria-label="Cancelar"
          >
            <X size={17} />
          </button>
        </header>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-[#2D3239] bg-[#101419] p-4">
            <div className="min-w-0">
              <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-[#777F88]">
                <MapPin size={12} /> Origem
              </span>
              <strong className="mt-1 block truncate text-sm text-[#E6E8EA]">{originLabel}</strong>
            </div>
            <ArrowRight size={18} className="text-[#C5A059]" />
            <div className="min-w-0 text-right">
              <span className="text-[8px] font-black uppercase tracking-wider text-[#777F88]">Destino</span>
              <strong className="mt-1 block truncate text-sm text-[#E6E8EA]">{destinationLabel}</strong>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[#343941] bg-[#11151A] px-4 py-3 text-xs font-black text-[#A8AEB6]"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-xl bg-[#A8833F] px-4 py-3 text-xs font-black text-[#11100D]"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
