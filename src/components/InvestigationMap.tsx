import React, { useEffect, useState } from 'react';
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
  Scale,
  Activity,
  List,
  X,
} from 'lucide-react';
import { sound } from '../utils/sound';
import { TravelMapTransition } from './TravelMapTransition';
import { RealCityMapPanel } from './WorldMap/RealCityMapPanel';
import { resolveCollectedClueIds, resolveUnlockedLocationIds } from '../lib/evidenceProgress';
import { readCurrentPlayerSnapshot } from '../lib/professionalRpg';
import {
  WORLD_MAP_UPDATED_EVENT,
  getLocalizedLocationLabel,
  readWorldMapProfile,
  type WorldMapProfile,
} from '../lib/worldMap';
import {
  getCaseReactiveOutcome,
  getPendingCaseEvent,
  resolveCaseEventChoice,
  type UnexpectedCaseEvent,
  type UnexpectedCaseEventChoice,
} from '../lib/reactiveWorldStore';
import { UnexpectedCaseEventModal } from './UnexpectedCaseEventModal';
import styles from './InvestigationMap.module.css';

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
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<UnexpectedCaseEvent | null>(null);
  const [worldProfile, setWorldProfile] = useState<WorldMapProfile | null>(() => {
    const player = readCurrentPlayerSnapshot();
    return player ? readWorldMapProfile(player) : null;
  });

  const reactiveOutcome = getCaseReactiveOutcome(currentCase.id);
  const effectiveHoursSpent = activeState.hoursSpent + reactiveOutcome.timePenaltyHours;
  const hoursLeft = Math.max(0, currentCase.deadlineHours - effectiveHoursSpent);
  const isTimeRunningOut = hoursLeft <= 12;
  const collectedClueIds = new Set(resolveCollectedClueIds(currentCase, activeState));
  const unlockedLocationIds = new Set(resolveUnlockedLocationIds(currentCase, activeState));
  const investigationActionCount = activeState.askedDialogueIds.length + activeState.inspectedSpotIds.length + (activeState.socialJuridicoActions?.length || 0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextEvent = getPendingCaseEvent(currentCase, activeState);
      if (nextEvent) setPendingEvent(nextEvent);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [currentCase.id, investigationActionCount, activeState.hoursSpent]);

  useEffect(() => {
    const refreshWorld = () => {
      const player = readCurrentPlayerSnapshot();
      setWorldProfile(player ? readWorldMapProfile(player) : null);
    };
    refreshWorld();
    window.addEventListener(WORLD_MAP_UPDATED_EVENT, refreshWorld);
    return () => window.removeEventListener(WORLD_MAP_UPDATED_EVENT, refreshWorld);
  }, []);

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

  const resolveUnexpectedEvent = (choice: UnexpectedCaseEventChoice) => {
    if (!pendingEvent) return;
    resolveCaseEventChoice(pendingEvent, choice);
  };

  return (
    <>
      <section className={styles.scene}>
        <RealCityMapPanel
          currentCase={currentCase}
          currentLocationId={activeState.currentLocationId}
          unlockedLocationIds={Array.from(unlockedLocationIds)}
          onTravelToLocation={beginTravel}
          immersive
        />

        <header className={styles.topHud}>
          <div className={styles.caseIdentity}>
            <span className={styles.caseCode}>{currentCase.code}</span>
            <div>
              <small>{currentCase.area}</small>
              <strong>{currentCase.title}</strong>
              <span>Cliente: {currentCase.client.name}</span>
            </div>
          </div>

          <div className={styles.currentLocation}>
            <MapPin size={16} />
            <span>
              <small>LOCAL ATUAL</small>
              <strong>{currentLocation.name}</strong>
            </span>
          </div>

          <div className={`${styles.deadline} ${isTimeRunningOut ? styles.deadlineDanger : ''}`}>
            <Clock size={17} />
            <span>
              <small>PRAZO RESTANTE</small>
              <strong>{hoursLeft}h</strong>
            </span>
          </div>

          <div className={styles.topActions}>
            <button
              type="button"
              onClick={() => {
                sound.playPaper();
                onOpenDossier();
              }}
            >
              <FileCheck size={17} />
              <span>Autos</span>
              <b>{collectedClueIds.size}</b>
            </button>

            <button
              type="button"
              className={styles.petitionButton}
              onClick={() => {
                sound.playGavel();
                onOpenCourtroom();
              }}
            >
              <Scale size={17} />
              <span>Protocolar</span>
            </button>
          </div>
        </header>

        {reactiveOutcome.events.length > 0 && (
          <div className={styles.eventBadge}>
            <Activity size={13} />
            {reactiveOutcome.events.length} intercorrência(s)
            {reactiveOutcome.timePenaltyHours > 0 && <span>+{reactiveOutcome.timePenaltyHours}h</span>}
          </div>
        )}

        <button
          type="button"
          className={styles.locationsToggle}
          onClick={() => setLocationsOpen(true)}
        >
          <List size={18} />
          <span>Locais da diligência</span>
          <strong>{unlockedLocationIds.size}/{currentCase.locations.length}</strong>
        </button>

        <div className={styles.bottomHint}>
          <Navigation size={14} />
          <span>Selecione um ponto no mapa para traçar uma rota pelas ruas da cidade.</span>
        </div>

        {locationsOpen && (
          <div className={styles.locationsBackdrop} onMouseDown={() => setLocationsOpen(false)}>
            <aside className={styles.locationsDrawer} onMouseDown={(event) => event.stopPropagation()}>
              <header>
                <div>
                  <span>MAPA DA DILIGÊNCIA</span>
                  <h3>Locais do processo</h3>
                </div>
                <button type="button" onClick={() => setLocationsOpen(false)} aria-label="Fechar locais">
                  <X size={19} />
                </button>
              </header>

              <div className={styles.locationsList}>
                {currentCase.locations.map((location) => {
                  const isUnlocked = unlockedLocationIds.has(location.id);
                  const isCurrent = activeState.currentLocationId === location.id;
                  const cluesInThisLocation = currentCase.availableClues.filter((clue) => clue.locationFoundId === location.id);
                  const discoveredCluesCount = cluesInThisLocation.filter((clue) => collectedClueIds.has(clue.id)).length;
                  const locationLabel = worldProfile ? getLocalizedLocationLabel(location, worldProfile) : location.address;

                  return (
                    <button
                      type="button"
                      key={location.id}
                      className={`${styles.locationRow} ${isCurrent ? styles.locationCurrent : ''}`}
                      disabled={!isUnlocked}
                      onClick={() => {
                        if (!isUnlocked) return;
                        if (!isCurrent) beginTravel(location);
                        setLocationsOpen(false);
                      }}
                    >
                      <span className={styles.locationIcon}>
                        {getIcon(location.iconName, styles.locationSvg)}
                      </span>

                      <span className={styles.locationCopy}>
                        <strong>{location.name}</strong>
                        <small>{locationLabel}</small>
                        <em>
                          {isUnlocked
                            ? `Pistas ${discoveredCluesCount}/${cluesInThisLocation.length} • ${location.travelTimeHours > 0 ? `+${location.travelTimeHours}h` : 'local atual'}`
                            : 'Local bloqueado • obtenha pistas para revelar'}
                        </em>
                      </span>

                      <span className={styles.locationState}>
                        {isCurrent ? 'VOCÊ ESTÁ AQUI' : isUnlocked ? <ArrowRight size={16} /> : <AlertTriangle size={15} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        )}
      </section>

      {travelTarget && (
        <TravelMapTransition
          caseId={currentCase.id}
          origin={currentLocation}
          destination={travelTarget}
          caseHoursSpent={effectiveHoursSpent}
          onComplete={completeTravel}
        />
      )}

      <UnexpectedCaseEventModal
        isOpen={!!pendingEvent}
        event={pendingEvent}
        resumeLabel={currentLocation?.name || 'diligência atual'}
        onResolve={resolveUnexpectedEvent}
        onCloseAfterResolution={() => setPendingEvent(null)}
      />
    </>
  );
};
