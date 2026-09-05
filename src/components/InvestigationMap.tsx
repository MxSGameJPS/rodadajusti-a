import React, { useState } from 'react';
import { LegalCase, ActiveCaseState, LocationScene } from '../types/game';
import {
  Clock,
  MapPin,
  Navigation,
  Building2,
  Home,
  ScrollText,
  Building,
  ShieldAlert,
  Landmark,
  FolderCheck,
  Laptop,
  ArrowRight,
  AlertTriangle,
  FileCheck,
  Scale
} from 'lucide-react';
import { sound } from '../utils/sound';
import { TravelMapTransition } from './TravelMapTransition';
import { resolveCollectedClueIds } from '../lib/evidenceProgress';

interface InvestigationMapProps {
  currentCase: LegalCase;
  activeState: ActiveCaseState;
  onTravelToLocation: (location: LocationScene) => void;
  onOpenDossier: () => void;
  onOpenCourtroom: () => void;
}

export const InvestigationMap: React.FC<InvestigationMapProps> = ({
  currentCase,
  activeState,
  onTravelToLocation,
  onOpenDossier,
  onOpenCourtroom,
}) => {
  const [travelTarget, setTravelTarget] = useState<LocationScene | null>(null);
  const hoursLeft = Math.max(0, currentCase.deadlineHours - activeState.hoursSpent);
  const isTimeRunningOut = hoursLeft <= 12;
  const collectedClueIds = new Set(resolveCollectedClueIds(currentCase, activeState));

  const getIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'Building2': return <Building2 className={className} />;
      case 'Home': return <Home className={className} />;
      case 'ScrollText': return <ScrollText className={className} />;
      case 'Building': return <Building className={className} />;
      case 'ShieldAlert': return <ShieldAlert className={className} />;
      case 'Landmark': return <Landmark className={className} />;
      case 'FolderCheck': return <FolderCheck className={className} />;
      case 'Laptop': return <Laptop className={className} />;
      default: return <MapPin className={className} />;
    }
  };

  const currentLocation = currentCase.locations.find((location) => location.id === activeState.currentLocationId) || currentCase.locations[0];

  const beginTravel = (location: LocationScene) => {
    if (location.id === currentLocation.id) return;
    sound.playTravel();
    setTravelTarget(location);
  };

  const completeTravel = () => {
    if (!travelTarget) return;
    const destination = travelTarget;
    setTravelTarget(null);
    onTravelToLocation(destination);
  };

  return (
    <>
      <div className="w-full space-y-4">
        <div className="p-4 sm:p-5 bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#0A0A0B] text-[#C5A059] border border-[#2A2A2E]">
                {currentCase.code}
              </span>
              <span className="text-xs text-[#888888] font-semibold tracking-wide">{currentCase.area}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold font-serif text-[#E0E0E0] mt-1">
              {currentCase.title}
            </h2>
            <p className="text-xs text-[#888888]">
              Cliente: <strong className="text-[#E0E0E0]">{currentCase.client.name}</strong> • Local Atual: <strong className="text-[#C5A059]">{currentLocation.name}</strong>
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-mono font-bold text-xs ${
                isTimeRunningOut
                  ? 'bg-[#F87171]/10 text-[#F87171] border-[#F87171]/40 animate-pulse'
                  : 'bg-[#111113] text-[#C5A059] border-[#2A2A2E]'
              }`}
            >
              <Clock size={16} className={isTimeRunningOut ? 'text-[#F87171]' : 'text-[#C5A059]'} />
              <div>
                <span className="text-[9px] text-[#888888] uppercase tracking-wider block -mb-0.5">Prazo Restante</span>
                <span>{hoursLeft}h restantes ({activeState.hoursSpent}h decorridas)</span>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playPaper();
                onOpenDossier();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1A1A1D] hover:bg-[#222226] text-[#E0E0E0] border border-[#2A2A2E] hover:border-[#C5A059]/40 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              <FileCheck size={16} className="text-[#C5A059]" />
              <span>Autos ({collectedClueIds.size} Provas)</span>
            </button>

            <button
              onClick={() => {
                sound.playGavel();
                onOpenCourtroom();
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#D4B475] text-[#0A0A0B] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#C5A059]/20"
            >
              <Scale size={16} />
              <span>Protocolar Petição</span>
            </button>
          </div>
        </div>

        <div className="relative w-full rounded-2xl overflow-hidden border border-[#2A2A2E] bg-[#0A0A0B] shadow-2xl p-4 sm:p-6 min-h-[380px]">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:24px_24px]" />

          <div className="relative z-10 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#888888]">
              <Navigation size={15} className="text-[#C5A059]" />
              <span className="font-bold tracking-widest uppercase text-[#C5A059]">Mapa de Diligências e Locais da Investigação</span>
            </div>
            <span className="text-[11px] text-[#888888] font-mono">
              {activeState.unlockedLocationIds.length} de {currentCase.locations.length} locais mapeados
            </span>
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {currentCase.locations.map((location) => {
              const isUnlocked = activeState.unlockedLocationIds.includes(location.id);
              const isCurrent = activeState.currentLocationId === location.id;
              const cluesInThisLocation = currentCase.availableClues.filter((clue) => clue.locationFoundId === location.id);
              const discoveredCluesCount = cluesInThisLocation.filter((clue) => collectedClueIds.has(clue.id)).length;

              return (
                <div
                  key={location.id}
                  className={`relative rounded-xl border transition-all p-4 flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-[#1A1A1D] border-[#C5A059] ring-1 ring-[#C5A059]/50 shadow-xl'
                      : isUnlocked
                      ? 'bg-[#161618] border-[#2A2A2E] hover:border-[#C5A059]/50 hover:bg-[#1A1A1D] cursor-pointer shadow-md'
                      : 'bg-[#0E0E10] border-[#1F1F23] opacity-60'
                  }`}
                  onClick={() => {
                    if (isUnlocked && !isCurrent) beginTravel(location);
                  }}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            isCurrent
                              ? 'bg-[#C5A059] text-[#0A0A0B] shadow-md font-bold'
                              : isUnlocked
                              ? 'bg-[#1A1A1D] text-[#C5A059] border border-[#2A2A2E]'
                              : 'bg-[#111113] text-[#444]'
                          }`}
                        >
                          {getIcon(location.iconName, 'w-5 h-5')}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-[#E0E0E0]">{location.name}</h3>
                          <p className="text-[11px] text-[#888888]">{location.address}</p>
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#C5A059] text-[#0A0A0B] font-extrabold uppercase tracking-wider shrink-0">
                          Aqui Agora
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#AAAAAA] mt-2.5 line-clamp-2 leading-relaxed">
                      {location.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#2A2A2E] flex items-center justify-between text-[11px]">
                    {isUnlocked ? (
                      <>
                        <div className="flex items-center gap-2 text-[#888888]">
                          <span>Pistas: <strong className="text-[#C5A059]">{discoveredCluesCount}/{cluesInThisLocation.length}</strong></span>
                          <span className="text-[#444]">•</span>
                          <span>{location.travelTimeHours > 0 ? `+${location.travelTimeHours}h viagem` : '0h (Local)'}</span>
                        </div>

                        {!isCurrent ? (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              beginTravel(location);
                            }}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#C5A059] hover:bg-[#D4B475] text-[#0A0A0B] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            <span>Traçar rota</span>
                            <ArrowRight size={12} />
                          </button>
                        ) : (
                          <span className="text-[#C5A059] font-medium">Investigando...</span>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#666666] text-xs w-full justify-center py-0.5">
                        <AlertTriangle size={14} className="text-[#666666]" />
                        <span>Local bloqueado (Obtenha pistas para revelar o endereço)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {travelTarget && (
        <TravelMapTransition
          origin={currentLocation}
          destination={travelTarget}
          caseHoursSpent={activeState.hoursSpent}
          onComplete={completeTravel}
        />
      )}
    </>
  );
};
