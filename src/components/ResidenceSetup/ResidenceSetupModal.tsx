import React, { useState } from 'react';
import { CheckCircle2, Home, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import type { PlayerProfile } from '../../types/game';
import { geocodeBrazilianAddress, type WorldAddressProfile } from '../../lib/worldMap';

export interface ResidenceSetupResult {
  street: string;
  number: string;
  city: string;
  state: string;
  addressProfile: WorldAddressProfile;
}

interface ResidenceSetupModalProps {
  player: PlayerProfile;
  isOpen: boolean;
  onComplete: (result: ResidenceSetupResult) => void;
}

export const ResidenceSetupModal: React.FC<ResidenceSetupModalProps> = ({
  player,
  isOpen,
  onComplete,
}) => {
  const residence = player.household?.residence;
  const [street, setStreet] = useState(residence?.street || '');
  const [number, setNumber] = useState(residence?.number || '');
  const [city, setCity] = useState(residence?.city || player.homeCity || '');
  const [state, setState] = useState((residence?.state || player.homeState || '').toUpperCase());
  const [validated, setValidated] = useState<WorldAddressProfile | null>(null);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const validate = async () => {
    const cleanStreet = street.trim();
    const cleanNumber = number.trim();
    const cleanCity = city.trim();
    const cleanState = state.trim().toUpperCase();

    if (!cleanStreet || !cleanNumber || !cleanCity || cleanState.length !== 2) {
      setError('Informe rua, número, cidade e UF para localizar sua residência.');
      return null;
    }

    setValidating(true);
    setError('');
    try {
      const profile = await geocodeBrazilianAddress(
        cleanStreet,
        cleanNumber,
        cleanCity,
        cleanState,
      );
      setValidated(profile);
      return profile;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível validar o endereço.');
      setValidated(null);
      return null;
    } finally {
      setValidating(false);
    }
  };

  const finish = async () => {
    const profile = validated || await validate();
    if (!profile) return;

    onComplete({
      street: profile.street,
      number: profile.number,
      city: profile.city,
      state: profile.state,
      addressProfile: profile,
    });
  };

  return (
    <div className="fixed inset-0 z-[230] overflow-y-auto bg-black/95 p-4 backdrop-blur-md sm:p-7">
      <section className="mx-auto mt-[4vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-[#353941] bg-[#0D1014] shadow-2xl">
        <header className="border-b border-[#292E35] bg-[#12161B] px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#D9B96E]">
              <Home size={24} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9C865A]">Atualização da carreira</span>
              <h2 className="mt-1 font-serif text-2xl font-black text-[#F1EEE8]">Onde seu personagem mora?</h2>
              <p className="mt-2 text-xs leading-5 text-[#9299A3]">
                A vida pessoal agora faz parte da simulação. Precisamos localizar a casa da sua carreira atual antes de continuar.
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-5 sm:p-7">
          <div className="flex items-start gap-3 rounded-2xl border border-[#5A7396]/25 bg-[#5A7396]/8 p-4">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#86A9D7]" />
            <div>
              <strong className="text-xs text-[#CADCF2]">Seu endereço não será público</strong>
              <p className="mt-1 text-[10px] leading-5 text-[#8FA5BF]">
                Rua e número não são publicados no catálogo do Rota Admin nem exibidos para outros jogadores. Durante a validação, o endereço é consultado no serviço de geocodificação configurado para o mapa; a carreira usa o resultado para posicionar a casa e calcular deslocamentos.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <label>
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-[#7F8791]">Rua</span>
              <input
                value={street}
                onChange={(event) => {
                  setStreet(event.target.value);
                  setValidated(null);
                  setError('');
                }}
                placeholder="Rua, avenida ou travessa"
                className="h-12 w-full rounded-xl border border-[#343A42] bg-[#0A0D10] px-4 text-sm text-[#ECEEF0] outline-none focus:border-[#C5A059]/60"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-[#7F8791]">Número</span>
              <input
                value={number}
                onChange={(event) => {
                  setNumber(event.target.value);
                  setValidated(null);
                  setError('');
                }}
                placeholder="120"
                className="h-12 w-full rounded-xl border border-[#343A42] bg-[#0A0D10] px-4 text-sm text-[#ECEEF0] outline-none focus:border-[#C5A059]/60"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_110px_auto]">
            <label>
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-[#7F8791]">Cidade</span>
              <input
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  setValidated(null);
                  setError('');
                }}
                placeholder="Cidade"
                className="h-12 w-full rounded-xl border border-[#343A42] bg-[#0A0D10] px-4 text-sm text-[#ECEEF0] outline-none focus:border-[#C5A059]/60"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-[#7F8791]">UF</span>
              <input
                value={state}
                onChange={(event) => {
                  setState(event.target.value.toUpperCase().slice(0, 2));
                  setValidated(null);
                  setError('');
                }}
                maxLength={2}
                placeholder="RS"
                className="h-12 w-full rounded-xl border border-[#343A42] bg-[#0A0D10] px-4 text-center text-sm font-black uppercase text-[#ECEEF0] outline-none focus:border-[#C5A059]/60"
              />
            </label>
            <button
              type="button"
              onClick={() => void validate()}
              disabled={validating}
              className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-4 text-xs font-black text-[#A7CAFA] disabled:opacity-50"
            >
              {validating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
              Validar
            </button>
          </div>

          {validated && (
            <div className="flex items-start gap-3 rounded-xl border border-[#34D399]/25 bg-[#34D399]/8 p-3">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#73E1B9]" />
              <div>
                <strong className="text-xs text-[#B6F1D9]">Residência localizada</strong>
                <span className="mt-1 block text-[10px] leading-4 text-[#89BAA7]">{validated.displayName}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-[#F87171]/25 bg-[#F87171]/8 px-3 py-2.5 text-xs text-[#FCA5A5]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void finish()}
            disabled={validating}
            className="w-full rounded-xl bg-[#A8833F] px-5 py-3.5 text-xs font-black uppercase tracking-wider text-[#11100D] transition hover:bg-[#BC9950] disabled:opacity-50"
          >
            Confirmar residência e continuar
          </button>
        </div>
      </section>
    </div>
  );
};
