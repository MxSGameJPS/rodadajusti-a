import { addGameDays, type GameDate } from './gameDate';

export const DEFAULT_GAME_START_MINUTES = 8 * 60;

export function normalizeGameMinutes(value: number | null | undefined) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_GAME_START_MINUTES;
  return ((Math.trunc(numeric) % 1440) + 1440) % 1440;
}

export function formatGameTime(value: number | null | undefined) {
  const minutes = normalizeGameMinutes(value);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function getGamePeriod(value: number | null | undefined) {
  const minutes = normalizeGameMinutes(value);
  if (minutes < 6 * 60) return 'Madrugada';
  if (minutes < 12 * 60) return 'Manhã';
  if (minutes < 18 * 60) return 'Tarde';
  return 'Noite';
}

export function advanceGameClock(date: GameDate, currentMinutes: number, minutesToAdd: number) {
  const safeMinutes = Math.max(0, Math.round(Number(minutesToAdd) || 0));
  const total = normalizeGameMinutes(currentMinutes) + safeMinutes;
  const daysToAdd = Math.floor(total / 1440);

  return {
    date: addGameDays(date, daysToAdd),
    minutes: total % 1440,
  };
}
