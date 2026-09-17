import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Car, Clock3, Loader2, MapPin, Navigation, Route, SkipForward, Wallet } from 'lucide-react';
import type { LocationScene } from '../types/game';
import { readCurrentPlayerSnapshot } from '../lib/professionalRpg';
import styles from './TravelMapTransition.module.css';
import { applyRotaJusticeMapTheme, buildOpenStreetMapStyle, loadMapLibre } from '../lib/maplibreClient';
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
const MAP_READY_TIMEOUT_MS = 8000;
const ROUTE_SOURCE_ID = 'rota-live-route';
const ROUTE_GLOW_LAYER_ID = 'rota-live-route-glow';
const ROUTE_CASING_LAYER_ID = 'rota-live-route-casing';
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
  return Math.round(Math.max(4800, Math.min(8500, 4800 + km * 220)));
}

function createMarkerElement(label: string, background: string, foreground = '#fff') {
  const element = document.createElement('div');
  element.style.width = '34px';
  element.style.height = '34px';
  element.style.display = 'grid';
  element.style.placeItems = 'center';
  element.style.borderRadius = '50%';
  element.style.border = '2px solid rgba(255,255,255,.94)';
  element.style.background = background;
  element.style.color = foreground;
  element.style.fontSize = '13px';
  element.style.fontWeight = '900';
  element.style.boxShadow = '0 8px 22px rgba(0,0,0,.45)';
  element.style.pointerEvents = 'none';
  element.textContent = label;
  return element;
}

function routeCoordinateAtProgress(route: WorldRoute, progress: number): [number, number] {
  const maxIndex = route.coordinates.length - 1;
  if (maxIndex <= 0) return route.coordinates[0] || [0, 0];

  const scaled = Math.max(0, Math.min(1, progress)) * maxIndex;
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(maxIndex, lowerIndex + 1);
  const localProgress = scaled - lowerIndex;
  const lower = route.coordinates[lowerIndex];
  const upper = route.coordinates[upperIndex];

  return [
    lower[0] + (upper[0] - lower[0]) * localProgress,
    lower[1] + (upper[1] - lower[1]) * localProgress,
  ];
}

function routeBearingAtProgress(route: WorldRoute, progress: number) {
  if (route.coordinates.length < 2) return 0;

  const maxIndex = route.coordinates.length - 1;
  const scaled = Math.max(0, Math.min(0.9999, progress)) * maxIndex;
  const index = Math.min(maxIndex - 1, Math.floor(scaled));
  const origin = route.coordinates[index];
  const destination = route.coordinates[index + 1];

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const toDegrees = (value: number) => (value * 180) / Math.PI;
  const lat1 = toRadians(origin[1]);
  const lat2 = toRadians(destination[1]);
  const deltaLng = toRadians(destination[0] - origin[0]);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function createCarElement() {
  const element = document.createElement('div');
  element.style.width = '46px';
  element.style.height = '30px';
  element.style.position = 'relative';
  element.style.border = '2px solid #f0d488';
  element.style.borderRadius = '11px 11px 8px 8px';
  element.style.background = 'linear-gradient(180deg,#d9b55f 0%,#9d742d 100%)';
  element.style.boxShadow = '0 0 0 4px rgba(5,8,10,.62),0 8px 24px rgba(0,0,0,.55),0 0 24px rgba(217,181,95,.28)';
  element.style.pointerEvents = 'none';

  const cabin = document.createElement('span');
  cabin.style.position = 'absolute';
  cabin.style.left = '11px';
  cabin.style.right = '11px';
  cabin.style.top = '4px';
  cabin.style.height = '10px';
  cabin.style.borderRadius = '5px 5px 3px 3px';
  cabin.style.background = '#172127';
  cabin.style.border = '1px solid rgba(240,212,136,.58)';
  element.appendChild(cabin);

  const hood = document.createElement('span');
  hood.style.position = 'absolute';
  hood.style.left = '17px';
  hood.style.right = '17px';
  hood.style.top = '-5px';
  hood.style.height = '7px';
  hood.style.borderRadius = '5px 5px 0 0';
  hood.style.background = '#f0d488';
  element.appendChild(hood);

  return element;
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
  const markersRef = useRef<any[]>([]);
  const completedRef = useRef(false);
  const animationStartedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [profile, setProfile] = useState<WorldMapProfile | null>(null);
  const [route, setRoute] = useState<WorldRoute | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [mapMode, setMapMode] = useState<'PREPARING' | 'REAL' | 'FALLBACK'>('PREPARING');
  const [mapReady, setMapReady] = useState(false);

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
    setProgress(0);
    setIsLoadingRoute(true);
    setMapMode('PREPARING');
    setMapReady(false);
    animationStartedRef.current = false;

    const prepare = async () => {
      const player = readCurrentPlayerSnapshot();
      if (!player) {
        if (active) {
          setIsLoadingRoute(false);
          setMapMode('FALLBACK');
        }
        return;
      }

      const resolvedProfile = await resolveWorldMapProfile(player);
      if (!active || !resolvedProfile) {
        if (active) {
          setIsLoadingRoute(false);
          setMapMode('FALLBACK');
        }
        return;
      }

      setProfile(resolvedProfile);
      const originPoint = getWorldPointForLocation(resolvedProfile, caseId, origin);
      const destinationPoint = getWorldPointForLocation(resolvedProfile, caseId, destination);
      const resolvedRoute = await fetchRoadRoute(originPoint, destinationPoint);
      if (!active) return;

      setRoute(resolvedRoute);
      setMapMode('REAL');
      setIsLoadingRoute(false);
    };

    void prepare();
    return () => {
      active = false;
    };
  }, [caseId, origin.id, destination.id]);

  useEffect(() => {
    if (mapMode !== 'REAL' || !route || !profile || !mapContainerRef.current) return undefined;

    let disposed = false;
    let readyTimeout = 0;

    const fallback = () => {
      if (disposed) return;
      setMapReady(false);
      setMapMode('FALLBACK');
    };

    const mountMap = async () => {
      try {
        const maplibre = await loadMapLibre();
        if (disposed || !mapContainerRef.current) return;

        const first = route.coordinates[0];
        const last = route.coordinates[route.coordinates.length - 1];
        if (!first || !last) {
          fallback();
          return;
        }

        // O CSS oficial do MapLibre define .maplibregl-map como position:relative.
        // Na transição, o container precisa preencher uma área absoluta. Forçamos
        // tamanho e posicionamento inline antes de criar o mapa para evitar canvas 0px.
        const container = mapContainerRef.current;
        container.style.position = 'absolute';
        container.style.inset = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.minHeight = '100%';
        container.style.display = 'block';

        const map = new maplibre.Map({
          container,
          style: buildOpenStreetMapStyle(),
          center: first,
          zoom: 13.5,
          minZoom: 3,
          maxZoom: 18,
          attributionControl: true,
          interactive: false,
          fadeDuration: 0,
          pitch: 48,
          bearing: -12,
        });
        mapRef.current = map;

        map.once('load', () => {
          if (disposed) return;

          applyRotaJusticeMapTheme(map);

          if (!map.getSource(ROUTE_SOURCE_ID)) {
            map.addSource(ROUTE_SOURCE_ID, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: route.coordinates },
              },
            });
          }

          if (!map.getLayer(ROUTE_GLOW_LAYER_ID)) {
            map.addLayer({
              id: ROUTE_GLOW_LAYER_ID,
              type: 'line',
              source: ROUTE_SOURCE_ID,
              layout: {
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-color': '#E7C56E',
                'line-width': ['interpolate', ['linear'], ['zoom'], 11, 10, 16, 22],
                'line-opacity': 0.2,
                'line-blur': 6,
              },
            });
          }

          if (!map.getLayer(ROUTE_CASING_LAYER_ID)) {
            map.addLayer({
              id: ROUTE_CASING_LAYER_ID,
              type: 'line',
              source: ROUTE_SOURCE_ID,
              layout: {
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-color': '#080A0B',
                'line-width': ['interpolate', ['linear'], ['zoom'], 11, 6, 16, 11],
                'line-opacity': 0.95,
              },
            });
          }

          if (!map.getLayer(ROUTE_LAYER_ID)) {
            map.addLayer({
              id: ROUTE_LAYER_ID,
              type: 'line',
              source: ROUTE_SOURCE_ID,
              layout: {
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-color': '#D8B45B',
                'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 5.5],
                'line-opacity': 1,
              },
            });
          }

          const originMarker = new maplibre.Marker({ element: createMarkerElement('A', '#355F87') })
            .setLngLat(first)
            .addTo(map);
          const destinationMarker = new maplibre.Marker({ element: createMarkerElement('B', '#2E765E') })
            .setLngLat(last)
            .addTo(map);
          markersRef.current.push(originMarker, destinationMarker);

          const carElement = createCarElement();
          carElement.style.zIndex = '20';
          carMarkerRef.current = new maplibre.Marker({
            element: carElement,
            rotationAlignment: 'map',
            pitchAlignment: 'map',
          })
            .setLngLat(first)
            .setRotation(routeBearingAtProgress(route, 0))
            .addTo(map);

          const bounds = new maplibre.LngLatBounds(first, first);
          route.coordinates.forEach((coordinate) => bounds.extend(coordinate));

          window.requestAnimationFrame(() => {
            if (disposed) return;
            map.resize();
            map.fitBounds(bounds, { padding: 84, maxZoom: 15.4, duration: 0 });
            map.triggerRepaint();

            // Só libera a animação depois de duas pinturas do navegador,
            // garantindo que o canvas tenha largura/altura reais na tela.
            window.requestAnimationFrame(() => {
              if (disposed) return;
              window.requestAnimationFrame(() => {
                if (disposed) return;
                window.clearTimeout(readyTimeout);
                setMapReady(true);
              });
            });
          });
        });

        map.on('error', (event: any) => {
          if (!map.loaded()) return;
          // Erros pontuais de tile não derrubam a viagem. O timeout cuida apenas
          // do caso em que o mapa nunca chega a montar de fato.
          if (event?.error?.message) console.warn('[Rota da Justiça] mapa:', event.error.message);
        });

        readyTimeout = window.setTimeout(() => {
          if (!mapReady) fallback();
        }, MAP_READY_TIMEOUT_MS);
      } catch {
        fallback();
      }
    };

    void mountMap();

    return () => {
      disposed = true;
      if (readyTimeout) window.clearTimeout(readyTimeout);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (carMarkerRef.current) carMarkerRef.current.remove();
      carMarkerRef.current = null;
      if (mapRef.current) mapRef.current.remove();
      mapRef.current = null;
    };
  }, [mapMode, route, profile?.city, profile?.state]);

  useEffect(() => {
    const canStart = !isLoadingRoute && (mapMode === 'FALLBACK' || (mapMode === 'REAL' && mapReady));
    if (!canStart || animationStartedRef.current) return undefined;

    animationStartedRef.current = true;
    const duration = animationDuration(route);
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const next = Math.min(1, (now - startedAt) / duration);
      setProgress(next);
      if (next >= 1) {
        window.setTimeout(finishTravel, 500);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingRoute, mapMode, mapReady, route]);

  useEffect(() => {
    if (mapMode !== 'REAL' || !mapReady || !route || !carMarkerRef.current) return;
    const coordinate = routeCoordinateAtProgress(route, progress);
    const bearing = routeBearingAtProgress(route, progress);
    carMarkerRef.current.setLngLat(coordinate);
    carMarkerRef.current.setRotation?.(bearing);
  }, [progress, mapMode, mapReady, route]);

  const mapPreparing = !isLoadingRoute && mapMode === 'REAL' && !mapReady;
  const status = progress < 0.18 ? 'Saindo do local atual' : progress < 0.82 ? 'Em deslocamento' : 'Chegando ao destino';
  const markerX = 16 + progress * 68;
  const markerY = 72 - Math.sin(progress * Math.PI) * 35;
  const localizedDestination = profile ? getLocalizedLocationLabel(destination, profile) : destination.address;

  return (
    <section className={styles.scene}>
      <div className={styles.mapLayer}>
        {isLoadingRoute ? (
          <div className={styles.loadingState}>
            <Loader2 size={36} />
            <strong>Calculando percurso...</strong>
            <span>Preparando a malha viária de {profile?.city || 'sua cidade'}.</span>
          </div>
        ) : mapMode === 'REAL' && route ? (
          <>
            <div
              ref={mapContainerRef}
              className={styles.map}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', minHeight: '100%' }}
            />
            <div className={styles.mapShade} aria-hidden="true" />
            {!mapReady && (
              <div className={styles.loadingState}>
                <Loader2 size={34} />
                <strong>Carregando mapa de {profile?.city}</strong>
                <span>O veículo parte quando a cidade estiver pronta.</span>
              </div>
            )}
          </>
        ) : (
          <div className={styles.fallbackMap}>
            <div className={styles.fallbackGrid} />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M 15 72 C 34 28, 64 28, 85 72" fill="none" stroke="#11161A" strokeWidth="8" strokeLinecap="round" />
              <path d="M 15 72 C 34 28, 64 28, 85 72" fill="none" stroke="#D8B45B" strokeWidth="1.6" strokeLinecap="round" opacity="0.95" />
            </svg>
            <div className={styles.fallbackOrigin}><MapPin size={18} /><span>{origin.name}</span></div>
            <div className={styles.fallbackDestination}><MapPin size={18} /><span>{destination.name}</span></div>
            <div
              className={styles.fallbackCar}
              style={{ left: `${markerX}%`, top: `${markerY}%` }}
            >
              <Car size={19} />
            </div>
          </div>
        )}
      </div>

      <header className={styles.topHud}>
        <div className={styles.travelIdentity}>
          <Navigation size={19} />
          <div>
            <span>DESLOCAMENTO EM DILIGÊNCIA</span>
            <strong>{isLoadingRoute ? 'Calculando percurso' : mapPreparing ? 'Preparando mapa' : status}</strong>
          </div>
        </div>

        <div className={styles.routeHeadline}>
          <small>ROTA</small>
          <strong>{origin.name}</strong>
          <ArrowRight size={15} />
          <strong>{destination.name}</strong>
        </div>

        <button type="button" className={styles.skipButton} onClick={finishTravel}>
          <SkipForward size={15} />
          Pular animação
        </button>
      </header>

      {!isLoadingRoute && !mapPreparing && (
        <div className={styles.progressPanel}>
          <div>
            <span>{Math.round(progress * 100)}% do trajeto</span>
            <strong>{status}</strong>
          </div>
          <div className={styles.progressTrack}>
            <i style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      <footer className={styles.bottomHud}>
        <article>
          <Clock3 size={18} />
          <span>RELÓGIO DO CASO</span>
          <strong>{formatCaseClock(currentClock)}</strong>
          <small>+{travelledHours.toFixed(1)}h simuladas</small>
        </article>

        <article>
          <Route size={18} />
          <span>ROTA URBANA</span>
          <strong>{route ? formatRouteDistance(route.distanceMeters) : 'Simulada'}</strong>
          <small>{route ? formatRouteDuration(route.durationSeconds) : 'rota segura'}</small>
        </article>

        <article>
          <Wallet size={18} />
          <span>CUSTO</span>
          <strong>R$ {travelledCost.toFixed(0)}</strong>
          <small>previsto R$ {destination.travelCost}</small>
        </article>

        <article className={styles.destinationCard}>
          <MapPin size={18} />
          <span>DESTINO</span>
          <strong>{destination.name}</strong>
          <small>{localizedDestination}</small>
        </article>
      </footer>
    </section>
  );
};
