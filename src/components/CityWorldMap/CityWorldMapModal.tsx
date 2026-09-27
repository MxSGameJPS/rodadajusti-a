import React, { useEffect, useRef, useState } from 'react';
import { Building2, CheckCircle2, Clock3, GraduationCap, Home, Loader2, MapPin, ShoppingCart, Sparkles, UtensilsCrossed, WalletCards, X } from 'lucide-react';
import type { PlayerProfile } from '../../types/game';
import {
  applyRotaJusticeMapTheme,
  buildOpenStreetMapStyle,
  loadMapLibre,
} from '../../lib/maplibreClient';
import {
  getRamosOfficePoint,
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
  establishmentGameplayAction,
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
  onGoToOffice: () => void;
  onStudyAtUniversity: () => void;
  onGoToEstablishment: (
    establishment: WorldEstablishment,
    point: { lat: number; lng: number },
  ) => void;
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

function buildLifeMarker(label: string, glyph: string, tone: 'HOME' | 'UNIVERSITY' | 'OFFICE') {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = [
    styles.lifeMarker,
    tone === 'HOME'
      ? styles.lifeMarkerHome
      : tone === 'OFFICE'
        ? styles.lifeMarkerOffice
        : styles.lifeMarkerUniversity,
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
  onGoToOffice,
  onStudyAtUniversity,
  onGoToEstablishment,
  onPurchaseOffer,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [profile, setProfile] = useState<WorldMapProfile | null>(null);
  const [establishments, setEstablishments] = useState<WorldEstablishment[]>([]);
  const [selected, setSelected] = useState<WorldEstablishment | null>(null);
  const [selectedLifeLocation, setSelectedLifeLocation] = useState<'HOME' | 'UNIVERSITY' | 'OFFICE' | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState('');
  const [activeOffer, setActiveOffer] = useState<WorldEstablishmentOffer | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
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
    setActiveOffer(null);
    setPurchaseSuccess(false);

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
      if (player.worldLocation.kind === 'ESTABLISHMENT' && player.worldLocation.refId) {
        setSelected(items.find((item) => item.id === player.worldLocation.refId) || null);
      }
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

          const officePoint = await resolveStableRoadPoint(
            stableCityPointKey(profile, 'office:ramos'),
            getRamosOfficePoint(profile),
            profile.center,
          );
          if (disposed) return;
          bounds.extend([officePoint.lng, officePoint.lat]);
          const officeElement = buildLifeMarker('Ramos & Associados', 'RA', 'OFFICE');
          officeElement.addEventListener('click', () => {
            setSelected(null);
            setSelectedLifeLocation('OFFICE');
            setPurchaseMessage('');
          });
          markersRef.current.push(
            new maplibre.Marker({ element: officeElement, anchor: 'bottom' })
              .setLngLat([officePoint.lng, officePoint.lat])
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
              setPurchaseMessage('');
              if (
                player.worldLocation.kind === 'ESTABLISHMENT'
                && player.worldLocation.refId === establishment.id
              ) {
                setSelected(establishment);
                return;
              }
              setSelected(null);
              onGoToEstablishment(establishment, point);
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
    player.worldLocation.kind,
    player.worldLocation.refId,
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

        {selectedLifeLocation === 'OFFICE' && (
          <div className="absolute bottom-5 left-5 right-5 z-20 ml-auto w-[min(520px,calc(100%-40px))] rounded-2xl border border-[#C5A059]/30 bg-[#0B0D10]/95 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/10 font-serif text-sm font-black text-[#DFC77F]">R&A</div>
              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-black uppercase tracking-wider text-[#9D895B]">Local de trabalho</span>
                <h3 className="mt-1 font-serif text-xl font-black text-[#F1EEE8]">Ramos & Associados</h3>
                <p className="mt-1 text-xs leading-5 text-[#9A9FA7]">
                  Escritório profissional • {profile?.city}/{profile?.state}
                </p>
                <button type="button" onClick={onGoToOffice} className="mt-3 rounded-xl bg-[#9A783D] px-4 py-2.5 text-xs font-black text-[#11100D]">
                  Ir para o escritório
                </button>
              </div>
            </div>
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
                  Ir para casa
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
                    setPurchaseMessage('Preparando deslocamento para a faculdade...');
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
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6">
            <div className="relative max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#C5A059]/30 bg-[#090C0F]/98 shadow-2xl">
              <button type="button" onClick={() => { setSelected(null); setActiveOffer(null); setPurchaseMessage(''); }} className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-xl border border-[#343941] bg-[#101419] text-[#AAB0B7] transition hover:border-[#C5A059]/50 hover:text-white" aria-label="Fechar estabelecimento"><X size={18} /></button>
              <div className="grid max-h-[88vh] overflow-y-auto lg:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="relative min-h-[220px] overflow-hidden border-b border-[#2B3036] lg:min-h-[650px] lg:border-b-0 lg:border-r">
                  {selected.coverImageUrl || selected.bannerUrl ? (
                    <img src={selected.coverImageUrl || selected.bannerUrl || ''} alt={selected.name} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-[#111418] text-[#C5A059]"><Building2 size={44} /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080A0C] via-[#080A0C]/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="mb-2 flex flex-wrap gap-1.5 text-[8px] font-black uppercase tracking-wider">
                      <span className="rounded-full border border-[#C5A059]/30 bg-black/60 px-2.5 py-1 text-[#E1C57F]">{establishmentTypeLabel(selected.businessType)}</span>
                      {selected.presenceScope === 'UNIVERSAL' && <span className="rounded-full border border-[#60A5FA]/30 bg-black/60 px-2.5 py-1 text-[#A9CCFF]">Universal</span>}
                    </div>
                    <h3 className="font-serif text-2xl font-black text-white">{selected.name}</h3>
                    <p className="mt-1 text-xs text-[#C1C5CA]">{selected.district ? selected.district + ' • ' : ''}{profile?.city}/{profile?.state}</p>
                    {selected.slogan && <p className="mt-3 border-l-2 border-[#C5A059] pl-3 text-xs italic leading-5 text-[#D8D2C5]">{selected.slogan}</p>}
                  </div>
                </aside>
                <main className="min-w-0 p-5 sm:p-7">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#A58B58]">Você chegou ao estabelecimento</span>
                  <h2 className="mt-1 pr-12 font-serif text-3xl font-black text-[#F4F0E8]">O que deseja fazer?</h2>
                  <p className="mt-2 max-w-2xl text-xs leading-5 text-[#9298A1]">{selected.description}</p>

                  <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#2A3036] bg-[#0D1115] px-4 py-3">
                    <WalletCards size={17} className="text-[#CDB16C]" />
                    <div><span className="block text-[8px] font-black uppercase tracking-wider text-[#737B85]">Saldo disponível</span><strong className="text-sm text-[#E9E2D2]">JR$ {player.money.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                  </div>

                  {selected.offers.length > 0 ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {selected.offers.slice(0, 10).map((offer) => {
                        const kind = String(offer.gameplayEffects?.kind || '').toUpperCase();
                        const action = establishmentGameplayAction(selected, offer);
                        const isMeal = action === 'EAT_HERE';
                        const isTakeaway = action === 'TAKEAWAY';
                        const isSleep = action === 'SLEEP';
                        const isShower = action === 'SHOWER';
                        const isRental = action === 'RENT_VEHICLE';
                        const insufficient = offer.price == null || player.money < (offer.price || 0);
                        return (
                          <article key={offer.id} className="group rounded-2xl border border-[#2B3036] bg-[#11151A] p-3 transition hover:-translate-y-0.5 hover:border-[#C5A059]/35 hover:bg-[#14191F]">
                            <div className="flex gap-3">
                              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#343A42] bg-[#0B0E12]">
                                {offer.imageUrl ? <img src={offer.imageUrl} alt={offer.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-[#68717B]">{isMeal ? <UtensilsCrossed size={21} /> : <ShoppingCart size={21} />}</div>}
                              </div>
                              <div className="min-w-0 flex-1">
                                <strong className="block text-sm text-[#ECEDEF]">{offer.title}</strong>
                                <span className="mt-1 block text-xs font-black text-[#D4B86F]">{formatEstablishmentPrice(offer.price)}</span>
                                {offer.description && <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#818892]">{offer.description}</p>}
                              </div>
                            </div>
                            {(isMeal || isTakeaway || isSleep || isShower || isRental) && <div className="mt-3 flex flex-wrap gap-2 text-[9px]">
                              {isMeal && <><span className="rounded-lg bg-[#16231A] px-2 py-1 text-[#9FD1AA]">Comer aqui</span><span className="rounded-lg bg-[#16231A] px-2 py-1 text-[#9FD1AA]">Saciedade +{Math.max(25, Number(offer.gameplayEffects?.hungerRestore) || 45)}</span><span className="rounded-lg bg-[#211D16] px-2 py-1 text-[#D7C28B]"><Clock3 size={10} className="mr-1 inline" />45 min</span></>}
                              {isTakeaway && <span className="rounded-lg bg-[#182333] px-2 py-1 text-[#AFCBF0]">Levar • vai para a despensa</span>}
                              {isSleep && <span className="rounded-lg bg-[#201B2D] px-2 py-1 text-[#C7B6F1]">Dormir • recupera energia</span>}
                              {isShower && <span className="rounded-lg bg-[#15262B] px-2 py-1 text-[#9BD7E1]">Banho • recupera higiene</span>}
                              {isRental && <span className="rounded-lg bg-[#282218] px-2 py-1 text-[#DFC889]">Veículo temporário</span>}
                            </div>}
                            <button type="button" disabled={insufficient} onClick={() => { setActiveOffer(offer); setPurchaseMessage(''); setPurchaseSuccess(false); }} className="mt-3 w-full rounded-xl border border-[#C5A059]/35 bg-[#C5A059]/10 px-3 py-2.5 text-[9px] font-black uppercase tracking-wider text-[#DFC47F] transition hover:bg-[#C5A059] hover:text-[#11100D] disabled:cursor-not-allowed disabled:opacity-35">
                              {insufficient ? 'Saldo insuficiente' : isMeal ? 'Comer no local' : isTakeaway ? 'Pedir para viagem' : isSleep ? 'Hospedar e dormir' : isShower ? 'Tomar banho' : isRental ? 'Alugar veículo' : 'Selecionar'}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  ) : <div className="mt-6 rounded-2xl border border-[#30353B] bg-[#101419] p-6 text-center text-xs text-[#8D949D]">Este estabelecimento ainda não possui serviços disponíveis.</div>}
                </main>
              </div>
            </div>
          </div>
        )}

        {activeOffer && selected && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-black/75 p-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-[26px] border border-[#C5A059]/35 bg-[#0B0E11] p-5 shadow-2xl sm:p-6">
              {purchaseSuccess ? (
                <div className="py-4 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#55C98A]/30 bg-[#55C98A]/10 text-[#70D99D]"><CheckCircle2 size={31} /></div>
                  <h3 className="mt-4 font-serif text-2xl font-black text-[#F3EFE7]">Ação concluída</h3>
                  <p className="mt-2 text-sm leading-6 text-[#A8AFB7]">{purchaseMessage}</p>
                  <div className="mt-4 flex justify-center gap-2 text-[10px] text-[#8E969F]"><Sparkles size={14} className="text-[#CDB16C]" /> Seus atributos, tempo e finanças foram atualizados.</div>
                  <button type="button" onClick={() => { setActiveOffer(null); setPurchaseSuccess(false); setPurchaseMessage(''); }} className="mt-6 w-full rounded-xl bg-[#C5A059] px-4 py-3 text-xs font-black uppercase text-[#11100D]">Continuar no estabelecimento</button>
                </div>
              ) : (
                <>
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#343A42] bg-[#101419]">{activeOffer.imageUrl ? <img src={activeOffer.imageUrl} alt={activeOffer.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[#C5A059]"><ShoppingCart size={22} /></div>}</div>
                    <div className="min-w-0"><span className="text-[8px] font-black uppercase tracking-widest text-[#A58B58]">Confirmar ação</span><h3 className="mt-1 font-serif text-xl font-black text-[#F3EFE7]">{activeOffer.title}</h3><strong className="mt-1 block text-sm text-[#D5B96F]">{formatEstablishmentPrice(activeOffer.price)}</strong></div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-[#939AA3]">{activeOffer.description || 'Confirme para realizar esta ação no estabelecimento.'}</p>
                  {(() => {
                    const action = establishmentGameplayAction(selected, activeOffer);
                    const info = action === 'EAT_HERE'
                      ? 'O personagem vai sentar e fazer a refeição. O relógio avança 45 minutos e fome/energia são atualizados.'
                      : action === 'TAKEAWAY'
                        ? 'O pedido será embalado e irá para a despensa. A fome não muda agora; o personagem poderá comer depois.'
                        : action === 'SLEEP'
                          ? 'O personagem fará check-in e dormirá no hotel. O relógio avança e a energia é recuperada.'
                          : action === 'SHOWER'
                            ? 'O personagem usará o banho do estabelecimento. O relógio avança e a higiene é recuperada.'
                            : action === 'RENT_VEHICLE'
                              ? 'O veículo será alugado e ficará disponível para os deslocamentos do personagem.'
                              : 'A ação será registrada nas finanças e o tempo do jogo avançará.';
                    return <div className="mt-4 rounded-xl border border-[#2C4433] bg-[#101A13] p-3 text-xs leading-5 text-[#A9D5B2]"><Sparkles size={15} className="mr-2 inline" />{info}</div>;
                  })()}
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setActiveOffer(null)} className="rounded-xl border border-[#343A42] px-4 py-3 text-xs font-black text-[#AEB4BB]">Cancelar</button>
                    <button type="button" onClick={() => { const result = onPurchaseOffer(selected, activeOffer); setPurchaseMessage(result.message); if (result.ok) setPurchaseSuccess(true); }} className="rounded-xl bg-[#C5A059] px-4 py-3 text-xs font-black text-[#11100D]">Confirmar</button>
                  </div>
                  {purchaseMessage && <p className="mt-3 rounded-lg border border-[#F87171]/20 bg-[#F87171]/5 px-3 py-2 text-[10px] text-[#F3A3A3]">{purchaseMessage}</p>}
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
