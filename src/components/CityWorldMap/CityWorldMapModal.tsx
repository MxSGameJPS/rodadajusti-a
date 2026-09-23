import React, { useEffect, useRef, useState } from 'react';
import { Building2, GraduationCap, Home, Loader2, MapPin, ShoppingCart, X } from 'lucide-react';
import type { PlayerProfile } from '../../types/game';
import {
  applyRotaJusticeMapTheme,
  buildOpenStreetMapStyle,
  loadMapLibre,
} from '../../lib/maplibreClient';
import {
  readWorldMapProfile,
  resolveWorldMapProfile,
  resolveStableRoadPoint,
  type WorldMapProfile,
} from '../../lib/worldMap';
import {
  establishmentTypeLabel,
  formatEstablishmentPrice,
  loadWorldEstablishments,
  resolveWorldPointForEstablishment,
  type WorldEstablishment,
  type WorldEstablishmentOffer,
} from '../../lib/worldEstablishments';
import {
  getHomePoint,
  getUniversityName,
  getUniversityPoint,
} from '../../lib/lifeSimulation';
import styles from '../WorldMap/RealCityMapPanel.module.css';

function stableCityPointKey(profile: WorldMapProfile, logicalId: string) {
  return [profile.city, profile.state, logicalId].join(':');
}

interface CityWorldMapModalProps {
  player: PlayerProfile;
  isOpen: boolean;
  onClose: () => void;
  onOpenHome: () => void;
  onStudyAtUniversity: () => void;
  onPurchaseOffer: (
    establishment: WorldEstablishment,
    offer: WorldEstablishmentOffer,
  ) => { ok: boolean; message: string };
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

function buildLifeMarker(label: string, glyph: string, tone: 'HOME' | 'UNIVERSITY') {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = [
    styles.lifeMarker,
    tone === 'HOME' ? styles.lifeMarkerHome : styles.lifeMarkerUniversity,
  ].join(' ');

  const icon = document.createElement('span');
  icon.className = styles.lifeMarkerIcon;
  icon.textContent = glyph;

  const caption = document.createElement('span');
  caption.className = styles.lifeMarkerCaption;
  caption.textContent = label;

  element.appendChild(icon);
  element.appendChild(caption);
  element.title = label;
  return element;
}

export const CityWorldMapModal: React.FC<CityWorldMapModalProps> = ({
  player,
  isOpen,
  onClose,
  onOpenHome,
  onStudyAtUniversity,
  onPurchaseOffer,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [profile, setProfile] = useState<WorldMapProfile | null>(null);
  const [establishments, setEstablishments] = useState<WorldEstablishment[]>([]);
  const [selected, setSelected] = useState<WorldEstablishment | null>(null);
  const [selectedLifeLocation, setSelectedLifeLocation] = useState<'HOME' | 'UNIVERSITY' | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setMapError('');
    setSelected(null);
    setSelectedLifeLocation(null);
    setPurchaseMessage('');

    const hydrate = async () => {
      const resolved = readWorldMapProfile(player) || await resolveWorldMapProfile(player);
      if (!active) return;
      setProfile(resolved);

      if (!resolved) {
        setEstablishments([]);
        setMapError('Sua cidade-base ainda não foi configurada.');
        setLoading(false);
        return;
      }

      const items = await loadWorldEstablishments(resolved);
      if (!active) return;
      setEstablishments(items);
      setLoading(false);
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [isOpen, player.homeCity, player.homeState, player.cloudCareerId]);

  useEffect(() => {
    if (!isOpen || !profile || !containerRef.current) return undefined;

    let disposed = false;
    let mountedMap: any = null;

    const mount = async () => {
      try {
        const maplibre = await loadMapLibre();
        if (disposed || !containerRef.current) return;

        const map = new maplibre.Map({
          container: containerRef.current,
          style: buildOpenStreetMapStyle(),
          center: [profile.center.lng, profile.center.lat],
          zoom: 13.1,
          minZoom: 3,
          maxZoom: 18,
          attributionControl: true,
          pitch: 42,
          bearing: -10,
        });

        mountedMap = map;
        mapRef.current = map;
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');

        map.on('load', async () => {
          if (disposed) return;
          applyRotaJusticeMapTheme(map);

          markersRef.current.forEach((marker) => marker.remove());
          markersRef.current = [];

          const bounds = new maplibre.LngLatBounds(
            [profile.center.lng, profile.center.lat],
            [profile.center.lng, profile.center.lat],
          );

          const homePoint = getHomePoint(player, profile);
          bounds.extend([homePoint.lng, homePoint.lat]);
          const homeElement = buildLifeMarker('Sua casa', '⌂', 'HOME');
          homeElement.addEventListener('click', () => {
            setSelected(null);
            setSelectedLifeLocation('HOME');
            setPurchaseMessage('');
          });
          markersRef.current.push(
            new maplibre.Marker({ element: homeElement, anchor: 'bottom' })
              .setLngLat([homePoint.lng, homePoint.lat])
              .addTo(map),
          );

          const isIntern = player.careerTier === 'ESTAGIARIO' || player.careerTier === 'ESTAGIARIO_SENIOR';
          if (isIntern) {
            const universityPoint = await resolveStableRoadPoint(
              stableCityPointKey(profile, 'university'),
              getUniversityPoint(player, profile),
              profile.center,
            );
            if (disposed) return;
            bounds.extend([universityPoint.lng, universityPoint.lat]);
            const universityElement = buildLifeMarker(getUniversityName(profile), '🎓', 'UNIVERSITY');
            universityElement.addEventListener('click', () => {
              setSelected(null);
              setSelectedLifeLocation('UNIVERSITY');
              setPurchaseMessage('');
            });
            markersRef.current.push(
              new maplibre.Marker({ element: universityElement, anchor: 'bottom' })
                .setLngLat([universityPoint.lng, universityPoint.lat])
                .addTo(map),
            );
          }

          const establishmentPoints = await Promise.all(
            establishments.map(async (establishment) => ({
              establishment,
              point: await resolveStableRoadPoint(
                stableCityPointKey(profile, 'establishment:' + establishment.id),
                await resolveWorldPointForEstablishment(profile, establishment),
                profile.center,
              ),
            })),
          );

          if (disposed) return;

          establishmentPoints.forEach(({ establishment, point }) => {
            bounds.extend([point.lng, point.lat]);
            const element = buildEstablishmentMarker(establishment);
            element.addEventListener('click', () => {
              setSelectedLifeLocation(null);
              setSelected(establishment);
              setPurchaseMessage('');
            });
            markersRef.current.push(
              new maplibre.Marker({ element, anchor: 'bottom' })
                .setLngLat([point.lng, point.lat])
                .addTo(map),
            );
          });

          if (establishments.length > 0 || isIntern) {
            map.fitBounds(bounds, {
              padding: 90,
              maxZoom: 14.6,
              duration: 650,
            });
          }
        });
      } catch (error) {
        console.error('[Rota da Justiça] Falha ao abrir mapa comercial.', error);
        if (!disposed) setMapError('O mapa da cidade não pôde ser carregado agora.');
      }
    };

    void mount();

    return () => {
      disposed = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (mountedMap) mountedMap.remove();
      if (mapRef.current === mountedMap) mapRef.current = null;
    };
  }, [
    isOpen,
    profile?.city,
    profile?.state,
    profile?.center.lng,
    profile?.center.lat,
    establishments,
    player.careerTier,
    player.household.residence.latitude,
    player.household.residence.longitude,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[165] flex items-center justify-center bg-black/90 p-2 backdrop-blur-md sm:p-5">
      <section className="relative h-[94vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-[#30353B] bg-[#080A0C] shadow-2xl">
        <header className="absolute left-4 right-4 top-4 z-20 flex items-start justify-between gap-4 rounded-2xl border border-[#C5A059]/20 bg-[#080A0C]/90 px-4 py-3 backdrop-blur-xl">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#D7B86E]">
              <MapPin size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#A58B58]">Mundo comercial persistente</span>
              <h2 className="truncate font-serif text-lg font-black text-[#F1EEE8]">
                {profile ? profile.city + ' • ' + profile.state : 'Mapa da cidade'}
              </h2>
              <p className="text-[10px] text-[#858B94]">
                {establishments.length} estabelecimento(s) publicado(s) • locais + universais
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#343940] bg-[#11151A] text-[#A6ABB2]"
            aria-label="Fechar mapa da cidade"
          >
            <X size={18} />
          </button>
        </header>

        <div ref={containerRef} className="absolute inset-0" />

        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#080A0C]/70">
            <div className="flex items-center gap-2 rounded-xl border border-[#30353B] bg-[#101318] px-4 py-3 text-xs text-[#C4C8CE]">
              <Loader2 size={16} className="animate-spin" /> Carregando estabelecimentos...
            </div>
          </div>
        )}

        {mapError && !loading && (
          <div className="absolute left-1/2 top-1/2 z-10 w-[min(460px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#F87171]/25 bg-[#180E10]/95 p-5 text-center text-sm text-[#FCA5A5]">
            {mapError}
          </div>
        )}

        {!loading && !mapError && establishments.length === 0 && (
          <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-2xl border border-[#343940] bg-[#0D1014]/95 px-5 py-4 text-center text-xs text-[#9399A2]">
            Nenhum estabelecimento publicado para esta cidade. Estabelecimentos universais também aparecerão aqui quando forem publicados.
          </div>
        )}

        {selectedLifeLocation === 'HOME' && (
          <div className="absolute bottom-5 left-5 right-5 z-20 ml-auto w-[min(520px,calc(100%-40px))] rounded-2xl border border-[#D8B768]/30 bg-[#0B0D10]/95 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#D8B768]/25 bg-[#D8B768]/10 text-[#E0C681]"><Home size={23} /></div>
              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-black uppercase tracking-wider text-[#9D895B]">Residência privada • posição aproximada</span>
                <h3 className="mt-1 font-serif text-xl font-black text-[#F1EEE8]">Sua casa</h3>
                <p className="mt-1 text-xs leading-5 text-[#9A9FA7]">
                  {player.household.residence.street} • ponto residencial aproximado • {player.household.residence.city}/{player.household.residence.state}
                </p>
                <button type="button" onClick={onOpenHome} className="mt-3 rounded-xl bg-[#9A783D] px-4 py-2.5 text-xs font-black text-[#11100D]">
                  Entrar em casa
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedLifeLocation === 'UNIVERSITY' && profile && (
          <div className="absolute bottom-5 left-5 right-5 z-20 ml-auto w-[min(520px,calc(100%-40px))] rounded-2xl border border-[#60A5FA]/30 bg-[#0B0D10]/95 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#60A5FA]/25 bg-[#60A5FA]/10 text-[#8DBCF5]"><GraduationCap size={23} /></div>
              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-black uppercase tracking-wider text-[#7397C2]">Vida acadêmica</span>
                <h3 className="mt-1 font-serif text-xl font-black text-[#F1EEE8]">{getUniversityName(profile)}</h3>
                <p className="mt-1 text-xs leading-5 text-[#9A9FA7]">Aulas, biblioteca e rotina acadêmica do personagem enquanto ele ainda está em estágio.</p>
                <button
                  type="button"
                  onClick={() => {
                    onStudyAtUniversity();
                    setPurchaseMessage('Você estudou na faculdade. 3 horas se passaram.');
                  }}
                  className="mt-3 rounded-xl bg-[#315F91] px-4 py-2.5 text-xs font-black text-white"
                >
                  Estudar na faculdade • 3h
                </button>
                {purchaseMessage && <p className="mt-2 text-[10px] text-[#9FC5EC]">{purchaseMessage}</p>}
              </div>
            </div>
          </div>
        )}

        {selected && (
          <div className="absolute bottom-5 left-5 right-5 z-20 ml-auto max-h-[55vh] w-[min(720px,calc(100%-40px))] overflow-y-auto rounded-2xl border border-[#C5A059]/30 bg-[#090C0F]/95 p-4 shadow-2xl backdrop-blur-xl">
            <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-xl border border-[#C5A059]/25 bg-[#111418]">
                {selected.bannerUrl ? (
                  <img src={selected.bannerUrl} alt={selected.name} className="h-24 w-full object-cover sm:h-full" />
                ) : (
                  <div className="grid h-24 place-items-center text-[#C5A059] sm:h-full"><Building2 size={30} /></div>
                )}
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-1.5 text-[8px] font-black uppercase tracking-wider">
                  <span className="rounded-full border border-[#C5A059]/25 bg-[#C5A059]/10 px-2 py-1 text-[#D8BB76]">{establishmentTypeLabel(selected.businessType)}</span>
                  {selected.presenceScope === 'UNIVERSAL' && <span className="rounded-full border border-[#60A5FA]/25 bg-[#60A5FA]/10 px-2 py-1 text-[#A9CCFF]">Universal</span>}
                  {selected.isSponsored && <span className="rounded-full border border-[#34D399]/25 bg-[#34D399]/10 px-2 py-1 text-[#8BE0BD]">Patrocinado</span>}
                </div>
                <h3 className="font-serif text-xl font-black text-[#F1EEE8]">{selected.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#9A9FA7]">{selected.description}</p>
                {selected.offers.length > 0 && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {selected.offers.slice(0, 8).map((offer) => (
                      <article key={offer.id} className="flex gap-3 rounded-xl border border-[#2B3036] bg-[#11151A] p-2.5">
                        <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-[#30363D] bg-[#0B0E12]">
                          {offer.imageUrl ? (
                            <img src={offer.imageUrl} alt={offer.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center text-[#68717B]"><ShoppingCart size={18} /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-[10px] text-[#E7E8EA]">{offer.title}</strong>
                          <span className="mt-0.5 block text-[9px] font-black text-[#CDB16C]">{formatEstablishmentPrice(offer.price)}</span>
                          <button
                            type="button"
                            disabled={offer.price == null || player.money < (offer.price || 0)}
                            onClick={() => {
                              const result = onPurchaseOffer(selected, offer);
                              setPurchaseMessage(result.message);
                            }}
                            className="mt-2 rounded-lg border border-[#C5A059]/30 bg-[#C5A059]/10 px-2.5 py-1.5 text-[8px] font-black uppercase text-[#D9BF7D] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Comprar
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {purchaseMessage && (
                  <div className="mt-3 rounded-lg border border-[#60A5FA]/20 bg-[#60A5FA]/8 px-3 py-2 text-[10px] text-[#A8C8EC]">
                    {purchaseMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
