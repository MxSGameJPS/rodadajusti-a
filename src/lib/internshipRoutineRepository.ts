import type { PlayerProfile } from '../types/game';
import { supabase } from './supabase';
import { readInternshipRoutine, saveInternshipRoutine, type InternshipRoutineState } from './internshipRoutine';

function eligible(player: PlayerProfile) {
  return Boolean(supabase && player.cloudCareerId);
}

function emptyState(): InternshipRoutineState {
  return { attendance: [], meetings: [], handledEventKeys: [], lastTaskDeliveryKey: null, dailyTaskKeys: {}, greetedWorkdays: [], excusedAbsenceKeys: [] };
}

function fromRow(row: any): InternshipRoutineState {
  const base = emptyState();
  return {
    ...base,
    attendance: Array.isArray(row.attendance) ? row.attendance : [],
    meetings: Array.isArray(row.meetings) ? row.meetings : [],
    handledEventKeys: Array.isArray(row.handled_event_keys) ? row.handled_event_keys : [],
    dailyTaskKeys: row.daily_task_keys && typeof row.daily_task_keys === 'object' ? row.daily_task_keys : {},
    greetedWorkdays: Array.isArray(row.greeted_workdays) ? row.greeted_workdays : [],
    excusedAbsenceKeys: Array.isArray(row.excused_absence_keys) ? row.excused_absence_keys : [],
    lastTaskDeliveryKey: row.senior_state?.lastTaskDeliveryKey || null,
  };
}

function row(player: PlayerProfile, userId: string, state: InternshipRoutineState) {
  return {
    career_id: player.cloudCareerId!,
    user_id: userId,
    attendance: state.attendance,
    meetings: state.meetings,
    handled_event_keys: state.handledEventKeys,
    daily_task_keys: state.dailyTaskKeys,
    greeted_workdays: state.greetedWorkdays,
    excused_absence_keys: state.excusedAbsenceKeys,
    senior_state: { lastTaskDeliveryKey: state.lastTaskDeliveryKey },
    updated_at: new Date().toISOString(),
  };
}

export async function hydrateInternshipRoutine(player: PlayerProfile) {
  const local = readInternshipRoutine(player);
  if (!eligible(player) || !supabase) return local;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return local;
  const { data, error } = await supabase.from('internship_routines').select('*').eq('career_id', player.cloudCareerId!).maybeSingle();
  if (error) { console.warn('[internship] hydrate', error.message); return local; }
  if (!data) {
    await persistInternshipRoutine(player, local);
    return local;
  }
  const cloud = fromRow(data);
  saveInternshipRoutine(player, cloud);
  return cloud;
}

export async function persistInternshipRoutine(player: PlayerProfile, state = readInternshipRoutine(player)) {
  if (!eligible(player) || !supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('internship_routines').upsert(row(player, user.id, state), { onConflict: 'career_id' });
  if (error) console.warn('[internship] persist', error.message);
}
