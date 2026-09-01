import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Car, Clock3, MapPin, Navigation, SkipForward, Wallet } from 'lucide-react';
import { LocationScene } from '../types/game';

interface TravelMapTransitionProps {
  origin: LocationScene;
  destination: LocationScene;
  caseHoursSpent: number;
  onComplete: () => void;
}

const ANIMATION_DURATION_MS = 4200;

const formatCaseClock = (caseHours: number) => {
  const totalMinutes = Math.round(caseHours * 60);
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const minutesInDay = totalMinutes % (24 * 60);
  const hour = Math.floor(minutesInDay / 60);
  const minute = minutesInDay % 60;
  const clock = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return dayOffset > 0 ? `D+${dayOffset} • ${clock}` : clock;
};

export const TravelMapTransition: React.FC<TravelMapTransitionProps> = ({
  origin,
  destination,
  caseHoursSpent,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);

  const startClock = useMemo(() => 8 + caseHoursSpent, [caseHoursSpent]);
  const currentClock = startClock + destination.travelTimeHours * progress;
  const travelledHours = destination.travelTimeHours * progress;
  const travelledCost = destination.travelCost * progress;

  const finishTravel = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.min(1, elapsed / ANIMATION_DURATION_MS);
      setProgress(next);

      if (next >= 1) {
        window.clearInterval(interval);
        finishTravel();
      }
    }, 50);

    return () => window.clearInterval(interval);
    // onComplete is stable while the transition is mounted; the ref prevents duplicate completion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete]);

  const status = progress < 0.18 ? 'Saindo do local atual' : progress < 0.82 ? 'Em deslocamento' : 'Chegando ao destino';
  const markerX = 16 + progress * 68;
  const markerY = 72 - Math.sin(progress * Math.PI) * 35;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#050506]/95 p-3 backdrop-blur-md sm:p-5">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-[#2A2A2E] bg-[#0C0C0E] shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-[#2A2A2E] bg-[#141416] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#C5A059]">
              <Navigation size={16} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Deslocamento em diligência</span>
            </div>
            <h2 className="mt-1 text-lg font-bold font-serif text-[#E8E8E8]">{status}</h2>
          </div>

          <button
            type="button"
            onClick={finishTravel}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#35353A] bg-[#1A1A1D] px-4 py-2 text-xs font-semibold text-[#BBBBBB] transition-colors hover:border-[#C5A059]/50 hover:text-[#E8E8E8]"
          >
            <SkipForward size={14} />
            Pular animação
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="relative h-[330px] overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#111317] sm:h-[390px]">
            <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:34px_34px]" />

            <div className="absolute left-[8%] top-[12%] h-16 w-28 rounded-lg border border-[#25282D] bg-[#171A1F] sm:w-40" />
            <div className="absolute left-[42%] top-[8%] h-24 w-24 rounded-lg border border-[#25282D] bg-[#171A1F] sm:w-40" />
            <div className="absolute right-[7%] top-[18%] h-14 w-32 rounded-lg border border-[#25282D] bg-[#171A1F] sm:w-44" />
            <div className="absolute bottom-[8%] left-[18%] h-20 w-36 rounded-lg border border-[#25282D] bg-[#171A1F] sm:w-52" />
            <div className="absolute bottom-[10%] right-[16%] h-24 w-28 rounded-lg border border-[#25282D] bg-[#171A1F] sm:w-44" />

            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M 15 72 C 34 28, 64 28, 85 72" fill="none" stroke="#34363B" strokeWidth="7" strokeLinecap="round" />
              <path d="M 15 72 C 34 28, 64 28, 85 72" fill="none" stroke="#C5A059" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2.5 2.3" opacity="0.95" />
              <path d="M 5 42 C 28 48, 72 47, 96 39" fill="none" stroke="#26292E" strokeWidth="4" opacity="0.8" />
              <path d="M 32 2 C 36 30, 35 68, 28 98" fill="none" stroke="#26292E" strokeWidth="4" opacity="0.8" />
              <path d="M 71 1 C 67 29, 68 65, 77 99" fill="none" stroke="#26292E" strokeWidth="4" opacity="0.8" />
            </svg>

            <div className="absolute left-[9%] top-[64%] max-w-[36%]">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#60A5FA] bg-[#0D1520] text-[#60A5FA] shadow-lg shadow-black/40">
                <MapPin size={17} />
              </div>
              <div className="mt-2 rounded-lg border border-[#2A2A2E] bg-[#09090B]/90 px-2.5 py-2 backdrop-blur">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-[#60A5FA]">Origem</span>
                <strong className="block truncate text-[11px] text-[#E0E0E0]">{origin.name}</strong>
              </div>
            </div>

            <div className="absolute right-[7%] top-[64%] max-w-[36%] text-right">
              <div className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#C5A059] bg-[#201A0D] text-[#C5A059] shadow-lg shadow-black/40">
                <MapPin size={17} />
              </div>
              <div className="mt-2 rounded-lg border border-[#C5A059]/30 bg-[#09090B]/90 px-2.5 py-2 backdrop-blur">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-[#C5A059]">Destino</span>
                <strong className="block truncate text-[11px] text-[#E0E0E0]">{destination.name}</strong>
              </div>
            </div>

            <div
              className="absolute z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#F5D99B] bg-[#C5A059] text-[#0A0A0B] shadow-xl shadow-black/60 transition-[left,top] duration-75 ease-linear"
              style={{ left: `${markerX}%`, top: `${markerY}%` }}
            >
              <Car size={18} />
            </div>

            <div className="absolute bottom-3 left-1/2 w-[88%] -translate-x-1/2 rounded-xl border border-[#2A2A2E] bg-[#09090B]/90 p-3 backdrop-blur sm:w-[72%]">
              <div className="mb-2 flex items-center justify-between text-[10px] font-mono text-[#888888]">
                <span>{Math.round(progress * 100)}% do trajeto</span>
                <span>{destination.travelTimeHours}h previstas</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#242429]">
                <div className="h-full rounded-full bg-[#C5A059] transition-[width] duration-75 ease-linear" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#2A2A2E] bg-[#151517] p-4">
              <div className="flex items-center gap-2 text-[#C5A059]"><Clock3 size={16} /><span className="text-[10px] font-bold uppercase tracking-wider">Relógio do caso</span></div>
              <strong className="mt-1 block font-mono text-lg text-[#E8E8E8]">{formatCaseClock(currentClock)}</strong>
              <span className="text-[10px] text-[#777777]">+{travelledHours.toFixed(1)}h neste deslocamento</span>
            </div>

            <div className="rounded-xl border border-[#2A2A2E] bg-[#151517] p-4">
              <div className="flex items-center gap-2 text-[#34D399]"><Wallet size={16} /><span className="text-[10px] font-bold uppercase tracking-wider">Custo da viagem</span></div>
              <strong className="mt-1 block font-mono text-lg text-[#E8E8E8]">R$ {travelledCost.toFixed(0)}</strong>
              <span className="text-[10px] text-[#777777]">Total previsto: R$ {destination.travelCost}</span>
            </div>

            <div className="rounded-xl border border-[#2A2A2E] bg-[#151517] p-4">
              <div className="flex items-center gap-2 text-[#60A5FA]"><Navigation size={16} /><span className="text-[10px] font-bold uppercase tracking-wider">Destino</span></div>
              <strong className="mt-1 block truncate text-sm text-[#E8E8E8]">{destination.name}</strong>
              <span className="block truncate text-[10px] text-[#777777]">{destination.address}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
