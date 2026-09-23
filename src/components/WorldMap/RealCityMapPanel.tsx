import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Loader2, MapPin, Navigation, Route } from 'lucide-react';
import type { LegalCase, LocationScene, PlayerProfile } from '../../types/game';
import { readCurrentPlayerSnapshot } from '../../lib/professionalRpg';
import { applyRotaJusticeMapTheme, buildOpenStreetMapStyle, loadMapLibre } from '../../lib/maplibreClient';
import { registerActiveWorldMap, unregisterActiveWorldMap } from '../../lib/worldMapRuntime';
import {
  establishmentTypeLabel,
  formatEstablishmentPrice,
  loadWorldEstablishmentsWithDiagnostics,
  resolveWorldPointForEstablishment,
  type WorldEstablishment,
} from '../../lib/worldEstablishments';
import {
  getHomePoint,
  getUniversityName,
  getUniversityPoint,
} from '../../lib/lifeSimulation';
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
  resolveStableRoadPoint,
  type WorldMapProfile,
  type WorldRoute,
} from '../../lib/worldMap';
import styles from './RealCityMapPanel.module.css';

interface RealCityMapPanelProps {
  currentCase: LegalCase;
  currentLocationId: string;
  unlockedLocationIds: string[];
  onTravelToLocation: (location: LocationScene) => void;
  onOpenPlayerHome?: () => void;
  onStudyAtUniversity?: () => void;
  immersive?: boolean;
}

const ROUTE_SOURCE_ID = 'rota-preview-route';
const ROUTE_GLOW_LAYER_ID = 'rota-preview-route-glow';
const ROUTE_CASING_LAYER_ID = 'rota-preview-route-casing';
const ROUTE_LAYER_ID = 'rota-preview-route-layer';

function stableMapPointKey(
  profile: WorldMapProfile,
  logicalId: string,
) {
  return [profile.city, profile.state, logicalId].join(':');
}

function markerGlyph(location?: LocationScene, isOffice = false) {
  if (isOffice) return 'RA';
  if (!location) return '•';
  if (location.category === 'tribunal') return '⚖';
  if (location.category === 'delegacia') return 'DP';
  if (location.category === 'residencia') return '⌂';
  if (location.category === 'banco') return 'R$';
  if (location.category === 'cartorio') return 'DOC';
  if (location.category === 'empresa') return 'EMP';
  return '•';
}

function markerCategoryClass(location?: LocationScene, isOffice = false) {
  if (isOffice) return styles.markerOffice;
  if (!location) return styles.markerGeneric;

  const byCategory: Record<LocationScene['category'], string> = {
    tribunal: styles.markerTribunal,
    delegacia: styles.markerPolice,
    residencia: styles.markerHome,
    banco: styles.markerBank,
    cartorio: styles.markerRegistry,
    empresa: styles.markerCompany,
    escritorio: styles.markerOffice,
  };

  return byCategory[location.category] || styles.markerGeneric;
}

function buildGameMarker(
  label: string,
  glyph: string,
  className: string,
  isCurrent: boolean,
) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `${styles.gameMarker} ${className} ${isCurrent ? styles.gameMarkerCurrent : ''}`;

  const pin = document.createElement('span');
  pin.className = styles.gameMarkerPin;

  const icon = document.createElement('span');
  icon.className = styles.gameMarkerGlyph;
  icon.textContent = glyph;
  pin.appendChild(icon);

  const caption = document.createElement('span');
  caption.className = styles.gameMarkerLabel;
  caption.textContent = label;

  element.appendChild(pin);
  element.appendChild(caption);
  element.title = label;

  return element;
}

function buildEstablishmentMarker(establishment: WorldEstablishment) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = [
    styles.establishmentMarker,
    establishment.presenceScope === 'UNIVERSAL' ? styles.establishmentMarkerUniversal : '',
    establishment.isSponsored ? styles.establishmentMarkerSponsored : '',
  ].filter(Boolean).join(' ');

  const visual = document.createElement('span');
  visual.className = styles.establishmentMarkerVisual;

  if (establishment.bannerUrl) {
    const image = document.createElement('img');
    image.src = establishment.bannerUrl;
    image.alt = '';
    image.loading = 'lazy';
    image.className = styles.establishmentMarkerBanner;
    visual.appendChild(image);
  } else {
    const fallback = document.createElement('span');
    fallback.className = styles.establishmentMarkerFallback;
    fallback.textContent = establishment.name.slice(0, 2).toUpperCase();
    visual.appendChild(fallback);
  }

  const badge = document.createElement('span');
  badge.className = styles.establishmentMarkerBadge;
  badge.textContent = establishment.isSponsored
    ? 'Patrocinado'
    : establishment.presenceScope === 'UNIVERSAL'
      ? 'Universal'
      : establishmentTypeLabel(establishment.businessType);
  visual.appendChild(badge);

  const caption = document.createElement('span');
  caption.className = styles.establishmentMarkerCaption;
  caption.textContent = establishment.name;

  element.appendChild(visual);
  element.appendChild(caption);
  element.title = establishment.name;

  return element;
}

export const RealCityMapPanel: React.FC<RealCityMapPanelProps> = ({
  currentCase,
  currentLocationId,
  unlockedLocationIds,
  onTravelToLocation,
  onOpenPlayerHome,
  onStudyAtUniversity,
  immersive = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [profile, setProfile] = useState<WorldMapProfile | null>(null);
  const [cityInput, setCityInput] = useState('');
  const [stateInput, setStateInput] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapError, setMapError] = useState('');
  const [setupError, setSetupError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationScene | null>(null);
  const [establishments, setEstablishments] = useState<WorldEstablishment[]>([]);
  const [selectedEstablishment, setSelectedEstablishment] = useState<WorldEstablishment | null>(null);
  const [selectedLifeLocation, setSelectedLifeLocation] = useState<'HOME' | 'UNIVERSITY' | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [catalogWarning, setCatalogWarning] = useState('');
  const [route, setRoute] = useState<WorldRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [mapReadyVersion, setMapReadyVersion] = useState(0);

  const unlockedKey = unlockedLocationIds.join('|');
  const unlockedSet = useMemo(() => new Set(unlockedLocationIds), [unlockedKey]);
  const establishmentsKey = establishments
    .map((item) => [item.id, item.bannerUrl || '', item.presenceScope, item.isSponsored ? '1' : '0'].join(':'))
    .join('|');
  const currentLocation = useMemo(
    () => currentCase.locations.find((location) => location.id === currentLocationId) || currentCase.locations[0] || null,
    [currentCase.locations, currentLocationId],
  );
  const officeLocation = useMemo(
    () => currentCase.locations.find((location) => location.category === 'escritorio' || /ESCRITORIO_RAMOS/i.test(location.id)) || null,
    [currentCase.locations],
  );
  const officeDisplayName = officeLocation?.name || 'Base profissional';

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
    if (!profile) {
      setEstablishments([]);
      setSelectedEstablishment(null);
      return undefined;
    }

    let active = true;
    void loadWorldEstablishmentsWithDiagnostics(profile).then((result) => {
      if (!active) return;
      setEstablishments(result.items);
      setCatalogError(result.error || '');
      setCatalogWarning((result.warnings || []).join(' • '));
      setSelectedEstablishment((current) => (
        current ? result.items.find((item) => item.id === current.id) || null : null
      ));
    });

    return () => {
      active = false;
    };
  }, [profile?.city, profile?.state, profile?.center.lat, profile?.center.lng]);

  useEffect(() => {
    if (!profile || !mapContainerRef.current) return undefined;
    let disposed = false;
    let mountedMap: any = null;

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
          pitch: immersive ? 48 : 0,
          bearing: immersive ? -12 : 0,
        });

        mountedMap = map;
        mapRef.current = map;
        registerActiveWorldMap(map);
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');

        map.on('load', () => {
          if (disposed) return;

          if (immersive) {
            applyRotaJusticeMapTheme(map);
          }

          setMapReadyVersion((value) => value + 1);
        });
      } catch {
        if (!disposed) {
          setMapError('O mapa real não pôde ser carregado agora. As diligências continuam disponíveis pelos locais do caso.');
        }
      }
    };

    void mount();

    return () => {
      disposed = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      if (mountedMap) {
        unregisterActiveWorldMap(mountedMap);
        mountedMap.remove();
      }

      if (mapRef.current === mountedMap) mapRef.current = null;
    };
  }, [
    profile?.city,
    profile?.state,
    profile?.center.lng,
    profile?.center.lat,
    immersive,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !profile || mapReadyVersion === 0) return undefined;

    let active = true;

    const syncMarkers = async () => {
      const maplibre = await loadMapLibre();
      if (!active || mapRef.current !== map) return;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const points: [number, number][] = [];
      const officeRawPoint = getRamosOfficePoint(profile);
      const officePoint = await resolveStableRoadPoint(
        stableMapPointKey(profile, 'office:ramos'),
        officeRawPoint,
      );
      const currentRawPoint = currentLocation
        ? getWorldPointForLocation(profile, currentCase.id, currentLocation)
        : officeRawPoint;
      const currentPoint = await resolveStableRoadPoint(
        stableMapPointKey(
          profile,
          currentLocation
            ? 'case:' + currentCase.id + ':location:' + currentLocation.id
            : 'office:ramos',
        ),
        currentRawPoint,
      );
      if (!active || mapRef.current !== map) return;
      points.push([officePoint.lng, officePoint.lat]);

      if (player) {
        const homePoint = getHomePoint(player, profile);
        points.push([homePoint.lng, homePoint.lat]);

        const homeElement = buildGameMarker(
          'Sua casa',
          '⌂',
          styles.markerHome,
          false,
        );
        homeElement.addEventListener('click', () => {
          setSelectedLocation(null);
          setSelectedEstablishment(null);
          setRoute(null);
          setSelectedLifeLocation('HOME');
        });
        markersRef.current.push(
          new maplibre.Marker({ element: homeElement, anchor: 'bottom' })
            .setLngLat([homePoint.lng, homePoint.lat])
            .addTo(map),
        );

        const isIntern = player.careerTier === 'ESTAGIARIO'
          || player.careerTier === 'ESTAGIARIO_SENIOR';

        if (isIntern) {
          const universityPoint = await resolveStableRoadPoint(
            stableMapPointKey(profile, 'university'),
            getUniversityPoint(player, profile),
          );
          if (!active || mapRef.current !== map) return;
          points.push([universityPoint.lng, universityPoint.lat]);

          const universityElement = buildGameMarker(
            getUniversityName(profile),
            'UNI',
            styles.markerUniversity,
            false,
          );
          universityElement.addEventListener('click', () => {
            setSelectedLocation(null);
            setSelectedEstablishment(null);
            setRoute(null);
            setSelectedLifeLocation('UNIVERSITY');
          });
          markersRef.current.push(
            new maplibre.Marker({ element: universityElement, anchor: 'bottom' })
              .setLngLat([universityPoint.lng, universityPoint.lat])
              .addTo(map),
          );
        }
      }

      const officeElement = buildGameMarker(
        officeDisplayName,
        markerGlyph(officeLocation || undefined, true),
        markerCategoryClass(officeLocation || undefined, true),
        officeLocation?.id === currentLocationId,
      );

      if (officeLocation) {
        officeElement.addEventListener('click', () => {
          setSelectedLifeLocation(null);
          setSelectedEstablishment(null);
          setSelectedLocation(officeLocation);
        });
      }

      markersRef.current.push(
        new maplibre.Marker({ element: officeElement, anchor: 'bottom' })
          .setLngLat([officePoint.lng, officePoint.lat])
          .addTo(map),
      );

      const unlockedLocations = currentCase.locations.filter((location) => (
        unlockedSet.has(location.id)
        && location.category !== 'escritorio'
        && !/ESCRITORIO_RAMOS/i.test(location.id)
      ));

      const locationPoints = await Promise.all(
        unlockedLocations.map(async (location) => ({
          location,
          point: await resolveStableRoadPoint(
            stableMapPointKey(
              profile,
              'case:' + currentCase.id + ':location:' + location.id,
            ),
            getWorldPointForLocation(profile, currentCase.id, location),
          ),
        })),
      );

      const establishmentPoints = await Promise.all(
        establishments.map(async (establishment) => ({
          establishment,
          point: await resolveStableRoadPoint(
            stableMapPointKey(
              profile,
              'establishment:' + establishment.id,
            ),
            await resolveWorldPointForEstablishment(profile, establishment),
          ),
        })),
      );

      if (!active || mapRef.current !== map) return;

      locationPoints.forEach(({ location, point }) => {
        points.push([point.lng, point.lat]);

        const element = buildGameMarker(
          location.name,
          markerGlyph(location),
          markerCategoryClass(location),
          location.id === currentLocationId,
        );

        element.addEventListener('click', () => {
          setSelectedLifeLocation(null);
          setSelectedEstablishment(null);
          setSelectedLocation(location);
        });
        markersRef.current.push(
          new maplibre.Marker({ element, anchor: 'bottom' })
            .setLngLat([point.lng, point.lat])
            .addTo(map),
        );
      });

      establishmentPoints.forEach(({ establishment, point }) => {
        points.push([point.lng, point.lat]);

        const element = buildEstablishmentMarker(establishment);
        element.addEventListener('click', () => {
          setSelectedLifeLocation(null);
          setSelectedLocation(null);
          setRoute(null);
          setSelectedEstablishment(establishment);
        });

        markersRef.current.push(
          new maplibre.Marker({ element, anchor: 'bottom' })
            .setLngLat([point.lng, point.lat])
            .addTo(map),
        );
      });

      if (immersive) {
        map.easeTo({
          center: [currentPoint.lng, currentPoint.lat],
          zoom: Math.max(14.7, map.getZoom?.() || 15.15),
          pitch: 55,
          bearing: -16,
          duration: 520,
        });
      } else if (points.length > 1) {
        const bounds = new maplibre.LngLatBounds();
        points.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds, { padding: 68, maxZoom: 14.4, duration: 520 });
      }
    };

    void syncMarkers();

    return () => {
      active = false;
    };
  }, [
    mapReadyVersion,
    profile,
    currentCase.id,
    currentLocationId,
    unlockedKey,
    officeDisplayName,
    officeLocation?.id,
    establishmentsKey,
    player?.careerTier,
    player?.household?.residence?.latitude,
    player?.household?.residence?.longitude,
    immersive,
  ]);

  useEffect(() => {
    if (!profile || !selectedLocation || !currentLocation || selectedLocation.id === currentLocation.id) {
      setRoute(null);
      setRouteLoading(false);
      return undefined;
    }

    let active = true;
    setRouteLoading(true);
    const loadRoute = async () => {
      const [origin, destination] = await Promise.all([
        resolveStableRoadPoint(
          stableMapPointKey(
            profile,
            'case:' + currentCase.id + ':location:' + currentLocation.id,
          ),
          getWorldPointForLocation(profile, currentCase.id, currentLocation),
        ),
        resolveStableRoadPoint(
          stableMapPointKey(
            profile,
            'case:' + currentCase.id + ':location:' + selectedLocation.id,
          ),
          getWorldPointForLocation(profile, currentCase.id, selectedLocation),
        ),
      ]);

      const result = await fetchRoadRoute(origin, destination);
      if (!active) return;
      setRoute(result);
      setRouteLoading(false);
    };

    void loadRoute();
    return () => {
      active = false;
    };
  }, [profile, selectedLocation?.id, currentLocation?.id, currentCase.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = async () => {
      if (!mapRef.current) return;
      if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
      if (map.getLayer(ROUTE_CASING_LAYER_ID)) map.removeLayer(ROUTE_CASING_LAYER_ID);
      if (map.getLayer(ROUTE_GLOW_LAYER_ID)) map.removeLayer(ROUTE_GLOW_LAYER_ID);
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
          'line-opacity': 0.18,
          'line-blur': 6,
        },
      });

      map.addLayer({
        id: ROUTE_CASING_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#090B0C',
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 6, 16, 11],
          'line-opacity': 0.94,
        },
      });

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

      const first = route.coordinates[0];
      if (!first) return;
      const maplibre = await loadMapLibre();
      if (!mapRef.current) return;
      const bounds = new maplibre.LngLatBounds(first, first);
      route.coordinates.forEach((coordinate) => bounds.extend(coordinate));
      mapRef.current.fitBounds(bounds, { padding: immersive ? 140 : 80, maxZoom: immersive ? 15.4 : 15, duration: 700 });
    };

    if (map.isStyleLoaded()) void draw();
    else map.once('load', () => void draw());
  }, [route]);

  const configureCity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!player || !cityInput.trim() || !stateInput.trim()) return;
    setIsGeocoding(true);
    setSetupError('');
    try {
      const result = await geocodeBrazilianCity(cityInput, stateInput);
      const saved = saveWorldMapProfile(player, { ...result, source: 'USER_SETUP' });
      setProfile(saved);
      setSelectedLocation(null);
      setSelectedEstablishment(null);
      setSelectedLifeLocation(null);
      setRoute(null);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'Não foi possível localizar essa cidade.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const setupVisible = !profile;

  return (
    <section className={`${styles.shell} ${immersive ? styles.immersive : ''}`}>
      {!immersive && <header className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.icon}><Navigation size={19} /></div>
          <div>
            <span className={styles.eyebrow}>Mapa real da carreira</span>
            <h3>{profile ? `${profile.city} • ${profile.state}` : 'Sua cidade vira o tabuleiro'}</h3>
          </div>
        </div>
        {profile && <span className={styles.cityLockedNote}>Mudanças de cidade são feitas pelo escritório</span>}
      </header>}

      {setupVisible ? (
        <div className={styles.setup}>
          <div className={styles.setupCard}>
            <MapPin size={30} color="#C5A059" />
            <h4>Ativar mapa real da carreira</h4>
            <p>Informe apenas a cidade e o estado. O jogo posicionará sua base profissional na região central e criará pontos fictícios de diligência sobre ruas reais, sem associar NPCs a residências de pessoas reais.</p>
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
            {immersive && <div className={styles.mapAtmosphere} aria-hidden="true" />}
            <div className={styles.cityBadge}>
              <strong><Building2 size={12} style={{ display: 'inline', marginRight: 5 }} /> {officeDisplayName}</strong>
              <span>Região central virtual • {profile.city}/{profile.state}</span>
            </div>
            {mapError && <div className={styles.mapError}>{mapError}</div>}

            <div className={`${styles.catalogStatus} ${catalogError ? styles.catalogStatusError : ''}`}>
              {catalogError
                ? `Comércio indisponível: ${catalogError}`
                : establishments.length > 0
                  ? `Comércio ativo: ${establishments.length} estabelecimento(s)${catalogWarning ? ' • ' + catalogWarning : ''}`
                  : `Comércio ativo: 0 estabelecimento(s) para ${profile.city}/${profile.state}${catalogWarning ? ' • ' + catalogWarning : ''}`}
            </div>

            {selectedLifeLocation === 'HOME' && player && (
              <div className={styles.detailCard}>
                <div>
                  <strong>Sua casa</strong>
                  <span>
                    {player.household.residence.street
                      ? `${player.household.residence.street} • ponto aproximado • ${profile.city}/${profile.state}`
                      : `Residência • ${profile.city}/${profile.state}`}
                  </span>
                  <small>Vida pessoal: dormir, tomar banho, comer, estudar e pagar contas.</small>
                </div>
                <button
                  type="button"
                  className={styles.routeButton}
                  onClick={() => onOpenPlayerHome?.()}
                >
                  Entrar em casa
                </button>
              </div>
            )}

            {selectedLifeLocation === 'UNIVERSITY' && player && (
              <div className={styles.detailCard}>
                <div>
                  <strong>{getUniversityName(profile)}</strong>
                  <span>Vida acadêmica • {profile.city}/{profile.state}</span>
                  <small>Disponível enquanto o personagem estiver em estágio.</small>
                </div>
                <button
                  type="button"
                  className={styles.routeButton}
                  onClick={() => onStudyAtUniversity?.()}
                >
                  Estudar • 3h
                </button>
              </div>
            )}

            {selectedEstablishment && (
              <div className={`${styles.detailCard} ${styles.establishmentDetailCard}`}>
                <div className={styles.establishmentDetailBody}>
                  {selectedEstablishment.bannerUrl && (
                    <img
                      className={styles.establishmentDetailBanner}
                      src={selectedEstablishment.bannerUrl}
                      alt={`Banner de ${selectedEstablishment.name}`}
                    />
                  )}
                  <div className={styles.establishmentDetailCopy}>
                    <div className={styles.establishmentDetailBadges}>
                      <span>{establishmentTypeLabel(selectedEstablishment.businessType)}</span>
                      {selectedEstablishment.presenceScope === 'UNIVERSAL' && <span>Universal</span>}
                      {selectedEstablishment.isSponsored && <span>Patrocinado</span>}
                    </div>
                    <strong>{selectedEstablishment.name}</strong>
                    <span>
                      {selectedEstablishment.district
                        ? `${selectedEstablishment.district} • ${profile.city}/${profile.state}`
                        : `${profile.city}/${profile.state}`}
                    </span>
                    <small>{selectedEstablishment.description}</small>
                    {selectedEstablishment.offers.length > 0 && (
                      <div className={styles.establishmentOffers}>
                        {selectedEstablishment.offers.slice(0, 3).map((offer) => (
                          <span key={offer.id} className={styles.establishmentOffer}>
                            {offer.title} • {formatEstablishmentPrice(offer.price)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.detailCloseButton}
                  onClick={() => setSelectedEstablishment(null)}
                >
                  Fechar
                </button>
              </div>
            )}

            {!selectedLifeLocation && !selectedEstablishment && selectedLocation && (
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
          {!immersive && <div className={styles.legend}>
            <span><strong>Mapa:</strong> OpenStreetMap + MapLibre</span>
            <span><strong>Rotas:</strong> malha viária real quando disponível</span>
            <span><strong>NPCs:</strong> pontos fictícios e seguros dentro da cidade</span>
            <span><strong>Comércio:</strong> {establishments.length} estabelecimento(s) publicado(s)</span>
          </div>}
        </>
      )}
    </section>
  );
};
