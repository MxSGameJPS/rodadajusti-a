export type GameDate = {
  day: number;
  month: number;
  year: number;
};

function fromDate(date: Date): GameDate {
  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}

function toUtcDate(value: GameDate) {
  return new Date(Date.UTC(value.year, value.month - 1, value.day));
}

export function getTodayGameDate(): GameDate {
  const now = new Date();
  return {
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function normalizeGameDate(value: GameDate): GameDate {
  const safeYear = Number.isFinite(value.year) ? Math.trunc(value.year) : 2026;
  const safeMonth = Number.isFinite(value.month) ? Math.trunc(value.month) : 1;
  const safeDay = Number.isFinite(value.day) ? Math.trunc(value.day) : 1;

  return fromDate(new Date(Date.UTC(safeYear, safeMonth - 1, safeDay)));
}

export function addGameDays(value: GameDate, days: number): GameDate {
  const date = toUtcDate(normalizeGameDate(value));
  date.setUTCDate(date.getUTCDate() + Math.trunc(days || 0));
  return fromDate(date);
}

export function addGameMonths(value: GameDate, months: number): GameDate {
  const normalized = normalizeGameDate(value);
  const targetMonthIndex = normalized.month - 1 + Math.trunc(months || 0);
  const targetYear = normalized.year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  return {
    day: Math.min(normalized.day, lastDay),
    month: targetMonth + 1,
    year: targetYear,
  };
}

export function formatGameDate(value: GameDate) {
  const normalized = normalizeGameDate(value);
  return [
    String(normalized.day).padStart(2, '0'),
    String(normalized.month).padStart(2, '0'),
    String(normalized.year),
  ].join('/');
}

export function elapsedGameDays(previousHours: number, nextHours: number) {
  const before = Math.floor(Math.max(0, Number(previousHours) || 0) / 24);
  const after = Math.floor(Math.max(0, Number(nextHours) || 0) / 24);
  return Math.max(0, after - before);
}
