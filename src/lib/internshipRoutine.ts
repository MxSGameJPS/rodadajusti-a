import type { OfficePerformanceState, PlayerProfile } from '../types/game';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'OFF_DAY';
export type RoutineDisciplineLevel = 'NOTE' | 'WARNING' | 'TERMINATION';
export type OfficeEventKind = 'CLIENT_URGENT' | 'SYSTEM_DOWN' | 'COLLEAGUE_HELP' | 'DEADLINE_PRESSURE' | 'QUIET_DAY';
export type OfficeEventChoiceId = 'HELP_NOW' | 'ASK_MARIANA' | 'PROTECT_PRIORITY';

export interface OfficeEventChoice {
  id: OfficeEventChoiceId;
  label: string;
  description: string;
  minutes: number;
  delta: Partial<Pick<OfficePerformanceState, 'technique' | 'diligence' | 'ethics' | 'deadlineManagement' | 'supervisorTrust'>>;
  marianaAffinity: number;
  marianaTrust: number;
  outcome: string;
}

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
  dailyTaskKeys: Record<string, string[]>;
  greetedWorkdays: string[];
  excusedAbsenceKeys: string[];
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
    if (!raw) return { attendance: [], meetings: [], handledEventKeys: [], lastTaskDeliveryKey: null, dailyTaskKeys: {}, greetedWorkdays: [], excusedAbsenceKeys: [] };
    const parsed = JSON.parse(raw);
    return {
      attendance: Array.isArray(parsed.attendance) ? parsed.attendance.slice(-90) : [],
      meetings: Array.isArray(parsed.meetings) ? parsed.meetings.slice(-30) : [],
      handledEventKeys: Array.isArray(parsed.handledEventKeys) ? parsed.handledEventKeys.slice(-120) : [],
      lastTaskDeliveryKey: typeof parsed.lastTaskDeliveryKey === 'string' ? parsed.lastTaskDeliveryKey : null,
      dailyTaskKeys: parsed.dailyTaskKeys && typeof parsed.dailyTaskKeys === 'object' ? parsed.dailyTaskKeys : {},
      greetedWorkdays: Array.isArray(parsed.greetedWorkdays) ? parsed.greetedWorkdays.slice(-60) : [],
      excusedAbsenceKeys: Array.isArray(parsed.excusedAbsenceKeys) ? parsed.excusedAbsenceKeys.slice(-60) : [],
    };
  } catch {
    return { attendance: [], meetings: [], handledEventKeys: [], lastTaskDeliveryKey: null, dailyTaskKeys: {}, greetedWorkdays: [], excusedAbsenceKeys: [] };
  }
}

export function saveInternshipRoutine(player: PlayerProfile, state: InternshipRoutineState) {
  try { localStorage.setItem(storageKey(player), JSON.stringify(state)); } catch { /* cache local indisponível */ }
  window.dispatchEvent(new CustomEvent('rota:internship-routine-changed', { detail: { careerId: player.cloudCareerId || null } }));
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
    { kind: 'CLIENT_URGENT' as const, title: 'Cliente chegou sem aviso', text: 'Mariana pede ajuda para organizar documentos de um cliente que chegou com urgência.' },
    { kind: 'SYSTEM_DOWN' as const, title: 'Sistema indisponível', text: 'O sistema do escritório caiu perto de um prazo. Você precisa reorganizar a prioridade do trabalho.' },
    { kind: 'COLLEAGUE_HELP' as const, title: 'Colega precisa de ajuda', text: 'Um colega está sobrecarregado e Mariana pergunta se você consegue assumir uma conferência rápida.' },
    { kind: 'DEADLINE_PRESSURE' as const, title: 'Prazo inesperado', text: 'Uma intimação exige resposta rápida. O escritório precisa de atenção redobrada na conferência.' },
    { kind: 'QUIET_DAY' as const, title: 'Uma manhã mais tranquila', text: 'O movimento diminuiu e surgiu uma oportunidade para adiantar pesquisas e organização.' },
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

export const OFFICE_CANTEEN_COFFEE_PRICE = 8;

export type OfficeAccessDecision =
  | { allowed: true; reason: 'OPEN' | 'OFF_DAY'; arrivalMinute: number }
  | { allowed: false; reason: 'TOO_EARLY'; arrivalMinute: number; opensAtMinute: number; waitMinutes: number }
  | { allowed: false; reason: 'CLOSED'; arrivalMinute: number };

export function getOfficeAccessDecision(player: PlayerProfile, arrivalMinute = player.gameCurrentMinutes || 0): OfficeAccessDecision {
  const schedule = getWorkSchedule(player);
  if (!schedule.workday) return { allowed: false, reason: 'CLOSED', arrivalMinute };
  if (arrivalMinute < schedule.startMinute) {
    return { allowed: false, reason: 'TOO_EARLY', arrivalMinute, opensAtMinute: schedule.startMinute, waitMinutes: schedule.startMinute - arrivalMinute };
  }
  if (arrivalMinute > schedule.endMinute + 60) return { allowed: false, reason: 'CLOSED', arrivalMinute };
  return { allowed: true, reason: 'OPEN', arrivalMinute };
}

export function isInternCareer(player: PlayerProfile) {
  return player.careerTier === 'ESTAGIARIO' || player.careerTier === 'ESTAGIARIO_SENIOR';
}

export function canUseOfficeGameplay(player: PlayerProfile) {
  if (!isInternCareer(player)) return { allowed: true as const, reason: '' };
  if (player.officeDiscipline.employmentStatus !== 'ACTIVE') {
    return { allowed: false as const, reason: 'Seu vínculo com o Ramos & Associados não está ativo. As atividades internas do estágio estão indisponíveis.' };
  }
  if (player.worldLocation.kind !== 'OFFICE') {
    return { allowed: false as const, reason: 'Esta atividade exige sua presença física no Ramos & Associados.' };
  }
  const access = getOfficeAccessDecision(player);
  if (!access.allowed) {
    return { allowed: false as const, reason: access.reason === 'TOO_EARLY' ? 'O expediente ainda não começou.' : 'O expediente do estágio já está encerrado.' };
  }
  const attendance = getTodayAttendance(player);
  if (!attendance || attendance.status === 'ABSENT') {
    return { allowed: false as const, reason: 'Sua entrada no expediente ainda não foi registrada.' };
  }
  return { allowed: true as const, reason: '' };
}

export function isAuthorizedExternalCaseActivity(player: PlayerProfile) {
  return isInternCareer(player)
    && player.officeDiscipline.employmentStatus === 'ACTIVE'
    && Boolean(player.activeCase)
    && (player.worldLocation.kind === 'CASE_LOCATION' || player.worldLocation.kind === 'OFFICE');
}

export function getWorkTimeConflict(player: PlayerProfile, durationMinutes: number, context: 'OFFICE' | 'UNIVERSITY' | 'CASE') {
  if (!isInternCareer(player) || player.officeDiscipline.employmentStatus !== 'ACTIVE') return null;
  const schedule = getWorkSchedule(player);
  const start = Math.max(0, player.gameCurrentMinutes || 0);
  const end = start + Math.max(0, durationMinutes);

  if (context === 'UNIVERSITY' && schedule.workday && start < schedule.endMinute && end > schedule.startMinute) {
    return 'Esta atividade acadêmica conflita com seu expediente no Ramos & Associados. Vá à faculdade fora do horário de estágio ou após encerrar o expediente.';
  }
  if (context === 'OFFICE' && end > schedule.endMinute) {
    return `Não há tempo suficiente no expediente para concluir esta atividade hoje. O escritório encerra o estágio às ${schedule.endLabel}.`;
  }
  return null;
}

export function shouldCloseInternWorkday(player: PlayerProfile) {
  if (!isInternCareer(player)) return false;
  const schedule = getWorkSchedule(player);
  return schedule.workday && player.gameCurrentMinutes >= schedule.endMinute;
}

export function getDailyTaskIds(player: PlayerProfile, availableTaskIds: string[]) {
  const state = readInternshipRoutine(player);
  const key = dateKey(player);
  const existing = state.dailyTaskKeys[key];
  if (Array.isArray(existing)) return existing.filter((id) => availableTaskIds.includes(id));

  const completed = new Set(player.officePerformance.completedTaskIds || []);
  const pending = availableTaskIds.filter((id) => !completed.has(id));
  const pool = pending.length ? pending : availableTaskIds;
  const count = player.careerTier === 'ESTAGIARIO_SENIOR' ? 3 : 2;
  const selected = [...pool]
    .sort((a, b) => (hash(`${key}:${player.avatarSeed}:${a}`) % 10000) - (hash(`${key}:${player.avatarSeed}:${b}`) % 10000))
    .slice(0, Math.min(count, pool.length));
  state.dailyTaskKeys[key] = selected;
  const retainedKeys = Object.keys(state.dailyTaskKeys).sort().slice(-30);
  state.dailyTaskKeys = Object.fromEntries(retainedKeys.map((entryKey) => [entryKey, state.dailyTaskKeys[entryKey]]));
  saveInternshipRoutine(player, state);
  return selected;
}

export function buildSupervisorReviewDialogues(player: PlayerProfile, meeting: InternshipMeetingRecord) {
  const state = readInternshipRoutine(player);
  const recent = state.attendance.filter((item) => item.status !== 'OFF_DAY').slice(-10);
  const late = recent.filter((item) => item.status === 'LATE').length;
  const absent = recent.filter((item) => item.status === 'ABSENT').length;
  const p = player.officePerformance;
  const strongest = [
    ['técnica', p.technique],
    ['diligência', p.diligence],
    ['ética', p.ethics],
    ['gestão de prazos', p.deadlineManagement],
    ['confiança', p.supervisorTrust],
  ].sort((a, b) => Number(b[1]) - Number(a[1]))[0][0];
  const weakest = [
    ['técnica', p.technique],
    ['diligência', p.diligence],
    ['ética', p.ethics],
    ['gestão de prazos', p.deadlineManagement],
    ['confiança', p.supervisorTrust],
  ].sort((a, b) => Number(a[1]) - Number(b[1]))[0][0];

  return [
    { eyebrow: 'Avaliação periódica', text: `Quero conversar sobre seu estágio. Esta avaliação considera suas últimas jornadas, as entregas feitas e a forma como você vem se integrando ao escritório. Sua nota interna neste ciclo é ${meeting.score}/100.` },
    { eyebrow: 'Frequência e responsabilidade', text: absent > 0 ? `Tivemos ${absent} falta(s) e ${late} atraso(s) no período. Isso pesa porque previsibilidade e responsabilidade são parte do trabalho jurídico.` : late > 0 ? `Você não teve faltas, mas registrou ${late} atraso(s). Quero que cuide melhor do horário para que isso não vire um padrão.` : 'Sua frequência foi consistente neste período. Pontualidade parece simples, mas é uma das formas mais objetivas de construir confiança profissional.' },
    { eyebrow: 'Desempenho', text: `Seu ponto mais forte neste momento é ${strongest}. O aspecto que mais precisa de atenção é ${weakest}. Não espero perfeição de um estagiário; espero evolução e capacidade de corrigir o que ainda está fraco.` },
    { eyebrow: meeting.score >= 75 ? 'Próximos passos' : meeting.score >= 60 ? 'Evolução esperada' : 'Alinhamento necessário', text: meeting.summary },
  ];
}

export function getOfficeEventChoices(kind: OfficeEventKind): OfficeEventChoice[] {
  const contextual: Record<OfficeEventKind, OfficeEventChoice[]> = {
    CLIENT_URGENT: [
      { id: 'HELP_NOW', label: 'Atender a urgência agora', description: 'Interromper sua prioridade e ajudar Mariana com o cliente.', minutes: 35, delta: { diligence: 2, supervisorTrust: 2 }, marianaAffinity: 2, marianaTrust: 2, outcome: 'Você reorganizou os documentos e ajudou a estabilizar o atendimento urgente.' },
      { id: 'ASK_MARIANA', label: 'Alinhar a prioridade com Mariana', description: 'Confirmar o que pode ser adiado antes de mudar sua agenda.', minutes: 15, delta: { deadlineManagement: 2, supervisorTrust: 1 }, marianaAffinity: 1, marianaTrust: 2, outcome: 'Mariana ajudou a reorganizar a fila e você protegeu as prioridades sem ignorar o cliente.' },
      { id: 'PROTECT_PRIORITY', label: 'Manter a tarefa atual', description: 'Explicar que sua entrega atual tem prioridade e não interrompê-la.', minutes: 5, delta: { deadlineManagement: 1, supervisorTrust: -1 }, marianaAffinity: -1, marianaTrust: -1, outcome: 'Você preservou sua entrega, mas Mariana precisou resolver a urgência com outra pessoa.' },
    ],
    SYSTEM_DOWN: [
      { id: 'HELP_NOW', label: 'Buscar uma alternativa manual', description: 'Organizar documentos e informações fora do sistema enquanto ele não volta.', minutes: 30, delta: { diligence: 2, deadlineManagement: 2 }, marianaAffinity: 1, marianaTrust: 2, outcome: 'Seu plano alternativo manteve o trabalho andando apesar da indisponibilidade.' },
      { id: 'ASK_MARIANA', label: 'Reorganizar a fila com Mariana', description: 'Mapear o que depende do sistema e adiantar o restante.', minutes: 15, delta: { deadlineManagement: 3 }, marianaAffinity: 1, marianaTrust: 2, outcome: 'Vocês reorganizaram as prioridades e reduziram o impacto da falha.' },
      { id: 'PROTECT_PRIORITY', label: 'Esperar o sistema voltar', description: 'Não alterar a rotina e aguardar.', minutes: 25, delta: { diligence: -1, deadlineManagement: -2, supervisorTrust: -1 }, marianaAffinity: 0, marianaTrust: -1, outcome: 'A espera consumiu parte do expediente e deixou pendências acumuladas.' },
    ],
    COLLEAGUE_HELP: [
      { id: 'HELP_NOW', label: 'Ajudar o colega', description: 'Assumir a conferência rápida antes de voltar à sua mesa.', minutes: 25, delta: { diligence: 1, supervisorTrust: 2 }, marianaAffinity: 2, marianaTrust: 2, outcome: 'A ajuda evitou que a equipe acumulasse mais uma pendência.' },
      { id: 'ASK_MARIANA', label: 'Dividir a demanda', description: 'Pedir a Mariana que organize quem consegue absorver cada parte.', minutes: 15, delta: { deadlineManagement: 2, supervisorTrust: 1 }, marianaAffinity: 1, marianaTrust: 2, outcome: 'A demanda foi dividida sem comprometer completamente sua própria agenda.' },
      { id: 'PROTECT_PRIORITY', label: 'Recusar por enquanto', description: 'Manter o foco na sua entrega atual.', minutes: 5, delta: { diligence: 1, supervisorTrust: -1 }, marianaAffinity: -1, marianaTrust: -1, outcome: 'Você protegeu sua prioridade, mas a equipe precisou encontrar outra solução.' },
    ],
    DEADLINE_PRESSURE: [
      { id: 'HELP_NOW', label: 'Conferir imediatamente', description: 'Parar o restante e participar da conferência urgente.', minutes: 40, delta: { technique: 2, deadlineManagement: 3, supervisorTrust: 2 }, marianaAffinity: 1, marianaTrust: 2, outcome: 'Sua conferência ajudou o escritório a tratar o prazo com mais segurança.' },
      { id: 'ASK_MARIANA', label: 'Confirmar responsáveis e prazo', description: 'Organizar a responsabilidade antes de executar qualquer coisa.', minutes: 15, delta: { deadlineManagement: 3, diligence: 1 }, marianaAffinity: 1, marianaTrust: 2, outcome: 'Você eliminou a ambiguidade e a equipe conseguiu trabalhar com responsabilidades claras.' },
      { id: 'PROTECT_PRIORITY', label: 'Não interromper sua entrega', description: 'Manter a tarefa atual e deixar o novo prazo para a equipe responsável.', minutes: 5, delta: { deadlineManagement: -1, supervisorTrust: -2 }, marianaAffinity: -1, marianaTrust: -1, outcome: 'Sua entrega avançou, mas a postura diante do prazo urgente foi percebida pela equipe.' },
    ],
    QUIET_DAY: [
      { id: 'HELP_NOW', label: 'Adiantar pesquisa jurídica', description: 'Usar o tempo livre para estudar um tema útil ao escritório.', minutes: 45, delta: { technique: 3, diligence: 1 }, marianaAffinity: 0, marianaTrust: 1, outcome: 'Você transformou o tempo livre em preparação técnica.' },
      { id: 'ASK_MARIANA', label: 'Perguntar onde pode ajudar', description: 'Procurar Mariana e assumir uma pequena pendência da equipe.', minutes: 30, delta: { diligence: 2, supervisorTrust: 2 }, marianaAffinity: 2, marianaTrust: 2, outcome: 'Mariana encontrou uma pendência e percebeu sua iniciativa.' },
      { id: 'PROTECT_PRIORITY', label: 'Organizar sua própria mesa', description: 'Revisar arquivos e preparar suas próximas entregas.', minutes: 20, delta: { deadlineManagement: 2, diligence: 1 }, marianaAffinity: 0, marianaTrust: 0, outcome: 'Você aproveitou a tranquilidade para deixar sua rotina mais organizada.' },
    ],
  };
  return contextual[kind];
}

export function hasReceivedDailyBriefing(player: PlayerProfile) {
  return readInternshipRoutine(player).greetedWorkdays.includes(dateKey(player));
}

export function markDailyBriefingReceived(player: PlayerProfile) {
  const state = readInternshipRoutine(player);
  const key = dateKey(player);
  if (!state.greetedWorkdays.includes(key)) state.greetedWorkdays.push(key);
  state.greetedWorkdays = state.greetedWorkdays.slice(-60);
  saveInternshipRoutine(player, state);
}

export function buildMarianaArrivalDialogues(player: PlayerProfile, taskTitles: string[]) {
  const attendance = getTodayAttendance(player);
  const greeting = attendance?.status === 'LATE'
    ? `Você chegou com ${attendance.lateMinutes} minutos de atraso. Eu registrei seu horário. Tente organizar melhor o deslocamento, porque o Dr. Roberto acompanha pontualidade junto com as entregas.`
    : 'Bom dia. Sua entrada já está registrada. O Dr. Roberto deixou algumas prioridades para o seu expediente e eu organizei a ordem do que precisa de atenção hoje.';
  const workload = taskTitles.length
    ? `Para hoje, suas prioridades são: ${taskTitles.join('; ')}. Você não precisa fazer tudo ao mesmo tempo; observe os prazos e escolha a ordem com cuidado.`
    : 'Não há uma nova atividade supervisionada pendente para hoje. Aproveite o expediente para acompanhar casos, revisar pendências e manter sua rotina organizada.';
  return [
    { eyebrow: attendance?.status === 'LATE' ? 'Chegada registrada' : 'Bom dia', text: greeting },
    { eyebrow: 'Prioridades do expediente', text: workload },
    { eyebrow: 'Rotina profissional', text: player.careerTier === 'ESTAGIARIO_SENIOR'
      ? 'Como Estagiário Sênior, você terá mais autonomia. Nem toda demanda virá com instruções detalhadas, então organização e iniciativa passam a pesar ainda mais.'
      : 'Se surgir uma urgência durante o expediente, eu aviso você. O escritório observa não só se a tarefa foi concluída, mas como você administra prioridades e imprevistos.' },
  ];
}

export interface RoutineDisciplineAssessment {
  level: RoutineDisciplineLevel;
  title: string;
  message: string;
  warningDelta: number;
  trustDelta: number;
  diligenceDelta: number;
}

export function assessArrivalDiscipline(player: PlayerProfile, record: InternshipAttendanceRecord): RoutineDisciplineAssessment | null {
  if (record.status !== 'LATE' && record.status !== 'ABSENT') return null;
  const state = readInternshipRoutine(player);
  const recent = state.attendance.filter((item) => item.date !== record.date).slice(-10);
  const priorLate = recent.filter((item) => item.status === 'LATE').length;
  const priorAbsent = recent.filter((item) => item.status === 'ABSENT').length;

  if (record.status === 'ABSENT') {
    const termination = player.officeDiscipline.warningCount >= 1 || priorAbsent >= 1;
    return termination
      ? { level: 'TERMINATION', title: 'Reincidência de falta', message: 'A nova falta se soma a ocorrências anteriores. Roberto considera que o estágio perdeu a previsibilidade mínima exigida pelo escritório.', warningDelta: 1, trustDelta: -10, diligenceDelta: -8 }
      : { level: 'WARNING', title: 'Falta sem justificativa', message: 'A ausência foi registrada como falta não justificada e gera advertência formal. Uma nova ocorrência grave pode encerrar o vínculo.', warningDelta: 1, trustDelta: -7, diligenceDelta: -6 };
  }

  if (record.lateMinutes >= 90 || priorLate >= 2) {
    const termination = player.officeDiscipline.warningCount >= 1 && (priorLate >= 2 || record.lateMinutes >= 120);
    return termination
      ? { level: 'TERMINATION', title: 'Atrasos recorrentes', message: 'A recorrência de atrasos comprometeu a confiança do escritório na sua rotina profissional.', warningDelta: 1, trustDelta: -8, diligenceDelta: -6 }
      : { level: 'WARNING', title: 'Advertência por pontualidade', message: 'Os atrasos deixaram de ser uma ocorrência isolada. Roberto registra uma advertência formal por pontualidade.', warningDelta: 1, trustDelta: -5, diligenceDelta: -4 };
  }

  return { level: 'NOTE', title: 'Observação de pontualidade', message: 'Mariana registrou o atraso. A ocorrência fica como observação; reincidências podem gerar advertência formal.', warningDelta: 0, trustDelta: -2, diligenceDelta: -2 };
}

export function assessEarlyDeparture(player: PlayerProfile, departureMinute: number): RoutineDisciplineAssessment | null {
  const schedule = getWorkSchedule(player);
  if (!schedule.workday || departureMinute >= schedule.endMinute) return null;
  const minutesEarly = schedule.endMinute - departureMinute;
  if (minutesEarly <= 15) return null;
  if (minutesEarly >= 120) {
    return { level: 'WARNING', title: 'Saída antecipada', message: `Você encerrou o expediente ${minutesEarly} minutos antes do horário sem uma atividade externa registrada. A ocorrência gera advertência formal.`, warningDelta: 1, trustDelta: -5, diligenceDelta: -4 };
  }
  return { level: 'NOTE', title: 'Saída antes do horário', message: `Você deixou o escritório ${minutesEarly} minutos antes do fim do expediente. A saída foi registrada e afeta sua avaliação de rotina.`, warningDelta: 0, trustDelta: -2, diligenceDelta: -2 };
}

export function excuseTodayAbsence(player: PlayerProfile) {
  const state = readInternshipRoutine(player);
  const key = dateKey(player);
  if (!state.excusedAbsenceKeys.includes(key)) state.excusedAbsenceKeys.push(key);
  state.excusedAbsenceKeys = state.excusedAbsenceKeys.slice(-60);
  const record = state.attendance.find((item) => item.date === key);
  if (record?.status === 'ABSENT') {
    record.status = 'OFF_DAY';
    record.lateMinutes = 0;
  }
  saveInternshipRoutine(player, state);
  return state;
}

export function isAbsenceExcused(player: PlayerProfile, key = dateKey(player)) {
  return readInternshipRoutine(player).excusedAbsenceKeys.includes(key);
}

export function registerAuthorizedOfficeDeparture(player: PlayerProfile) {
  const result = registerOfficeDeparture(player);
  return { ...result, authorized: true as const };
}

export interface InternPromotionNarrative {
  eligible: boolean;
  headline: string;
  dialogues: Array<{ eyebrow: string; text: string }>;
  blockers: string[];
}

export function buildInternPromotionNarrative(player: PlayerProfile): InternPromotionNarrative {
  const performance = player.officePerformance;
  const state = readInternshipRoutine(player);
  const attendance = state.attendance.filter((item) => item.status !== 'OFF_DAY');
  const present = attendance.filter((item) => item.status === 'PRESENT').length;
  const late = attendance.filter((item) => item.status === 'LATE').length;
  const absent = attendance.filter((item) => item.status === 'ABSENT').length;
  const internTaskIds = new Set(['intern-prazos-agenda', 'intern-jurisprudencia', 'intern-documentos', 'intern-minuta']);
  const completedTasks = performance.completedTaskIds.filter((id) => internTaskIds.has(id)).length;
  const blockers: string[] = [];
  if (player.casesSolved < 2) blockers.push(`concluir mais ${2 - player.casesSolved} caso(s) com êxito`);
  if (player.xp < 350) blockers.push(`alcançar 350 XP (atual: ${player.xp})`);
  if (completedTasks < 2) blockers.push(`concluir mais ${2 - completedTasks} tarefa(s) supervisionada(s)`);
  if (performance.diligence < 58) blockers.push(`elevar diligência de ${performance.diligence} para 58`);
  if (performance.supervisorTrust < 58) blockers.push(`elevar a confiança do Dr. Roberto de ${performance.supervisorTrust} para 58`);
  if (player.officeDiscipline.employmentStatus !== 'ACTIVE') blockers.push('restabelecer um vínculo profissional ativo');
  else if (player.officeDiscipline.warningCount >= 2) blockers.push('resolver a situação disciplinar do vínculo');

  const eligible = blockers.length === 0;
  const frequency = attendance.length === 0
    ? 'Ainda temos pouco histórico de frequência registrado.'
    : `No ponto, foram ${present} presença(s) regular(es), ${late} atraso(s) e ${absent} falta(s) não justificada(s).`;
  const discipline = player.officeDiscipline.warningCount === 0
    ? 'Seu histórico não tem advertências formais.'
    : `Seu histórico registra ${player.officeDiscipline.warningCount} advertência(s) formal(is), e isso pesa na avaliação de confiança.`;

  const dialogues = eligible
    ? [
        { eyebrow: 'Avaliação do Dr. Roberto', text: `${player.name || 'Colega'}, esta promoção não vem de uma barra de progresso. Eu revi seu trabalho: ${player.casesSolved} caso(s) concluído(s) com êxito, ${completedTasks} atividade(s) supervisionada(s) e ${player.xp} XP de experiência prática.` },
        { eyebrow: 'Frequência e disciplina', text: `${frequency} ${discipline}` },
        { eyebrow: 'Desempenho profissional', text: `Sua diligência está em ${performance.diligence}/100 e minha confiança no seu trabalho está em ${performance.supervisorTrust}/100. Técnica: ${performance.technique}/100; ética: ${performance.ethics}/100; gestão de prazos: ${performance.deadlineManagement}/100.` },
        { eyebrow: 'Decisão', text: 'Você demonstrou os requisitos para deixar de ser apenas um executor supervisionado. A partir de hoje, passa a atuar como Estagiário Sênior, com mais autonomia e responsabilidade dentro do escritório.' },
      ]
    : [
        { eyebrow: 'Avaliação do Dr. Roberto', text: `${player.name || 'Colega'}, eu revisei seu histórico antes de decidir sobre a promoção. Você tem ${player.casesSolved} caso(s) concluído(s) com êxito, ${completedTasks} atividade(s) supervisionada(s) e ${player.xp} XP.` },
        { eyebrow: 'Frequência e disciplina', text: `${frequency} ${discipline}` },
        { eyebrow: 'Promoção adiada', text: `Ainda não vou promover você. O que falta é objetivo: ${blockers.join('; ')}.` },
        { eyebrow: 'Próxima avaliação', text: 'A promoção não foi perdida. Corrija esses pontos e eu farei uma nova avaliação quando os requisitos forem alcançados.' },
      ];
  return { eligible, headline: eligible ? 'Promoção para Estagiário Sênior' : 'Promoção adiada', dialogues, blockers };
}
