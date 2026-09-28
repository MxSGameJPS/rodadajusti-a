import type { PlayerProfile } from '../types/game';
import { supabase } from './supabase';

export type ProfessionalTaskKind = 'DEADLINE'|'HEARING'|'CLIENT_RETURN'|'MEETING'|'DILIGENCE'|'DOCUMENT';
export type ProfessionalTaskStatus = 'PENDING'|'DONE'|'MISSED';

export interface ProfessionalAgendaTask {
  id:string; caseId:string|null; title:string; kind:ProfessionalTaskKind;
  dueGameDate:string; dueMinute:number|null; status:ProfessionalTaskStatus;
  critical:boolean; createdAtGameDate:string;
}
export interface ProfessionalMatter {
  id:string; caseId:string; title:string; clientName:string; area:string;
  status:'NEW'|'ACTIVE'|'WAITING'|'APPEAL'|'CLOSED';
  responsibility:'LEAD'|'SUPPORT'; assignedGameDate:string;
  nextAction:string; clientTrust:number; officePriority:'NORMAL'|'IMPORTANT'|'URGENT'|'CRITICAL';
}
export interface ProfessionalPortfolioState {
  version:1; matters:ProfessionalMatter[]; agenda:ProfessionalAgendaTask[];
  firstProfessionalDayCompleted:boolean; firstMatterAssigned:boolean;
}
export interface ProfessionalWorkState {
  version:1; workdayStartMinute:number; workdayEndMinute:number; weeklyHours:number;
  arrivalKeys:string[]; completedResponsibilityKeys:string[]; missedDeadlineKeys:string[];
}

const PORTFOLIO_PREFIX='rota_act_two_portfolio_v1:';
const WORK_PREFIX='rota_act_two_work_v1:';
const emptyPortfolio=():ProfessionalPortfolioState=>({version:1,matters:[],agenda:[],firstProfessionalDayCompleted:false,firstMatterAssigned:false});
const emptyWork=():ProfessionalWorkState=>({version:1,workdayStartMinute:9*60,workdayEndMinute:18*60,weeklyHours:40,arrivalKeys:[],completedResponsibilityKeys:[],missedDeadlineKeys:[]});
const owner=(p:PlayerProfile)=>p.cloudCareerId||p.oabRegistration?.code||p.name||'player';
function read<T>(key:string,fallback:T):T{if(typeof window==='undefined')return fallback;try{const raw=localStorage.getItem(key);return raw?{...fallback,...JSON.parse(raw)}:fallback}catch{return fallback}}
function write(key:string,value:unknown){if(typeof window==='undefined')return;try{localStorage.setItem(key,JSON.stringify(value))}catch{/* cache opcional */}}

export function readProfessionalPortfolio(player:PlayerProfile){return read(PORTFOLIO_PREFIX+owner(player),emptyPortfolio())}
export function readProfessionalWorkState(player:PlayerProfile){return read(WORK_PREFIX+owner(player),emptyWork())}
export function saveProfessionalPortfolio(player:PlayerProfile,state:ProfessionalPortfolioState){write(PORTFOLIO_PREFIX+owner(player),state);void persistActTwoState(player,{professional_portfolio:state})}
export function saveProfessionalWorkState(player:PlayerProfile,state:ProfessionalWorkState){write(WORK_PREFIX+owner(player),state);void persistActTwoState(player,{professional_work_state:state})}

async function persistActTwoState(player:PlayerProfile,patch:Record<string,unknown>){
 if(!supabase||!player.cloudCareerId)return false;
 const {data,error}=await supabase.from('careers').update(patch).eq('id',player.cloudCareerId).select('id').maybeSingle();
 if(error||!data){console.warn('[Ato 2] Falha ao persistir estado profissional.',error?.message);return false}return true;
}

export async function hydrateActTwoState(player:PlayerProfile){
 if(!supabase||!player.cloudCareerId)return {portfolio:readProfessionalPortfolio(player),work:readProfessionalWorkState(player)};
 const {data,error}=await supabase.from('careers').select('professional_portfolio,professional_work_state').eq('id',player.cloudCareerId).maybeSingle();
 if(error||!data)return {portfolio:readProfessionalPortfolio(player),work:readProfessionalWorkState(player)};
 const portfolio={...emptyPortfolio(),...(data.professional_portfolio||{})} as ProfessionalPortfolioState;
 const work={...emptyWork(),...(data.professional_work_state||{})} as ProfessionalWorkState;
 write(PORTFOLIO_PREFIX+owner(player),portfolio);write(WORK_PREFIX+owner(player),work);return{portfolio,work};
}

export function assignProfessionalMatter(player:PlayerProfile,input:Omit<ProfessionalMatter,'id'|'assignedGameDate'|'clientTrust'>,gameDate:string){
 const state=readProfessionalPortfolio(player);
 if(state.matters.some(m=>m.caseId===input.caseId&&m.status!=='CLOSED'))return state;
 const matter:ProfessionalMatter={...input,id:`matter:${input.caseId}:${gameDate}`,assignedGameDate:gameDate,clientTrust:55};
 const agenda:ProfessionalAgendaTask={id:`deadline:${input.caseId}:${gameDate}`,caseId:input.caseId,title:`Revisar prazo inicial • ${input.title}`,kind:'DEADLINE',dueGameDate:gameDate,dueMinute:17*60,status:'PENDING',critical:true,createdAtGameDate:gameDate};
 const next={...state,matters:[...state.matters,matter].slice(-20),agenda:[...state.agenda,agenda].slice(-80),firstMatterAssigned:true};
 saveProfessionalPortfolio(player,next);return next;
}

export function registerProfessionalArrival(player:PlayerProfile,gameDate:string){
 const state=readProfessionalWorkState(player);if(state.arrivalKeys.includes(gameDate))return state;
 const next:ProfessionalWorkState={...state,arrivalKeys:[...state.arrivalKeys,gameDate].slice(-90)};
 saveProfessionalWorkState(player,next);
 const portfolio=readProfessionalPortfolio(player);
 if(!portfolio.firstProfessionalDayCompleted)saveProfessionalPortfolio(player,{...portfolio,firstProfessionalDayCompleted:true});
 return next;
}

export function professionalDaySummary(player:PlayerProfile){
 const portfolio=readProfessionalPortfolio(player);
 const pending=portfolio.agenda.filter(t=>t.status==='PENDING');
 return {activeMatters:portfolio.matters.filter(m=>m.status!=='CLOSED').length,pendingTasks:pending.length,criticalTasks:pending.filter(t=>t.critical).length,nextTasks:pending.slice().sort((a,b)=>a.dueGameDate.localeCompare(b.dueGameDate)||(a.dueMinute??9999)-(b.dueMinute??9999)).slice(0,5)};
}
