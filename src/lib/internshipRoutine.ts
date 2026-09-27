import type { OfficePerformanceState, PlayerProfile } from '../types/game';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'OFF_DAY';
export type OfficeEventKind = 'CLIENT_URGENT' | 'SYSTEM_DOWN' | 'COLLEAGUE_HELP' | 'DEADLINE_PRESSURE' | 'QUIET_DAY';

export interface InternshipAttendanceRecord {
  date: string;
  status: AttendanceStatus;
  arrivalMinute: number | null;
  departureMinute: number | null;
  lateMinutes: number;
}

export interface InternshipMeetingRecord {
  id: string;
  date: string;
  title: string;
  summary: string;
  score: number;
}

export interface InternshipRoutineState {
  attendance: InternshipAttendanceRecord[];
  meetings: InternshipMeetingRecord[];
  handledEventKeys: string[];
  lastTaskDeliveryKey: string | null;
}

export interface WorkSchedule {
  workday: boolean;
  weekday: number;
  weekdayLabel: string;
  startMinute: number;
  endMinute: number;
  startLabel: string;
  endLabel: string;
}

const STORAGE_PREFIX = 'rota_internship_routine_v1:';
const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function pad(value: number) { return String(value).padStart(2, '0'); }
function dateKey(player: Pick<PlayerProfile, 'gameCurrentDay' | 'gameCurrentMonth' | 'gameCurrentYear'>) {
  return `${player.gameCurrentYear}-${pad(player.gameCurrentMonth)}-${pad(player.gameCurrentDay)}`;
}
function storageKey(player: PlayerProfile) {
  return STORAGE_PREFIX + (player.cloudCareerId || `${player.name}:${player.avatarSeed}`);
}
function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }
function localDate(player: PlayerProfile) {
  return new Date(player.gameCurrentYear, Math.max(0, player.gameCurrentMonth - 1), Math.max(1, player.gameCurrentDay));
}
function hash(value: string) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function readInternshipRoutine(player: PlayerProfile): InternshipRoutineState {
  try {
    const raw = localStorage.getItem(storageKey(player));
    if (!raw) return { attendance: [], meetings: [], handledEventKeys: [], lastTaskDeliveryKey: null };
    const parsed = JSON.parse(raw);
    return {
      attendance: Array.isArray(parsed.attendance) ? parsed.attendance.slice(-90) : [],
      meetings: Array.isArray(parsed.meetings) ? parsed.meetings.slice(-30) : [],
      handledEventKeys: Array.isArray(parsed.handledEventKeys) ? parsed.handledEventKeys.slice(-120) : [],
      lastTaskDeliveryKey: typeof parsed.lastTaskDeliveryKey === 'string' ? parsed.lastTaskDeliveryKey : null,
    };
  } catch {
    return { attendance: [], meetings: [], handledEventKeys: [], lastTaskDeliveryKey: null };
  }
}

export function saveInternshipRoutine(player: PlayerProfile, state: InternshipRoutineState) {
  try { localStorage.setItem(storageKey(player), JSON.stringify(state)); } catch { /* fallback local indisponível */ }
  return state;
}

export function getWorkSchedule(player: PlayerProfile): WorkSchedule {
  const weekday = localDate(player).getDay();
  const workday = weekday >= 1 && weekday <= 5;
  return {
    workday,
    weekday,
    weekdayLabel: WEEKDAYS[weekday],
    startMinute: 8 * 60,
    endMinute: 14 * 60,
    startLabel: '08:00',
    endLabel: '14:00',
  };
}

export function getTodayAttendance(player: PlayerProfile) {
  const state = readInternshipRoutine(player);
  return state.attendance.find((item) => item.date === dateKey(player)) || null;
}

export function registerOfficeArrival(player: PlayerProfile) {
  const schedule = getWorkSchedule(player);
  const state = readInternshipRoutine(player);
  const key = dateKey(player);
  const existing = state.attendance.find((item) => item.date === key);
  if (existing) return { state, record: existing, created: false };

  const minute = Math.max(0, player.gameCurrentMinutes || 0);
  const lateMinutes = schedule.workday ? Math.max(0, minute - schedule.startMinute) : 0;
  const status: AttendanceStatus = !schedule.workday ? 'OFF_DAY' : lateMinutes >= 240 ? 'ABSENT' : lateMinutes > 10 ? 'LATE' : 'PRESENT';
  const record: InternshipAttendanceRecord = {
    date: key,
    status,
    arrivalMinute: minute,
    departureMinute: null,
    lateMinutes,
  };
  state.attendance.push(record);
  saveInternshipRoutine(player, state);
  return { state, record, created: true };
}

export function registerOfficeDeparture(player: PlayerProfile) {
  const state = readInternshipRoutine(player);
  const key = dateKey(player);
  const record = state.attendance.find((item) => item.date === key);
  if (!record) return { state, record: null };
  record.departureMinute = Math.max(0, player.gameCurrentMinutes || 0);
  saveInternshipRoutine(player, state);
  return { state, record };
}

export function reconcileMissedWorkdays(player: PlayerProfile) {
  const state = readInternshipRoutine(player);
  const today = localDate(player);
  const known = new Set(state.attendance.map((item) => item.date));
  const first = state.attendance.length
    ? new Date(state.attendance[0].date + 'T12:00:00')
    : new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 1));
  let added = 0;
  for (const cursor = new Date(first); cursor < today; cursor.setDate(cursor.getDate() + 1)) {
    const weekday = cursor.getDay();
    if (weekday < 1 || weekday > 5) continue;
    const key = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
    if (known.has(key)) continue;
    state.attendance.push({ date: key, status: 'ABSENT', arrivalMinute: null, departureMinute: null, lateMinutes: 0 });
    known.add(key);
    added += 1;
  }
  state.attendance = state.attendance.slice(-90);
  if (added) saveInternshipRoutine(player, state);
  return { state, added };
}

export function attendancePerformanceDelta(record: InternshipAttendanceRecord) {
  if (record.status === 'PRESENT' || record.status === 'OFF_DAY') return { diligence: 1, deadlineManagement: 1, supervisorTrust: 1 };
  if (record.status === 'LATE') return { diligence: -2, deadlineManagement: -2, supervisorTrust: -2 };
  return { diligence: -5, deadlineManagement: -4, supervisorTrust: -5 };
}

export function applyRoutinePerformance(performance: OfficePerformanceState, delta: Partial<Pick<OfficePerformanceState, 'technique' | 'diligence' | 'ethics' | 'deadlineManagement' | 'supervisorTrust'>>) {
  return {
    ...performance,
    technique: clamp(performance.technique + (delta.technique || 0)),
    diligence: clamp(performance.diligence + (delta.diligence || 0)),
    ethics: clamp(performance.ethics + (delta.ethics || 0)),
    deadlineManagement: clamp(performance.deadlineManagement + (delta.deadlineManagement || 0)),
    supervisorTrust: clamp(performance.supervisorTrust + (delta.supervisorTrust || 0)),
  };
}

export function getPeriodicReview(player: PlayerProfile) {
  const state = readInternshipRoutine(player);
  const relevant = state.attendance.filter((item) => item.status !== 'OFF_DAY').slice(-10);
  if (relevant.length < 5) return null;
  const key = `review:${relevant[relevant.length - 1].date}`;
  if (state.meetings.some((item) => item.id === key)) return null;
  const present = relevant.filter((item) => item.status === 'PRESENT').length;
  const late = relevant.filter((item) => item.status === 'LATE').length;
  const absent = relevant.filter((item) => item.status === 'ABSENT').length;
  const p = player.officePerformance;
  const score = clamp((p.technique + p.diligence + p.ethics + p.deadlineManagement + p.supervisorTrust) / 5 - late * 2 - absent * 6);
  return {
    id: key,
    date: dateKey(player),
    title: score >= 75 ? 'Avaliação muito positiva' : score >= 60 ? 'Avaliação de evolução' : 'Reunião de alinhamento',
    summary: score >= 75
      ? 'Dr. Roberto reconhece consistência, responsabilidade e evolução. A autonomia tende a aumentar.'
      : score >= 60
        ? 'Dr. Roberto reconhece evolução, mas aponta pontos que ainda precisam de consistência antes de ampliar sua autonomia.'
        : 'Dr. Roberto demonstra preocupação com sua rotina e desempenho. Novos problemas podem comprometer a continuidade do estágio.',
    score,
  };
}

export function recordPeriodicReview(player: PlayerProfile, meeting: InternshipMeetingRecord) {
  const state = readInternshipRoutine(player);
  if (!state.meetings.some((item) => item.id === meeting.id)) state.meetings.push(meeting);
  saveInternshipRoutine(player, state);
  return state;
}

export function getDailyOfficeEvent(player: PlayerProfile) {
  const schedule = getWorkSchedule(player);
  if (!schedule.workday) return null;
  const key = `event:${dateKey(player)}`;
  const state = readInternshipRoutine(player);
  if (state.handledEventKeys.includes(key)) return null;
  const roll = hash(`${key}:${player.avatarSeed}`) % 100;
  if (roll >= 42) return null;
  const events = [
    { kind: 'CLIENT_URGENT' as const, title: 'Cliente chegou sem aviso', text: 'Mariana pede ajuda para organizar documentos de um cliente que chegou com urgência.', delta: { diligence: 2, supervisorTrust: 1 } },
    { kind: 'SYSTEM_DOWN' as const, title: 'Sistema indisponível', text: 'O sistema do escritório caiu perto de um prazo. Você precisa reorganizar a prioridade do trabalho.', delta: { deadlineManagement: 2, diligence: 1 } },
    { kind: 'COLLEAGUE_HELP' as const, title: 'Colega precisa de ajuda', text: 'Um colega está sobrecarregado e Mariana pergunta se você consegue assumir uma conferência rápida.', delta: { supervisorTrust: 2, diligence: 1 } },
    { kind: 'DEADLINE_PRESSURE' as const, title: 'Prazo inesperado', text: 'Uma intimação exige resposta rápida. O escritório precisa de atenção redobrada na conferência.', delta: { deadlineManagement: 3, technique: 1 } },
    { kind: 'QUIET_DAY' as const, title: 'Uma manhã mais tranquila', text: 'O movimento diminuiu e surgiu uma oportunidade para adiantar pesquisas e organização.', delta: { technique: 1, diligence: 1 } },
  ];
  return { key, ...events[roll % events.length] };
}

export function markOfficeEventHandled(player: PlayerProfile, eventKey: string) {
  const state = readInternshipRoutine(player);
  if (!state.handledEventKeys.includes(eventKey)) state.handledEventKeys.push(eventKey);
  state.handledEventKeys = state.handledEventKeys.slice(-120);
  saveInternshipRoutine(player, state);
}

export function minuteLabel(minute: number | null) {
  if (minute == null) return '—';
  const normalized = Math.max(0, minute) % (24 * 60);
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}
