import React, { useEffect, useState } from 'react';
import { Loader2, MapPin, Navigation, ShieldCheck } from 'lucide-react';
import {
  normalizeCareerOrigin,
  patchCareerOriginIntoExistingPlayerSave,
  readCareerOrigin,
  readCareerOriginFromPlayerSave,
  saveCareerOrigin,
} from '../../lib/careerOrigin';
import { geocodeBrazilianCity } from '../../lib/worldMap';
import styles from './CareerOriginGate.module.css';

const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
];

export const CareerOriginGate: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const existing = readCareerOrigin();
    if (existing) {
      patchCareerOriginIntoExistingPlayerSave(existing);
      return;
    }

    const fromPlayer = readCareerOriginFromPlayerSave();
    if (fromPlayer) {
      saveCareerOrigin(fromPlayer);
      return;
    }

    setIsOpen(true);
  }, []);

  if (!isOpen) return null;

  const confirmOrigin = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanCity = city.trim();
    const cleanState = state.trim().toUpperCase();
    if (cleanCity.length < 2 || cleanState.length !== 2) return;

    setIsValidating(true);
    setError('');
    try {
      await geocodeBrazilianCity(cleanCity, cleanState);
      const origin = normalizeCareerOrigin(cleanCity, cleanState);
      saveCareerOrigin(origin);
      patchCareerOriginIntoExistingPlayerSave(origin);
      setIsOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível localizar esta cidade agora.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Definir cidade inicial da carreira">
      <section className={styles.card}>
        <div className={styles.mapGlow} aria-hidden="true" />
        <div className={styles.icon}><MapPin size={28} /></div>
        <span className={styles.eyebrow}>Seu mundo começa aqui</span>
        <h1>Em qual cidade começa a sua carreira?</h1>
        <p className={styles.lead}>
          A cidade e o estado que você escolher serão usados para posicionar o Ramos & Associados e suas primeiras diligências sobre o mapa real.
        </p>

        <div className={styles.explanation}>
          <div><Navigation size={17} /><span>As rotas das diligências usarão ruas reais da sua cidade.</span></div>
          <div><ShieldCheck size={17} /><span>Clientes e testemunhas continuarão em pontos fictícios, sem vincular NPCs a moradores reais.</span></div>
        </div>

        <form onSubmit={confirmOrigin} className={styles.form}>
          <label>
            <span>Cidade</span>
            <input
              autoFocus
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Ex.: Santiago"
              maxLength={70}
              autoComplete="address-level2"
              disabled={isValidating}
            />
          </label>

          <label>
            <span>Estado</span>
            <select
              value={state}
              onChange={(event) => setState(event.target.value)}
              disabled={isValidating}
              aria-label="Estado"
            >
              <option value="">Selecione a UF</option>
              {BRAZIL_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={isValidating || city.trim().length < 2 || state.length !== 2}
          >
            {isValidating ? <Loader2 size={17} className={styles.spin} /> : <MapPin size={17} />}
            {isValidating ? 'Localizando cidade...' : 'Começar minha carreira aqui'}
          </button>
        </form>

        <small className={styles.note}>
          Essa será sua cidade-base inicial. Conforme sua reputação crescer, sua atuação poderá alcançar outras cidades e regiões do país.
        </small>
      </section>
    </div>
  );
};
