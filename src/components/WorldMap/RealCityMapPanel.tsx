import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Loader2, MapPin, Navigation, Route, Settings2 } from 'lucide-react';
import type { LegalCase, LocationScene, PlayerProfile } from '../../types/game';
import { readCurrentPlayerSnapshot } from '../../lib/professionalRpg';
import { buildOpenStreetMapStyle, loadMapLibre } from '../../lib/maplibreClient';
import {
  WORLD_MAP_UPDATED_EVENT,
  fetchRoadRoute,
  formatRouteDistance,
  formatRouteDuration,
  geocodeBrazilianCity,
  getDeclaredPlayerCity,
  getLocalizedLocationLabel,
  getRamosOfficePoint,
  getWorldPointForLocation,
  readWorldMapProfile,
  resolveWorldMapProfile,
  saveWorldMapProfile,
  type WorldMapProfile,
  type WorldRoute,
} from '../../lib/worldMap';
import styles from './RealCityMapPanel.module.css';

interface RealCityMapPanelProps {
  currentCase: LegalCase;
  currentLocationId: string;
  unlockedLocationIds: string[];
  onTravelToLocation: (location: LocationScene) => void;
}

const ROUTE_SOURCE_ID = 'rota-preview-route';
const ROUTE_LAYER_ID = 'rota-preview-route-layer';

function markerGlyph(location?: LocationScene, isOffice = false) {
  if (isOffice) return 'R';
  if (!location) return '•';
  if (location.category === 'tribunal') return '⚖';
  if (location.category === 'delegacia') return 'D';
  if (location.category === 'residencia') return 'C';
  if (location.category === 'banco') return '$';
  return '•';
}

export const RealCityMapPanel: React.FC<RealCityMapPanelProps> = ({
  currentCase,
  currentLocationId,
  unlockedLocationIds,
  onTravelToLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [profile, setProfile] = useState<WorldMapProfile | null>(null);
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [stateInput, setStateInput] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapError, setMapError] = useState('');
  const [setupError, setSetupError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationScene | null>(null);
  const [route, setRoute] = useState<WorldRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const unlockedKey = unlockedLocationIds.join('|');
  const unlockedSet = useMemo(() => new Set(unlockedLocationIds), [unlockedKey]);
  const currentLocation = useMemo(
    () => currentCase.locations.find((location) => location.id === currentLocationId) || currentCase.locations[0] || null,
    [currentCase.locations, currentLocationId],
  );

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      const currentPlayer = readCurrentPlayerSnapshot();
      if (!active || !currentPlayer) return;
      setPlayer(currentPlayer);

      const declared = getDeclaredPlayerCity(currentPlayer);
      setCityInput(declared.city);
      setStateInput(declared.state);

      const saved = readWorldMapProfile(currentPlayer);
      if (saved) {
        setProfile(saved);
        setCityInput(saved.city);
        setStateInput(saved.state);
        return;
      }

      const resolved = await resolveWorldMapProfile(currentPlayer);
      if (!active || !resolved) return;
      setProfile(resolved);
      setCityInput(resolved.city);
      setStateInput(resolved.state);
    };

    hydrate();
    const refresh = () => {
      const currentPlayer = readCurrentPlayerSnapshot();
      if (!currentPlayer) return;
      setPlayer(currentPlayer);
      const next = readWorldMapProfile(currentPlayer);
      setProfile(next);
      if (next) {
        setCityInput(next.city);
        setStateInput(next.state);
      }
    };
    window.addEventListener(WORLD_MAP_UPDATED_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(WORLD_MAP_UPDATED_EVENT, refresh);
    };
  }, []);

  useEffect(() => {
    if (!profile || isEditingCity || !mapContainerRef.current) return undefined;
    let disposed = false;

    const mount = async () => {
      try {
        setMapError('');
        const maplibre = await loadMapLibre();
        if (disposed || !mapContainerRef.current) return;

        const map = new maplibre.Map({
          container: mapContainerRef.current,
          style: buildOpenStreetMapStyle(),
          center: [profile.center.lng, profile.center.lat],
          zoom: 13.2,
          minZoom: 3,
          maxZoom: 18,
          attributionControl: true,
        });
        mapRef.current = map;
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');

        map.on('load', () => {
          if (disposed) return;
          const points: [number, number][] = [];
          const officeLocation = currentCase.locations.find((location) => location.category === 'escritorio' || /ESCRITORIO_RAMOS/i.test(location.id));
          const officePoint = getRamosOfficePoint(profile);
          points.push([officePoint.lng, officePoint.lat]);

          const officeElement = document.createElement('button');
          officeElement.type = 'button';
          officeElement.className = officeLocation?.id === currentLocationId ? styles.currentMarker : styles.officeMarker;
          const officeText = document.createElement('span');
          officeText.textContent = markerGlyph(officeLocation, true);
          officeElement.appendChild(officeText);
          officeElement.title = 'Ramos & Associados';
          if (officeLocation) officeElement.addEventListener('click', () => setSelectedLocation(officeLocation));
          markersRef.current.push(new maplibre.Marker({ element: officeElement, anchor: 'bottom' })
            .setLngLat([officePoint.lng, officePoint.lat])
            .addTo(map));

          currentCase.locations.forEach((location) => {
            if (!unlockedSet.has(location.id)) return;
            if (location.category === 'escritorio' || /ESCRITORIO_RAMOS/i.test(location.id)) return;
            const point = getWorldPointForLocation(profile, currentCase.id, location);
            points.push([point.lng, point.lat]);
            const element = document.createElement('button');
            element.type = 'button';
            element.className = location.id === currentLocationId ? styles.currentMarker : styles.marker;
            const text = document.createElement('span');
            text.textContent = markerGlyph(location);
            element.appendChild(text);
            element.title = location.name;
            element.addEventListener('click', () => setSelectedLocation(location));
            markersRef.current.push(new maplibre.Marker({ element, anchor: 'bottom' })
              .setLngLat([point.lng, point.lat])
              .addTo(map));
          });

          if (points.length > 1) {
            const bounds = new maplibre.LngLatBounds();
            points.forEach((point) => bounds.extend(point));
            map.fitBounds(bounds, { padding: 68, maxZoom: 14.4, duration: 850 });
          }
        });
      } catch {
        if (!disposed) setMapError('O mapa real não pôde ser carregado agora. As diligências continuam disponíveis pelos cartões abaixo.');
      }
    };

    mount();
    return () => {
      disposed = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (mapRef.current) mapRef.current.remove();
      mapRef.current = null;
    };
  }, [profile?.city, profile?.state, profile?.center.lng, profile?.center.lat, currentCase.id, currentLocationId, unlockedKey, isEditingCity]);

  useEffect(() => {
    if (!profile || !selectedLocation || !currentLocation || selectedLocation.id === currentLocation.id) {
      setRoute(null);
      setRouteLoading(false);
      return undefined;
    }

    let active = true;
    setRouteLoading(true);
    const origin = getWorldPointForLocation(profile, currentCase.id, currentLocation);
    const destination = getWorldPointForLocation(profile, currentCase.id, selectedLocation);
    fetchRoadRoute(origin, destination).then((result) => {
      if (!active) return;
      setRoute(result);
      setRouteLoading(false);
    });
    return () => {
      active = false;
    };
  }, [profile, selectedLocation?.id, currentLocation?.id, currentCase.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || isEditingCity) return;

    const draw = async () => {
      if (!mapRef.current) return;
      if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
      if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
      if (!route) return;

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
          'line-opacity': 0.9,
        },
      });

      const first = route.coordinates[0];
      if (!first) return;
      const maplibre = await loadMapLibre();
      if (!mapRef.current) return;
      const bounds = new maplibre.LngLatBounds(first, first);
      route.coordinates.forEach((coordinate) => bounds.extend(coordinate));
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 700 });
    };

    if (map.isStyleLoaded()) void draw();
    else map.once('load', () => void draw());
  }, [route, isEditingCity]);

  const configureCity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!player || !cityInput.trim() || !stateInput.trim()) return;
    setIsGeocoding(true);
    setSetupError('');
    try {
      const result = await geocodeBrazilianCity(cityInput, stateInput);
      const saved = saveWorldMapProfile(player, { ...result, source: 'USER_SETUP' });
      setProfile(saved);
      setIsEditingCity(false);
      setSelectedLocation(null);
      setRoute(null);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'Não foi possível localizar essa cidade.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const setupVisible = !profile || isEditingCity;

  return (
    <section className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.icon}><Navigation size={19} /></div>
          <div>
            <span className={styles.eyebrow}>Mapa real da carreira</span>
            <h3>{profile ? `${profile.city} • ${profile.state}` : 'Sua cidade vira o tabuleiro'}</h3>
          </div>
        </div>
        {profile && (
          <button type="button" className={styles.changeButton} onClick={() => setIsEditingCity((current) => !current)}>
            <Settings2 size={13} /> {isEditingCity ? 'Cancelar' : 'Trocar cidade'}
          </button>
        )}
      </header>

      {setupVisible ? (
        <div className={styles.setup}>
          <div className={styles.setupCard}>
            <MapPin size={30} color="#C5A059" />
            <h4>Ativar mapa real da carreira</h4>
            <p>Informe apenas a cidade e o estado. O jogo posicionará o Ramos & Associados na região central e criará pontos fictícios de diligência sobre ruas reais, sem associar NPCs a residências de pessoas reais.</p>
            <form className={styles.form} onSubmit={configureCity}>
              <input value={cityInput} onChange={(event) => setCityInput(event.target.value)} placeholder="Cidade, ex.: Santiago" maxLength={70} />
              <input value={stateInput} onChange={(event) => setStateInput(event.target.value)} placeholder="UF" maxLength={30} />
              <button type="submit" disabled={isGeocoding || !cityInput.trim() || !stateInput.trim()}>
                {isGeocoding ? <Loader2 size={15} className="animate-spin" /> : 'Usar esta cidade'}
              </button>
            </form>
            {setupError && <p className={styles.error}>{setupError}</p>}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.mapWrap}>
            <div ref={mapContainerRef} className={styles.map} />
            <div className={styles.cityBadge}>
              <strong><Building2 size={12} style={{ display: 'inline', marginRight: 5 }} /> Ramos & Associados</strong>
              <span>Região central virtual • {profile.city}/{profile.state}</span>
            </div>
            {mapError && <div className={styles.mapError}>{mapError}</div>}

            {selectedLocation && (
              <div className={styles.detailCard}>
                <div>
                  <strong>{selectedLocation.name}</strong>
                  <span>{getLocalizedLocationLabel(selectedLocation, profile)}</span>
                  {selectedLocation.id === currentLocationId ? (
                    <small>Você está neste local agora.</small>
                  ) : routeLoading ? (
                    <small>Calculando percurso pelas ruas...</small>
                  ) : route ? (
                    <small><Route size={11} style={{ display: 'inline', marginRight: 4 }} /> {formatRouteDistance(route.distanceMeters)} • cerca de {formatRouteDuration(route.durationSeconds)} {route.source === 'FALLBACK' ? '• rota aproximada' : ''}</small>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={styles.routeButton}
                  disabled={selectedLocation.id === currentLocationId}
                  onClick={() => onTravelToLocation(selectedLocation)}
                >
                  {selectedLocation.id === currentLocationId ? 'Você está aqui' : 'Iniciar deslocamento'}
                </button>
              </div>
            )}
          </div>
          <div className={styles.legend}>
            <span><strong>Mapa:</strong> OpenStreetMap + MapLibre</span>
            <span><strong>Rotas:</strong> malha viária real quando disponível</span>
            <span><strong>NPCs:</strong> pontos fictícios e seguros dentro da cidade</span>
          </div>
        </>
      )}
    </section>
  );
};
