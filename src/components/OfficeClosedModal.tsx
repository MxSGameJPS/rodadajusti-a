import React from 'react';
import { Coffee, Home, LockKeyhole, WalletCards } from 'lucide-react';

interface Props {
  isOpen: boolean;
  currentTime: string;
  opensAt: string;
  waitMinutes: number;
  coffeePrice: number;
  canAffordCoffee: boolean;
  onCoffee: () => void;
  onGoHome: () => void;
  onClose: () => void;
  canWaitForOpening?: boolean;
}

export const OfficeClosedModal: React.FC<Props> = ({ isOpen, currentTime, opensAt, waitMinutes, coffeePrice, canAffordCoffee, onCoffee, onGoHome, onClose, canWaitForOpening = true }) => {
  if (!isOpen) return null;
  const hours = Math.floor(waitMinutes / 60);
  const minutes = waitMinutes % 60;
  const waitLabel = [hours ? `${hours}h` : '', minutes ? `${minutes}min` : ''].filter(Boolean).join(' ');

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#C5A059]/30 bg-[#101012] shadow-2xl">
        <div className="border-b border-[#29292E] bg-[#151412] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#D1B36F]"><LockKeyhole size={23} /></div>
            <div><span className="text-[9px] font-black uppercase tracking-[.18em] text-[#C5A059]">Ramos & Associados</span><h2 className="mt-1 font-serif text-2xl font-black text-[#EEEAE2]">{canWaitForOpening ? 'O escritório ainda está fechado' : 'O expediente está encerrado'}</h2></div>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#A9A49B]">{canWaitForOpening ? <>Você chegou às <strong className="text-[#E7D4A5]">{currentTime}</strong>. O expediente começa às <strong className="text-[#E7D4A5]">{opensAt}</strong>. Faltam {waitLabel}.</> : <>Você chegou às <strong className="text-[#E7D4A5]">{currentTime}</strong>, fora do expediente. Retorne em um próximo período de trabalho.</>}</p>
        </div>

        <div className="space-y-3 p-6">
          {canWaitForOpening && <button type="button" disabled={!canAffordCoffee} onClick={onCoffee} className="flex w-full items-center gap-4 rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/[.07] p-4 text-left transition hover:bg-[#C5A059]/[.12] disabled:cursor-not-allowed disabled:opacity-40">
            <Coffee size={22} className="shrink-0 text-[#C5A059]" />
            <div className="flex-1"><strong className="block text-sm text-[#E8E2D7]">Tomar um café na cantina e esperar</strong><span className="mt-1 block text-[10px] leading-5 text-[#8F8B84]">O tempo avança até a abertura e você entra no escritório no horário.</span></div>
            <span className="flex items-center gap-1 text-xs font-black text-[#D4B976]"><WalletCards size={13} /> R$ {coffeePrice.toFixed(2).replace('.', ',')}</span>
          </button>}

          <button type="button" onClick={onGoHome} className="flex w-full items-center gap-4 rounded-xl border border-[#303036] bg-[#151519] p-4 text-left transition hover:bg-[#1B1B20]">
            <Home size={22} className="shrink-0 text-[#A6A6AD]" />
            <div><strong className="block text-sm text-[#DDD9D1]">Voltar para casa</strong><span className="mt-1 block text-[10px] leading-5 text-[#85858D]">Você fará o trajeto de volta normalmente. Se não retornar a tempo, poderá chegar atrasado ou faltar.</span></div>
          </button>

          <button type="button" onClick={onClose} className="w-full py-2 text-[9px] font-black uppercase tracking-[.15em] text-[#65656C] hover:text-[#A0A0A7]">{canWaitForOpening ? 'Continuar aguardando do lado de fora' : 'Voltar ao mapa'}</button>
        </div>
      </div>
    </div>
  );
};
