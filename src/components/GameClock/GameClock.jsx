import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  CloudSun,
  MapPin,
  Thermometer,
  Umbrella,
  Wind,
  X,
} from 'lucide-react';
import { formatGameDate } from '../../lib/gameDate';
import { formatGameTime, getGamePeriod } from '../../lib/gameTime';
import { geocodeBrazilianCity } from '../../lib/worldMap';
import { describeWeatherCode, fetchWeatherForecast } from '../../lib/weather';
import styles from './GameClock.module.css';

function urgencyClass(hoursLeft) {
  if (hoursLeft === null || hoursLeft === undefined) return styles.normal;
  if (hoursLeft <= 8) return styles.critical;
  if (hoursLeft <= 24) return styles.warning;
  return styles.normal;
}

function deadlineLabel(hoursLeft) {
  if (hoursLeft === null || hoursLeft === undefined) return 'Sem prazo ativo';
  if (hoursLeft <= 0) return 'PRAZO ESGOTADO';
  if (hoursLeft <= 8) return `URGENTE • ${hoursLeft}h restantes`;
  return `${hoursLeft}h restantes`;
}

function formatForecastDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export function GameClock({
  player,
  hoursLeft,
  caseTitle,
  cityLabel,
  worldProfile,
  declaredCity,
}) {
  const [open, setOpen] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const [weatherLoading, setWeatherLoading] = useState(false);

  const gameDate = useMemo(
    () => formatGameDate({
      day: player.gameCurrentDay,
      month: player.gameCurrentMonth,
      year: player.gameCurrentYear,
    }),
    [player.gameCurrentDay, player.gameCurrentMonth, player.gameCurrentYear],
  );

  const gameTime = formatGameTime(player.gameCurrentMinutes);
  const gamePeriod = getGamePeriod(player.gameCurrentMinutes);
  const inOfficeHours = player.gameCurrentMinutes >= 8 * 60 && player.gameCurrentMinutes < 18 * 60;

  useEffect(() => {
    if (!open || weather) return;

    let active = true;

    async function loadWeather() {
      setWeatherLoading(true);
      setWeatherError('');

      try {
        let point = worldProfile?.center || null;

        if (!point && declaredCity?.city && declaredCity?.state) {
          const geocoded = await geocodeBrazilianCity(declaredCity.city, declaredCity.state);
          point = geocoded.center;
        }

        if (!point) {
          throw new Error('A cidade ainda não possui coordenadas configuradas no mapa.');
        }

        const snapshot = await fetchWeatherForecast(point.lat, point.lng);
        if (active) setWeather(snapshot);
      } catch (error) {
        if (active) {
          setWeatherError(error instanceof Error ? error.message : 'Não foi possível carregar a previsão.');
        }
      } finally {
        if (active) setWeatherLoading(false);
      }
    }

    void loadWeather();

    return () => {
      active = false;
    };
  }, [open, weather, worldProfile, declaredCity?.city, declaredCity?.state]);

  return (
    <>
      <button
        type="button"
        className={`${styles.clockButton} ${urgencyClass(hoursLeft)}`}
        onClick={() => setOpen(true)}
        title="Abrir central de tempo e informações"
      >
        <Clock3 size={18} />
        <span className={styles.clockCopy}>
          <strong>{gameTime}</strong>
          <small>{deadlineLabel(hoursLeft)}</small>
        </span>
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className={styles.backdrop} onMouseDown={() => setOpen(false)}>
          <section className={styles.modal} onMouseDown={(event) => event.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>CENTRAL DE TEMPO</span>
                <h2>{gameTime} <i /> {gameDate}</h2>
                <p><MapPin size={14} /> {cityLabel}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar">
                <X size={20} />
              </button>
            </header>

            <div className={styles.summaryGrid}>
              <article>
                <Clock3 size={20} />
                <span>Período</span>
                <strong>{gamePeriod}</strong>
                <small>{inOfficeHours ? 'Expediente forense' : 'Fora do expediente'}</small>
              </article>

              <article>
                <CalendarDays size={20} />
                <span>Data da carreira</span>
                <strong>{gameDate}</strong>
                <small>O calendário avança com as ações do jogador.</small>
              </article>

              <article className={hoursLeft !== null && hoursLeft <= 8 ? styles.deadlineCritical : ''}>
                <AlertTriangle size={20} />
                <span>Prazo processual</span>
                <strong>{deadlineLabel(hoursLeft)}</strong>
                <small>{caseTitle || 'Nenhum caso em andamento.'}</small>
              </article>
            </div>

            <section className={styles.weatherSection}>
              <div className={styles.sectionTitle}>
                <div>
                  <span>PREVISÃO DO TEMPO</span>
                  <h3>Meteorologia em {cityLabel}</h3>
                </div>
                <CloudSun size={26} />
              </div>

              {weatherLoading && (
                <div className={styles.weatherState}>Consultando condições meteorológicas...</div>
              )}

              {weatherError && !weatherLoading && (
                <div className={styles.weatherState}>{weatherError}</div>
              )}

              {weather && !weatherLoading && (
                <>
                  <div className={styles.currentWeather}>
                    <div>
                      <CloudSun size={30} />
                      <span>
                        <strong>{Math.round(weather.temperature)}°C</strong>
                        <small>{describeWeatherCode(weather.weatherCode)}</small>
                      </span>
                    </div>

                    <div className={styles.weatherMetrics}>
                      <span><Thermometer size={15} /> Sensação {Math.round(weather.apparentTemperature)}°C</span>
                      <span><Wind size={15} /> Vento {Math.round(weather.windSpeed)} km/h</span>
                      <span><Umbrella size={15} /> Chuva {weather.precipitation.toFixed(1)} mm</span>
                    </div>
                  </div>

                  <div className={styles.forecastGrid}>
                    {weather.days.map((day) => (
                      <article key={day.date}>
                        <strong>{formatForecastDate(day.date)}</strong>
                        <span>{describeWeatherCode(day.code)}</span>
                        <b>{Math.round(day.max)}° / {Math.round(day.min)}°</b>
                        <small><Umbrella size={12} /> {Math.round(day.rainChance)}%</small>
                      </article>
                    ))}
                  </div>
                </>
              )}

              <small className={styles.weatherNote}>
                A meteorologia usa condições reais da cidade. O relógio e a data acima pertencem à linha do tempo do jogo.
              </small>
            </section>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
