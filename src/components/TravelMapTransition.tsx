import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Car, Clock3, Loader2, MapPin, Navigation, Route, SkipForward, Wallet } from 'lucide-react';
import type { LocationScene } from '../types/game';
import { readCurrentPlayerSnapshot } from '../lib/professionalRpg';
import { buildOpenStreetMapStyle, loadMapLibre } from '../lib/maplibreClient';
import {
  fetchRoadRoute,
  formatRouteDistance,
  formatRouteDuration,
  getLocalizedLocationLabel,
  getWorldPointForLocation,
  resolveWorldMapProfile,
  type WorldMapProfile,
  type WorldRoute,
} from '../lib/worldMap';

interface TravelMapTransitionProps {
  caseId: string;
  origin: LocationScene;
  destination: LocationScene;
  caseHoursSpent: number;
  onComplete: () => void;
}

const FALLBACK_ANIMATION_MS = 4200;
const ROUTE_SOURCE_ID = 'rota-live-route';
const ROUTE_LAYER_ID = 'rota-live-route-layer';

const formatCaseClock = (caseHours: number) => {
  const totalMinutes = Math.round(caseHours * 60);
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const minutesInDay = totalMinutes % (24 * 60);
  const hour = Math.floor(minutesInDay / 60);
  const minute = minutesInDay % 60;
  const clock = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return dayOffset > 0 ? `D+${dayOffset} • ${clock}` : clock;
};

function animationDuration(route: WorldRoute | null) {
  if (!route) return FALLBACK_ANIMATION_MS;
  const km = route.distanceMeters / 1000;
  return Math.round(Math.max(4300, Math.min(7600, 4300 + km * 180)));
}

export const TravelMapTransition: React.FC<TravelMapTransitionProps> = ({
  caseId,
  origin,
  destination,
  caseHoursSpent,
  onComplete,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const carMarkerRef = useRef<any>(null);
  const mapMarkersRef = useRef<any[]>([]);
  const completedRef = useRef(false);
  const animationStartedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [profile, setProfile] = useState<WorldMapProfile | null>(null);
  const [route, setRoute] = useState<WorldRoute | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [useRealMap, setUseRealMap] = useState(false);
  const [mapFailure, setMapFailure] = useState(false);

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
    let active = true;
    const prepare = async () => {
      const player = readCurrentPlayerSnapshot();
      if (!player) {
        if (active) {
          setIsLoadingRoute(false);
          setUseRealMap(false);
        }
        return;
      }

      const resolvedProfile = await resolveWorldMapProfile(player);
      if (!active || !resolvedProfile) {
        if (active) {
          setIsLoadingRoute(false);
          setUseRealMap(false);
        }
        return;
      }

      setProfile(resolvedProfile);
      const originPoint = getWorldPointForLocation(resolvedProfile, caseId, origin);
      const destinationPoint = getWorldPointForLocation(resolvedProfile, caseId, destination);
      const resolvedRoute = await fetchRoadRoute(originPoint, destinationPoint);
      if (!active) return;
      setRoute(resolvedRoute);
      setUseRealMap(true);
      setIsLoadingRoute(false);
    };

    prepare();
    return () => {
      active = false;
    };
  }, [caseId, origin.id, destination.id]);

  useEffect(() => {
    if (!useRealMap || !route || !profile || !mapContainerRef.current) return undefined;
    let disposed = false;

    const mountMap = async () => {
      try {
        const maplibre = await loadMapLibre();
        if (disposed || !mapContainerRef.current) return;

        const first = route.coordinates[0];
        const last = route.coordinates[route.coordinates.length - 1];
        const map = new maplibre.Map({
          container: mapContainerRef.current,
          style: buildOpenStreetMapStyle(),
          center: first,
          zoom: 13.5,
          minZoom: 3,
          maxZoom: 18,
          attributionControl: true,
          interactive: false,
        });
        mapRef.current = map;

        const createMarkerElement = (label: string, background: string, foreground = '#fff') => {
          const element = document.createElement('div');
          element.style.width = '34px';
          element.style.height = '34px';
          element.style.display = 'grid';
          element.style.placeItems = 'center';
          element.style.borderRadius = '50%';
          element.style.border = '2px solid rgba(255,255,255,.92)';
          element.style.background = background;
          element.style.color = foreground;
          element.style.fontSize = '13px';
          element.style.fontWeight = '900';
          element.style.boxShadow = '0 8px 22px rgba(0,0,0,.45)';
          element.textContent = label;
          return element;
        };

        map.on('load', () => {
          if (disposed) return;
          map.addSource(ROUTE_SOURCE_ID, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: route.coordinates },
            },
          });
          map.addLayer({
            id: ROUTE_LAYER_ID,
            type: 'line',
            source: ROUTE_SOURCE_ID,
            paint: {
              'line-color': '#C5A059',
              'line-width': 5,
              'line-opacity': 0.92,
            },
          });

          mapMarkersRef.current.push(new maplibre.Marker({ element: createMarkerElement('A', '#355F87') })
            .setLngLat(first)
            .addTo(map));
          mapMarkersRef.current.push(new maplibre.Marker({ element: createMarkerElement('B', '#2E765E') })
            .setLngLat(last)
            .addTo(map));

          const carElement = createMarkerElement('🚗', '#C5A059', '#111');
          carElement.style.width = '40px';
          carElement.style.height = '40px';
          carMarkerRef.current = new maplibre.Marker({ element: carElement })
            .setLngLat(first)
            .addTo(map);

          const bounds = new maplibre.LngLatBounds(first, first);
          route.coordinates.forEach((coordinate) => bounds.extend(coordinate));
          map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 700 });
        });
      } catch {
        if (!disposed) {
          setMapFailure(true);
          setUseRealMap(false);
        }
      }
    };

    mountMap();
    return () => {
      disposed = true;
      mapMarkersRef.current.forEach((marker) => marker.remove());
      mapMarkersRef.current = [];
      if (carMarkerRef.current) carMarkerRef.current.remove();
      carMarkerRef.current = null;
      if (mapRef.current) mapRef.current.remove();
      mapRef.current = null;
    };
  }, [useRealMap, route, profile?.city, profile?.state]);

  useEffect(() => {
    if (isLoadingRoute || animationStartedRef.current) return undefined;
    animationStartedRef.current = true;
    const duration = animationDuration(route);
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const next = Math.min(1, (now - startedAt) / duration);
      setProgress(next);
      if (next >= 1) {
        finishTravel();
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
    // A referência impede conclusão duplicada durante o unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingRoute, route]);

  useEffect(() => {
    if (!useRealMap || !route || !carMarkerRef.current || route.coordinates.length < 2) return;
    const index = Math.min(route.coordinates.length - 1, Math.floor(progress * (route.coordinates.length - 1)));
    const coordinate = route.coordinates[index];
    carMarkerRef.current.setLngLat(coordinate);
  }, [progress, useRealMap, route]);

  const status = progress < 0.18 ? 'Saindo do local atual' : progress < 0.82 ? 'Em deslocamento' : 'Chegando ao destino';
  const markerX = 16 + progress * 68;
  const markerY = 72 - Math.sin(progress * Math.PI) * 35;
  const localizedDestination = profile ? getLocalizedLocationLabel(destination, profile) : destination.address;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#050506]/95 p-3 backdrop-blur-md sm:p-5">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-[#2A2A2E] bg-[#0C0C0E] shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-[#2A2A2E] bg-[#141416] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#C5A059]">
              <Navigation size={16} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Deslocamento em diligência</span>
            </div>
            <h2 className="mt-1 text-lg font-bold font-serif text-[#E8E8E8]">{isLoadingRoute ? 'Calculando percurso...' : status}</h2>
            {profile && <p className="mt-1 text-[10px] text-[#777]">{profile.city}/{profile.state} • percurso acelerado para não interromper o ritmo do jogo</p>}
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
          <div className="relative h-[350px] overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#111317] sm:h-[440px]">
            {isLoadingRoute ? (
              <div className="absolute inset-0 grid place-items-center bg-[#0D0F12] text-center">
                <div>
                  <Loader2 size={30} className="mx-auto animate-spin text-[#C5A059]" />
                  <strong className="mt-3 block text-sm text-[#E8E8E8]">Buscando ruas e rota</strong>
                  <span className="mt-1 block text-[10px] text-[#777]">O jogo tenta usar a malha viária real sem consumir APIs pagas.</span>
                </div>
              </div>
            ) : useRealMap && route ? (
              <>
                <div ref={mapContainerRef} className="absolute inset-0" />
                <div className="absolute left-3 top-3 z-10 rounded-xl border border-black/15 bg-[#09090B]/88 px-3 py-2 text-[10px] text-[#E6E1D8] shadow-xl backdrop-blur">
                  <strong className="block">Rota real • {formatRouteDistance(route.distanceMeters)}</strong>
                  <span className="text-[#A7A199]">cerca de {formatRouteDuration(route.durationSeconds)} em condições normais</span>
                  {route.source === 'FALLBACK' && <span className="block text-[#E6B85E]">Serviço de rota indisponível • exibindo aproximação</span>}
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:34px_34px]" />
                <div className="absolute left-[8%] top-[12%] h-16 w-28 rounded-lg border border-[#25282D] bg-[#171A1F] sm:w-40" />
                <div className="absolute left-[42%] top-[8%] h-24 w-24 rounded-lg border border-[#25282D] bg-[#171A1F] sm:w-40" />
                <div className="absolute right-[7%] top-[18%] h-14 w-32 rounded-lg border border-[#25282D] bg-[#171A1F] sm:w-44" />
                <div className="absolute bottom-[8%] left-[18%] h-20 w-36 rounded-lg border border-[#25282D] bg-[#171A1F] sm:w-52" />
                <div className="absolute bottom-[10%] right-[16%] h-24 w-28 rounded-lg border border-[#25282D] bg-[#171A1F] sm:w-44" />
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M 15 72 C 34 28, 64 28, 85 72" fill="none" stroke="#34363B" strokeWidth="7" strokeLinecap="round" />
                  <path d="M 15 72 C 34 28, 64 28, 85 72" fill="none" stroke="#C5A059" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2.5 2.3" opacity="0.95" />
                </svg>
                <div className="absolute left-[9%] top-[64%] max-w-[36%]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#60A5FA] bg-[#0D1520] text-[#60A5FA]"><MapPin size={17} /></div>
                  <strong className="mt-2 block truncate text-[10px] text-[#DADADA]">{origin.name}</strong>
                </div>
                <div className="absolute right-[7%] top-[64%] max-w-[36%] text-right">
                  <div className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#C5A059] bg-[#201A0D] text-[#C5A059]"><MapPin size={17} /></div>
                  <strong className="mt-2 block truncate text-[10px] text-[#DADADA]">{destination.name}</strong>
                </div>
                <div
                  className="absolute z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#F5D99B] bg-[#C5A059] text-[#0A0A0B] shadow-xl transition-[left,top] duration-75 ease-linear"
                  style={{ left: `${markerX}%`, top: `${markerY}%` }}
                >
                  <Car size={18} />
                </div>
                <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-lg border border-[#C5A059]/25 bg-[#09090B]/90 px-3 py-2 text-center text-[9px] text-[#A9A49B] backdrop-blur">
                  {mapFailure ? 'Mapa real indisponível nesta tentativa. O deslocamento continua pelo modo seguro.' : 'Configure sua cidade no mapa de diligências para ativar rotas reais.'}
                </div>
              </>
            )}

            {!isLoadingRoute && (
              <div className="absolute bottom-3 left-1/2 z-20 w-[88%] -translate-x-1/2 rounded-xl border border-[#2A2A2E] bg-[#09090B]/90 p-3 backdrop-blur sm:w-[72%]">
                <div className="mb-2 flex items-center justify-between text-[10px] font-mono text-[#888888]">
                  <span>{Math.round(progress * 100)}% do trajeto</span>
                  <span>animação acelerada</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#242429]">
                  <div className="h-full rounded-full bg-[#C5A059]" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#2A2A2E] bg-[#151517] p-4">
              <div className="flex items-center gap-2 text-[#C5A059]"><Clock3 size={16} /><span className="text-[10px] font-bold uppercase tracking-wider">Relógio do caso</span></div>
              <strong className="mt-1 block font-mono text-lg text-[#E8E8E8]">{formatCaseClock(currentClock)}</strong>
              <span className="text-[10px] text-[#777777]">+{travelledHours.toFixed(1)}h simuladas</span>
            </div>

            <div className="rounded-xl border border-[#2A2A2E] bg-[#151517] p-4">
              <div className="flex items-center gap-2 text-[#34D399]"><Wallet size={16} /><span className="text-[10px] font-bold uppercase tracking-wider">Custo do jogo</span></div>
              <strong className="mt-1 block font-mono text-lg text-[#E8E8E8]">R$ {travelledCost.toFixed(0)}</strong>
              <span className="text-[10px] text-[#777777]">Previsto: R$ {destination.travelCost}</span>
            </div>

            <div className="rounded-xl border border-[#2A2A2E] bg-[#151517] p-4">
              <div className="flex items-center gap-2 text-[#60A5FA]"><Route size={16} /><span className="text-[10px] font-bold uppercase tracking-wider">Rota urbana</span></div>
              <strong className="mt-1 block text-sm text-[#E8E8E8]">{route ? formatRouteDistance(route.distanceMeters) : 'Modo simulado'}</strong>
              <span className="text-[10px] text-[#777777]">{route ? formatRouteDuration(route.durationSeconds) : 'sem rota real nesta viagem'}</span>
            </div>

            <div className="rounded-xl border border-[#2A2A2E] bg-[#151517] p-4">
              <div className="flex items-center gap-2 text-[#60A5FA]"><Navigation size={16} /><span className="text-[10px] font-bold uppercase tracking-wider">Destino</span></div>
              <strong className="mt-1 block truncate text-sm text-[#E8E8E8]">{destination.name}</strong>
              <span className="block truncate text-[10px] text-[#777777]">{localizedDestination}</span>
            </div>
          </div>

          <p className="mt-3 text-center text-[9px] leading-relaxed text-[#626268]">
            A rota visual usa dados abertos quando disponíveis. O tempo e o custo aplicados ao processo continuam seguindo o balanceamento do caso, que também representa estacionamento, espera e outras etapas da diligência.
          </p>
        </div>
      </div>
    </div>
  );
};
