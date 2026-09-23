import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  Truck,
  WalletCards,
  X,
} from 'lucide-react';
import type { PlayerProfile } from '../../types/game';
import {
  geocodeBrazilianCity,
  getDeclaredPlayerCity,
  type WorldMapProfile,
} from '../../lib/worldMap';
import { formatGameDate, addGameDays, normalizeGameDate } from '../../lib/gameDate';
import { sound } from '../../utils/sound';

export const CITY_RELOCATION_COST = 5000;
export const CITY_RELOCATION_DAYS = 2;

interface CityRelocationModalProps {
  player: PlayerProfile;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (destination: {
    city: string;
    state: string;
    profile: WorldMapProfile;
  }) => void | Promise<void>;
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const CityRelocationModal: React.FC<CityRelocationModalProps> = ({
  player,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const declared = useMemo(() => getDeclaredPlayerCity(player), [player.homeCity, player.homeState]);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [validatedProfile, setValidatedProfile] = useState<WorldMapProfile | null>(null);
  const [validating, setValidating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCity('');
    setState('');
    setValidatedProfile(null);
    setValidating(false);
    setConfirming(false);
    setError('');
  }, [isOpen]);

  const currentDate = normalizeGameDate({
    day: player.gameCurrentDay,
    month: player.gameCurrentMonth,
    year: player.gameCurrentYear,
  });
  const arrivalDate = addGameDays(currentDate, CITY_RELOCATION_DAYS);
  const hasMoney = player.money >= CITY_RELOCATION_COST;
  const hasActiveCase = Boolean(player.activeCase);
  const destinationIsCurrent = Boolean(
    validatedProfile
      && declared.city
      && declared.state
      && validatedProfile.city.trim().toLocaleLowerCase('pt-BR') === declared.city.trim().toLocaleLowerCase('pt-BR')
      && validatedProfile.state.trim().toUpperCase() === declared.state.trim().toUpperCase(),
  );

  if (!isOpen) return null;

  const validateDestination = async () => {
    const cleanCity = city.trim();
    const cleanState = state.trim().toUpperCase();

    setError('');
    setValidatedProfile(null);

    if (!cleanCity || !cleanState) {
      setError('Informe a cidade e a UF de destino.');
      return;
    }

    if (cleanState.length !== 2) {
      setError('Informe a UF com duas letras, por exemplo RS, SC, SP ou RJ.');
      return;
    }

    setValidating(true);
    try {
      const profile = await geocodeBrazilianCity(cleanCity, cleanState);
      setValidatedProfile(profile);
      sound.playClick();
    } catch (cause) {
      console.error('[Rota da Justiça] Falha ao validar cidade de mudança.', cause);
      setError(cause instanceof Error ? cause.message : 'Não foi possível localizar a cidade informada.');
    } finally {
      setValidating(false);
    }
  };

  const confirmRelocation = async () => {
    if (!validatedProfile || confirming || !hasMoney || hasActiveCase || destinationIsCurrent) return;

    setConfirming(true);
    setError('');
    try {
      sound.playStamp();
      await onConfirm({
        city: validatedProfile.city,
        state: validatedProfile.state,
        profile: validatedProfile,
      });
      onClose();
    } catch (cause) {
      console.error('[Rota da Justiça] Falha ao concluir mudança de cidade.', cause);
      setError('Não foi possível concluir a mudança. Seu patrimônio não foi alterado.');
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-md sm:p-6">
      <section className="w-full max-w-3xl overflow-hidden rounded-3xl border border-[#34383E] bg-[#0E1013] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#282C31] bg-[#12151A] px-5 py-5 sm:px-7">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#D7B96F]">
              <Truck size={25} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9F8757]">Mudança residencial e profissional</span>
              <h2 className="mt-1 font-serif text-2xl font-black text-[#F1EEE8]">Mudar de cidade</h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-[#8E949D]">
                A nova cidade passa a ser a base da sua carreira e dos próximos casos do mapa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#30343A] text-[#9AA0A8] transition hover:bg-white/5"
            aria-label="Fechar mudança de cidade"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 p-5 sm:p-7">
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#2B3037] bg-[#13161B] p-4">
              <MapPin size={17} className="text-[#60A5FA]" />
              <span className="mt-3 block text-[9px] font-black uppercase tracking-wider text-[#747C86]">Cidade atual</span>
              <strong className="mt-1 block text-sm text-[#E8EAED]">
                {declared.city ? `${declared.city}/${declared.state || 'BR'}` : 'Não definida'}
              </strong>
            </div>
            <div className="rounded-2xl border border-[#2B3037] bg-[#13161B] p-4">
              <WalletCards size={17} className="text-[#34D399]" />
              <span className="mt-3 block text-[9px] font-black uppercase tracking-wider text-[#747C86]">Custo da mudança</span>
              <strong className="mt-1 block text-sm text-[#E8EAED]">JR$ {formatMoney(CITY_RELOCATION_COST)}</strong>
            </div>
            <div className="rounded-2xl border border-[#2B3037] bg-[#13161B] p-4">
              <CalendarDays size={17} className="text-[#FBBF24]" />
              <span className="mt-3 block text-[9px] font-black uppercase tracking-wider text-[#747C86]">Tempo consumido</span>
              <strong className="mt-1 block text-sm text-[#E8EAED]">{CITY_RELOCATION_DAYS} dias</strong>
            </div>
          </section>

          {hasActiveCase && (
            <div className="flex items-start gap-3 rounded-2xl border border-[#F87171]/30 bg-[#F87171]/10 p-4 text-xs leading-5 text-[#FCA5A5]">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>
                Você possui um caso em andamento. Finalize o processo atual antes da mudança para que o caso não seja transportado artificialmente para outra cidade.
              </span>
            </div>
          )}

          {!hasMoney && (
            <div className="flex items-start gap-3 rounded-2xl border border-[#FBBF24]/25 bg-[#FBBF24]/10 p-4 text-xs leading-5 text-[#F6D58A]">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>
                Patrimônio insuficiente. Você possui JR$ {formatMoney(player.money)} e precisa de JR$ {formatMoney(CITY_RELOCATION_COST)}.
              </span>
            </div>
          )}

          <section className="rounded-2xl border border-[#2C3138] bg-[#12151A] p-4 sm:p-5">
            <div className="mb-4">
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#78818D]">Novo endereço-base</span>
              <h3 className="mt-1 text-base font-black text-[#E8EAED]">Para onde você quer se mudar?</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#858C95]">Cidade</span>
                <input
                  value={city}
                  onChange={(event) => {
                    setCity(event.target.value);
                    setValidatedProfile(null);
                    setError('');
                  }}
                  placeholder="Ex.: Vassouras"
                  className="h-12 w-full rounded-xl border border-[#343942] bg-[#0D1014] px-4 text-sm text-[#ECEEF1] outline-none transition focus:border-[#C5A059]/60"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#858C95]">UF</span>
                <input
                  value={state}
                  onChange={(event) => {
                    setState(event.target.value.toUpperCase().slice(0, 2));
                    setValidatedProfile(null);
                    setError('');
                  }}
                  placeholder="RJ"
                  maxLength={2}
                  className="h-12 w-full rounded-xl border border-[#343942] bg-[#0D1014] px-4 text-center text-sm font-black uppercase text-[#ECEEF1] outline-none transition focus:border-[#C5A059]/60"
                />
              </label>

              <button
                type="button"
                onClick={() => void validateDestination()}
                disabled={validating || !city.trim() || state.trim().length !== 2}
                className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl border border-[#60A5FA]/35 bg-[#60A5FA]/10 px-4 text-xs font-black text-[#A9CCFF] transition hover:bg-[#60A5FA]/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {validating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                Validar
              </button>
            </div>

            {validatedProfile && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#34D399]/25 bg-[#34D399]/10 p-3 text-xs text-[#A7F3D0]">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                <div>
                  <strong className="block">Destino localizado</strong>
                  <span className="mt-0.5 block text-[#91BFAA]">{validatedProfile.displayName}</span>
                </div>
              </div>
            )}

            {destinationIsCurrent && (
              <div className="mt-3 rounded-xl border border-[#FBBF24]/25 bg-[#FBBF24]/10 px-3 py-2.5 text-xs text-[#F6D58A]">
                O destino informado é a sua cidade atual.
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-[#F87171]/25 bg-[#F87171]/10 px-3 py-2.5 text-xs text-[#FCA5A5]">
                {error}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#363128] bg-[#17140F] p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#8D7E62]">Patrimônio antes</span>
                <strong className="mt-1 block text-sm text-[#EEE7DA]">JR$ {formatMoney(player.money)}</strong>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#8D7E62]">Patrimônio depois</span>
                <strong className="mt-1 block text-sm text-[#EEE7DA]">JR$ {formatMoney(Math.max(0, player.money - CITY_RELOCATION_COST))}</strong>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#8D7E62]">Nova data</span>
                <strong className="mt-1 block text-sm text-[#EEE7DA]">{formatGameDate(arrivalDate)}</strong>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#343942] px-5 py-3 text-xs font-black text-[#A6ABB2]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmRelocation()}
              disabled={!validatedProfile || !hasMoney || hasActiveCase || destinationIsCurrent || confirming}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#A8833F] px-6 py-3 text-xs font-black text-[#11100D] transition hover:bg-[#BC9950] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {confirming ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
              Confirmar mudança <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
