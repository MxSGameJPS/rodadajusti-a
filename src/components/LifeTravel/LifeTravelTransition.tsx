import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bus,
  Car,
  Clock3,
  Loader2,
  Navigation,
  Route,
  SkipForward,
  Wallet,
} from 'lucide-react';
import type { PlayerProfile } from '../../types/game';
import {
  buildLifeTravelResult,
  type LifeTravelRequest,
  type LifeTravelResult,
} from '../../lib/lifeTravel';
import {
  applyRotaJusticeMapTheme,
  buildOpenStreetMapStyle,
  loadMapLibre,
} from '../../lib/maplibreClient';
import { formatRouteDistance } from '../../lib/worldMap';
import styles from './LifeTravelTransition.module.css';

interface LifeTravelTransitionProps {
  player: PlayerProfile;
  request: LifeTravelRequest;
  onComplete: (result: LifeTravelResult) => void;
}

function coordinateAtProgress(
  coordinates: [number, number][],
  progress: number,
): [number, number] {
  const maxIndex = coordinates.length - 1;
  if (maxIndex <= 0) return coordinates[0] || [0, 0];

  const scaled = Math.max(0, Math.min(1, progress)) * maxIndex;
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(maxIndex, lowerIndex + 1);
  const local = scaled - lowerIndex;
  const a = coordinates[lowerIndex];
  const b = coordinates[upperIndex];

  return [
    a[0] + (b[0] - a[0]) * local,
    a[1] + (b[1] - a[1]) * local,
  ];
}

function animationDuration(result: LifeTravelResult) {
  return Math.round(
    Math.max(4200, Math.min(7800, 4300 + result.distanceKm * 260)),
  );
}

function placeMarker(label: string, accent: string) {
  const root = document.createElement('div');
  root.className = styles.placeMarker;
  root.style.borderColor = accent;

  const dot = document.createElement('span');
  dot.style.background = accent;
  root.appendChild(dot);

  const caption = document.createElement('strong');
  caption.textContent = label;
  root.appendChild(caption);
  return root;
}

function movingVehicle(transport: LifeTravelResult['transport']) {
  const root = document.createElement('div');
  root.className = styles.vehicleMarker;
  root.textContent = transport === 'CAR' ? '🚙' : '🚌';
  return root;
}

export const LifeTravelTransition: React.FC<LifeTravelTransitionProps> = ({
  player,
  request,
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const vehicleMarkerRef = useRef<any>(null);
  const completedRef = useRef(false);
  const [result, setResult] = useState<LifeTravelResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState('');

  const finish = () => {
    if (!result || completedRef.current) return;
    completedRef.current = true;
    setProgress(1);
    onComplete(result);
  };

  useEffect(() => {
    let active = true;
    completedRef.current = false;
    setResult(null);
    setProgress(0);
    setMapReady(false);
    setFallback(false);
    setError('');

    void buildLifeTravelResult(player, request.origin, request.destination)
      .then((next) => {
        if (active) setResult(next);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Não foi possível calcular o deslocamento.');
      });

    return () => {
      active = false;
    };
  }, [
    request.origin,
    request.destination,
    request.reason,
    player.homeCity,
    player.homeState,
    player.household.residence.latitude,
    player.household.residence.longitude,
    player.household.vehicles.length,
  ]);

  useEffect(() => {
    if (!result || !containerRef.current || error) return undefined;

    let disposed = false;
    let mountedMap: any = null;
    let originMarker: any = null;
    let destinationMarker: any = null;

    const mount = async () => {
      try {
        const maplibre = await loadMapLibre();
        if (disposed || !containerRef.current) return;

        const first = result.route.coordinates[0];
        const last = result.route.coordinates[result.route.coordinates.length - 1];
        if (!first || !last) {
          setFallback(true);
          return;
        }

        const map = new maplibre.Map({
          container: containerRef.current,
          style: buildOpenStreetMapStyle(),
          center: first,
          zoom: 13.7,
          minZoom: 3,
          maxZoom: 18,
          attributionControl: true,
          interactive: false,
          fadeDuration: 0,
          pitch: 50,
          bearing: -12,
        });

        mountedMap = map;
        mapRef.current = map;

        map.once('load', () => {
          if (disposed) return;
          applyRotaJusticeMapTheme(map);

          map.addSource('life-travel-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: result.route.coordinates,
              },
            },
          });

          map.addLayer({
            id: 'life-travel-route-glow',
            type: 'line',
            source: 'life-travel-route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#E3BF67',
              'line-width': 13,
              'line-opacity': 0.15,
              'line-blur': 5,
            },
          });

          map.addLayer({
            id: 'life-travel-route-line',
            type: 'line',
            source: 'life-travel-route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#D5B158',
              'line-width': 4,
              'line-opacity': 0.96,
            },
          });

          originMarker = new maplibre.Marker({
            element: placeMarker('A', '#5B89B5'),
            anchor: 'bottom',
          }).setLngLat(first).addTo(map);

          destinationMarker = new maplibre.Marker({
            element: placeMarker('B', '#4BA67E'),
            anchor: 'bottom',
          }).setLngLat(last).addTo(map);

          vehicleMarkerRef.current = new maplibre.Marker({
            element: movingVehicle(result.transport),
            anchor: 'center',
            pitchAlignment: 'viewport',
            rotationAlignment: 'viewport',
          }).setLngLat(first).addTo(map);

          const bounds = new maplibre.LngLatBounds(first, first);
          result.route.coordinates.forEach((coordinate) => bounds.extend(coordinate));
          map.fitBounds(bounds, { padding: 90, maxZoom: 15.2, duration: 0 });
          setMapReady(true);
        });
      } catch {
        setFallback(true);
      }
    };

    void mount();

    return () => {
      disposed = true;
      if (originMarker) originMarker.remove();
      if (destinationMarker) destinationMarker.remove();
      if (vehicleMarkerRef.current) vehicleMarkerRef.current.remove();
      vehicleMarkerRef.current = null;
      if (mountedMap) mountedMap.remove();
      mapRef.current = null;
    };
  }, [result, error]);

  useEffect(() => {
    if (!result || error || (!mapReady && !fallback)) return undefined;

    const duration = animationDuration(result);
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const next = Math.min(1, (now - startedAt) / duration);
      setProgress(next);

      if (next >= 1) {
        window.setTimeout(finish, 420);
        return;
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, mapReady, fallback, error]);

  useEffect(() => {
    if (!result || !vehicleMarkerRef.current || !mapReady) return;
    const coordinate = coordinateAtProgress(result.route.coordinates, progress);
    vehicleMarkerRef.current.setLngLat(coordinate);
  }, [progress, result, mapReady]);

  const status = progress < 0.18
    ? 'Saindo do local'
    : progress < 0.82
      ? 'Em deslocamento'
      : 'Chegando ao destino';

  return (
    <section className={styles.scene}>
      <div className={styles.mapLayer}>
        {!result && !error && (
          <div className={styles.loading}>
            <Loader2 size={34} />
            <strong>Calculando deslocamento...</strong>
            <span>Localizando origem, destino e melhor percurso.</span>
          </div>
        )}

        {error && (
          <div className={styles.loading}>
            <Navigation size={34} />
            <strong>Não foi possível abrir a rota</strong>
            <span>{error}</span>
          </div>
        )}

        {result && !fallback && (
          <div ref={containerRef} className={styles.map} />
        )}

        {result && fallback && (
          <div className={styles.fallback}>
            <div className={styles.fallbackGrid} />
            <div className={styles.fallbackRoute} />
            <div
              className={styles.fallbackVehicle}
              style={{ left: 15 + progress * 70 + '%' }}
            >
              {result.transport === 'CAR' ? '🚙' : '🚌'}
            </div>
          </div>
        )}

        <div className={styles.shade} />
      </div>

      {result && (
        <>
          <header className={styles.topHud}>
            <div className={styles.identity}>
              <Navigation size={18} />
              <div>
                <span>DESLOCAMENTO DA ROTINA</span>
                <strong>{status}</strong>
              </div>
            </div>

            <div className={styles.routeTitle}>
              <strong>{result.origin.label}</strong>
              <ArrowRight size={15} />
              <strong>{result.destination.label}</strong>
            </div>

            <button type="button" className={styles.skip} onClick={finish}>
              <SkipForward size={15} />
              Pular animação
            </button>
          </header>

          <div className={styles.progressPanel}>
            <span>{Math.round(progress * 100)}% do trajeto</span>
            <div><i style={{ width: Math.round(progress * 100) + '%' }} /></div>
          </div>

          <footer className={styles.bottomHud}>
            <article>
              <Clock3 size={17} />
              <span>Tempo simulado</span>
              <strong>{result.travelMinutes} min</strong>
            </article>

            <article>
              <Route size={17} />
              <span>Distância</span>
              <strong>{formatRouteDistance(result.route.distanceMeters)}</strong>
            </article>

            <article>
              {result.transport === 'CAR' ? <Car size={17} /> : <Bus size={17} />}
              <span>Transporte</span>
              <strong>{result.transport === 'CAR' ? 'Carro próprio' : 'Ônibus'}</strong>
            </article>

            <article>
              <Wallet size={17} />
              <span>Custo</span>
              <strong>JR$ {result.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </article>
          </footer>
        </>
      )}
    </section>
  );
};
