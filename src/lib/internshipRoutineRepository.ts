import type { PlayerProfile } from '../types/game';
import { supabase } from './supabase';
import { readInternshipRoutine, saveInternshipRoutine, type InternshipRoutineState } from './internshipRoutine';
import { createInitialSeniorPortfolio, type SeniorPortfolioDecision, type SeniorPortfolioMatter } from './seniorPortfolio';
import { emptyOabPreparation, type OabPreparationState } from './oabIntensivePreparation';

function eligible(player: PlayerProfile) {
  return Boolean(supabase && player.cloudCareerId);
}

function emptyState(): InternshipRoutineState {
  return { attendance: [], meetings: [], handledEventKeys: [], lastTaskDeliveryKey: null, dailyTaskKeys: {}, greetedWorkdays: [], briefingProgress: {}, excusedAbsenceKeys: [], handledSeniorPriorityKeys: [], processedDisciplineKeys: [] };
}

export interface InternshipCloudState { routine: InternshipRoutineState; seniorPortfolio: SeniorPortfolioMatter[]; seniorDecisions: SeniorPortfolioDecision[]; }

function fromRow(row: any): InternshipCloudState {
  const base = emptyState();
  const routine = {
    ...base,
    attendance: Array.isArray(row.attendance) ? row.attendance : [],
    meetings: Array.isArray(row.meetings) ? row.meetings : [],
    handledEventKeys: Array.isArray(row.handled_event_keys) ? row.handled_event_keys : [],
    dailyTaskKeys: row.daily_task_keys && typeof row.daily_task_keys === 'object' ? row.daily_task_keys : {},
    greetedWorkdays: Array.isArray(row.greeted_workdays) ? row.greeted_workdays : [],
    briefingProgress: row.senior_state?.briefingProgress && typeof row.senior_state.briefingProgress === 'object' ? row.senior_state.briefingProgress : {},
    excusedAbsenceKeys: Array.isArray(row.excused_absence_keys) ? row.excused_absence_keys : [],
    handledSeniorPriorityKeys: Array.isArray(row.senior_state?.handledSeniorPriorityKeys) ? row.senior_state.handledSeniorPriorityKeys : [],
    processedDisciplineKeys: Array.isArray(row.senior_state?.processedDisciplineKeys) ? row.senior_state.processedDisciplineKeys : [],
    lastTaskDeliveryKey: row.senior_state?.lastTaskDeliveryKey || null,
  };
  return { routine, seniorPortfolio: Array.isArray(row.senior_portfolio) ? row.senior_portfolio : [], seniorDecisions: Array.isArray(row.senior_decisions) ? row.senior_decisions : [] };
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
    senior_state: { briefingProgress: state.briefingProgress || {}, lastTaskDeliveryKey: state.lastTaskDeliveryKey, handledSeniorPriorityKeys: state.handledSeniorPriorityKeys, processedDisciplineKeys: state.processedDisciplineKeys },
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
  saveInternshipRoutine(player, cloud.routine);
  return cloud.routine;
}

export async function persistInternshipRoutine(player: PlayerProfile, state = readInternshipRoutine(player)) {
  if (!eligible(player) || !supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('internship_routines').upsert(row(player, user.id, state), { onConflict: 'career_id' });
  if (error) console.warn('[internship] persist', error.message);
}


/** Commits a routine snapshot before the UI awards attendance or displays a briefing. */
export async function commitInternshipRoutine(player: PlayerProfile, state: InternshipRoutineState): Promise<boolean> {
  if (!eligible(player) || !supabase) return false;
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return false;
  const { error } = await supabase.from('internship_routines')
    .upsert(row(player, user.id, state), { onConflict: 'career_id' });
  if (error) {
    console.warn('[internship] commit', error.message);
    return false;
  }
  saveInternshipRoutine(player, state);
  return true;
}


export async function loadSeniorPortfolio(player: PlayerProfile) {
  if (!eligible(player) || !supabase) return { portfolio: [] as SeniorPortfolioMatter[], decisions: [] as SeniorPortfolioDecision[] };
  const { data, error } = await supabase.from('internship_routines').select('senior_portfolio,senior_decisions').eq('career_id', player.cloudCareerId!).maybeSingle();
  if (error) { console.warn('[internship] senior portfolio load', error.message); return { portfolio: [], decisions: [] }; }
  const portfolio = Array.isArray(data?.senior_portfolio) && data.senior_portfolio.length ? data.senior_portfolio : createInitialSeniorPortfolio();
  return { portfolio, decisions: Array.isArray(data?.senior_decisions) ? data.senior_decisions : [] };
}

export async function persistSeniorPortfolio(player: PlayerProfile, portfolio: SeniorPortfolioMatter[], decisions: SeniorPortfolioDecision[]) {
  if (!eligible(player) || !supabase) return false;
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return false;
  const { data, error } = await supabase.from('internship_routines').update({ senior_portfolio: portfolio, senior_decisions: decisions, updated_at: new Date().toISOString() }).eq('career_id', player.cloudCareerId!).eq('user_id', user.id).select('career_id').maybeSingle();
  if (error || !data) { console.warn('[internship] senior portfolio persist', error?.message || 'nenhuma linha atualizada'); return false; }
  return true;
}


export async function loadOabPreparation(player:PlayerProfile):Promise<OabPreparationState>{
 if(!eligible(player)||!supabase)return emptyOabPreparation();
 const {data,error}=await supabase.from('internship_routines').select('oab_preparation').eq('career_id',player.cloudCareerId!).maybeSingle();
 if(error){console.warn('[internship] OAB preparation load',error.message);return emptyOabPreparation()}
 if(!data?.oab_preparation||typeof data.oab_preparation!=='object')return emptyOabPreparation();
 const base=emptyOabPreparation();const raw=data.oab_preparation as Partial<OabPreparationState>;
 return {...base,...raw,studyPoints:{...base.studyPoints,...(raw.studyPoints||{})},sessions:Array.isArray(raw.sessions)?raw.sessions:[],mocks:Array.isArray(raw.mocks)?raw.mocks:[]};
}
export async function persistOabPreparation(player:PlayerProfile,state:OabPreparationState){
 if(!eligible(player)||!supabase)return false;const {data:{user}}=await supabase.auth.getUser();if(!user)return false;
 const {data,error}=await supabase.from('internship_routines').update({oab_preparation:state,updated_at:new Date().toISOString()}).eq('career_id',player.cloudCareerId!).eq('user_id',user.id).select('career_id').maybeSingle();
 if(error||!data){console.warn('[internship] OAB preparation persist',error?.message||'nenhuma linha atualizada');return false}return true;
}
