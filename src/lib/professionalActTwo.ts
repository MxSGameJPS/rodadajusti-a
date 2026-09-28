import type { PlayerProfile } from '../types/game';
import { supabase } from './supabase';
import { getAppealOfCaseId, getProceduralStage } from './caseMetadata';
import type { LegalCase } from '../types/game';

export type ProfessionalTaskKind = 'DEADLINE'|'HEARING'|'CLIENT_RETURN'|'MEETING'|'DILIGENCE'|'DOCUMENT';
export type HearingType = 'CONCILIATION'|'INSTRUCTION'|'ORAL_ARGUMENT';
export type HearingPreparation = 'UNPREPARED'|'PARTIAL'|'READY';
export type ClientMood = 'SATISFIED'|'NEUTRAL'|'ANXIOUS'|'UPSET';
export type StrategyDecisionKind = 'NEGOTIATE'|'LITIGATE'|'SETTLE'|'APPEAL'|'WAIT';
export type SpecializationLevel = 'EXPERIENCE'|'SPECIALIST'|'REGIONAL_REFERENCE'|'AUTHORITY';

export interface ProfessionalClientRelationship {
  id:string; clientName:string; trust:number; satisfaction:number; communication:number;
  mood:ClientMood; matterIds:string[]; successfulMatterIds:string[]; referrals:number;
  lastContactGameDate:string|null; notes:string[];
}
export interface ProfessionalHearing {
  id:string; caseId:string; title:string; type:HearingType; gameDate:string; minute:number;
  preparation:HearingPreparation; attended:boolean; result:'PENDING'|'FAVORABLE'|'NEUTRAL'|'UNFAVORABLE';
}
export interface ProfessionalStrategyRecord {
  id:string; caseId:string; gameDate:string; decision:StrategyDecisionKind; thesis:string;
  evidenceIds:string[]; risk:'LOW'|'MEDIUM'|'HIGH'; rationale:string;
}
export interface ProfessionalSpecialization {
  area:string; experiencePoints:number; handledMatters:number; successfulMatters:number;
  studyPoints:number; level:SpecializationLevel;
}
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
  lifecycleStage?:string; predecessorCaseId?:string|null;
}
export interface ProfessionalReputationState { technical:number; internalTrust:number; publicRecognition:number; marketPrestige:number; lastReason:string|null }
export interface ProfessionalNetworkContact { entityId:string; name:string; role:string; trust:number; respect:number; influence:number; opportunities:number; lastInteractionGameDate:string|null }
export interface ProfessionalPortfolioState {
  version:1; matters:ProfessionalMatter[]; agenda:ProfessionalAgendaTask[];
  firstProfessionalDayCompleted:boolean; firstMatterAssigned:boolean;
  clients:ProfessionalClientRelationship[]; hearings:ProfessionalHearing[];
  strategies:ProfessionalStrategyRecord[]; specializations:ProfessionalSpecialization[];
  reputation:ProfessionalReputationState; network:ProfessionalNetworkContact[];
}
export interface ProfessionalWorkState {
  version:1; workdayStartMinute:number; workdayEndMinute:number; weeklyHours:number;
  arrivalKeys:string[]; completedResponsibilityKeys:string[]; missedDeadlineKeys:string[];
}

const PORTFOLIO_PREFIX='rota_act_two_portfolio_v1:';
const WORK_PREFIX='rota_act_two_work_v1:';
const emptyPortfolio=():ProfessionalPortfolioState=>({version:1,matters:[],agenda:[],firstProfessionalDayCompleted:false,firstMatterAssigned:false,clients:[],hearings:[],strategies:[],specializations:[],reputation:{technical:20,internalTrust:20,publicRecognition:5,marketPrestige:10,lastReason:null},network:[]});
const emptyWork=():ProfessionalWorkState=>({version:1,workdayStartMinute:9*60,workdayEndMinute:18*60,weeklyHours:40,arrivalKeys:[],completedResponsibilityKeys:[],missedDeadlineKeys:[]});
const owner=(p:PlayerProfile)=>p.cloudCareerId||p.oabRegistration?.code||p.name||'player';
function read<T>(key:string,fallback:T):T{if(typeof window==='undefined')return fallback;try{const raw=localStorage.getItem(key);return raw?{...fallback,...JSON.parse(raw)}:fallback}catch{return fallback}}
function write(key:string,value:unknown){if(typeof window==='undefined')return;try{localStorage.setItem(key,JSON.stringify(value))}catch{/* cache opcional */}}

function normalizePortfolio(value:Partial<ProfessionalPortfolioState>|null|undefined):ProfessionalPortfolioState {
 const base=emptyPortfolio(); return {...base,...(value||{}),matters:Array.isArray(value?.matters)?value!.matters:[],agenda:Array.isArray(value?.agenda)?value!.agenda:[],clients:Array.isArray(value?.clients)?value!.clients:[],hearings:Array.isArray(value?.hearings)?value!.hearings:[],strategies:Array.isArray(value?.strategies)?value!.strategies:[],specializations:Array.isArray(value?.specializations)?value!.specializations:[],reputation:{...base.reputation,...(value?.reputation||{})},network:Array.isArray(value?.network)?value!.network:[]};
}
export function readProfessionalPortfolio(player:PlayerProfile){return normalizePortfolio(read(PORTFOLIO_PREFIX+owner(player),emptyPortfolio()))}
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
 const portfolio=normalizePortfolio(data.professional_portfolio as Partial<ProfessionalPortfolioState>);
 const work={...emptyWork(),...(data.professional_work_state||{})} as ProfessionalWorkState;
 write(PORTFOLIO_PREFIX+owner(player),portfolio);write(WORK_PREFIX+owner(player),work);return{portfolio,work};
}

export function assignProfessionalMatter(player:PlayerProfile,input:Omit<ProfessionalMatter,'id'|'assignedGameDate'|'clientTrust'>,gameDate:string){
 const state=readProfessionalPortfolio(player);
 if(state.matters.some(m=>m.caseId===input.caseId&&m.status!=='CLOSED'))return state;
 const matter:ProfessionalMatter={...input,id:`matter:${input.caseId}:${gameDate}`,assignedGameDate:gameDate,clientTrust:55};
 const agenda:ProfessionalAgendaTask={id:`deadline:${input.caseId}:${gameDate}`,caseId:input.caseId,title:`Revisar prazo inicial • ${input.title}`,kind:'DEADLINE',dueGameDate:gameDate,dueMinute:17*60,status:'PENDING',critical:true,createdAtGameDate:gameDate};
 const existingClient=state.clients.find(client=>client.clientName===input.clientName);
 const clientId=existingClient?.id||`client:${input.clientName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;
 const client:ProfessionalClientRelationship=existingClient?{...existingClient,matterIds:Array.from(new Set([...existingClient.matterIds,matter.id])),mood:existingClient.trust<40?'ANXIOUS':existingClient.mood}:{id:clientId,clientName:input.clientName,trust:55,satisfaction:55,communication:50,mood:'NEUTRAL',matterIds:[matter.id],successfulMatterIds:[],referrals:0,lastContactGameDate:null,notes:['Relacionamento iniciado com a distribuição do processo.']};
 const clients=[...state.clients.filter(item=>item.id!==client.id),client];
 const existingSpec=state.specializations.find(spec=>spec.area===input.area);
 const spec=existingSpec?{...existingSpec,handledMatters:existingSpec.handledMatters+1,experiencePoints:existingSpec.experiencePoints+12}:{area:input.area,experiencePoints:12,handledMatters:1,successfulMatters:0,studyPoints:0,level:'EXPERIENCE' as SpecializationLevel};
 const specializations=[...state.specializations.filter(item=>item.area!==input.area),withSpecializationLevel(spec)];
 const next={...state,matters:[...state.matters,matter].slice(-20),agenda:[...state.agenda,agenda].slice(-80),clients,specializations,firstMatterAssigned:true};
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

function withSpecializationLevel(spec:ProfessionalSpecialization):ProfessionalSpecialization {
 const score=spec.experiencePoints+spec.studyPoints+spec.successfulMatters*15;
 const level:SpecializationLevel=score>=320?'AUTHORITY':score>=180?'REGIONAL_REFERENCE':score>=80?'SPECIALIST':'EXPERIENCE';
 return {...spec,level};
}

export function recordClientContact(player:PlayerProfile,clientId:string,gameDate:string,quality:'GOOD'|'NEUTRAL'|'POOR'='GOOD'){
 const state=readProfessionalPortfolio(player); const current=state.clients.find(client=>client.id===clientId); if(!current)return state;
 const delta=quality==='GOOD'?8:quality==='POOR'?-10:2;
 const client={...current,lastContactGameDate:gameDate,communication:Math.max(0,Math.min(100,current.communication+delta)),trust:Math.max(0,Math.min(100,current.trust+Math.round(delta/2))),mood:quality==='POOR'?'UPSET':quality==='GOOD'?'SATISFIED':current.mood} as ProfessionalClientRelationship;
 const next={...state,clients:state.clients.map(item=>item.id===clientId?client:item)};saveProfessionalPortfolio(player,next);return next;
}

export function scheduleProfessionalHearing(player:PlayerProfile,input:Omit<ProfessionalHearing,'id'|'preparation'|'attended'|'result'>){
 const state=readProfessionalPortfolio(player); if(state.hearings.some(item=>item.caseId===input.caseId&&item.gameDate===input.gameDate&&item.type===input.type))return state;
 const hearing:ProfessionalHearing={...input,id:`hearing:${input.caseId}:${input.gameDate}:${input.type}`,preparation:'UNPREPARED',attended:false,result:'PENDING'};
 const task:ProfessionalAgendaTask={id:`agenda:${hearing.id}`,caseId:input.caseId,title:`Audiência • ${input.title}`,kind:'HEARING',dueGameDate:input.gameDate,dueMinute:input.minute,status:'PENDING',critical:true,createdAtGameDate:input.gameDate};
 const next={...state,hearings:[...state.hearings,hearing],agenda:[...state.agenda,task]};saveProfessionalPortfolio(player,next);return next;
}

export function prepareProfessionalHearing(player:PlayerProfile,hearingId:string){
 const state=readProfessionalPortfolio(player); const hearing=state.hearings.find(item=>item.id===hearingId); if(!hearing||hearing.attended)return state;
 const preparation:HearingPreparation=hearing.preparation==='UNPREPARED'?'PARTIAL':'READY';
 const next={...state,hearings:state.hearings.map(item=>item.id===hearingId?{...item,preparation}:item)};saveProfessionalPortfolio(player,next);return next;
}

export function recordProfessionalStrategy(player:PlayerProfile,input:Omit<ProfessionalStrategyRecord,'id'>){
 const state=readProfessionalPortfolio(player); const record:ProfessionalStrategyRecord={...input,id:`strategy:${input.caseId}:${input.gameDate}:${state.strategies.length+1}`};
 const next={...state,strategies:[...state.strategies,record].slice(-120),matters:state.matters.map(m=>m.caseId===input.caseId?{...m,nextAction:input.decision==='APPEAL'?'Preparar e protocolar recurso':'Executar estratégia definida'}:m)};saveProfessionalPortfolio(player,next);return next;
}

export function updateMatterLifecycle(player:PlayerProfile,caseId:string,stage:string,nextAction:string,status:ProfessionalMatter['status']='ACTIVE'){
 const state=readProfessionalPortfolio(player); const next={...state,matters:state.matters.map(m=>m.caseId===caseId?{...m,lifecycleStage:stage,nextAction,status}:m)};saveProfessionalPortfolio(player,next);return next;
}

export function recordProfessionalMatterOutcome(player:PlayerProfile,caseId:string,success:boolean){
 const state=readProfessionalPortfolio(player); const matter=state.matters.find(item=>item.caseId===caseId); if(!matter)return state;
 const clients=state.clients.map(client=>client.matterIds.includes(matter.id)?{...client,trust:Math.max(0,Math.min(100,client.trust+(success?10:-8))),satisfaction:Math.max(0,Math.min(100,client.satisfaction+(success?12:-10))),mood:success?'SATISFIED':'ANXIOUS' as ClientMood,successfulMatterIds:success?Array.from(new Set([...client.successfulMatterIds,matter.id])):client.successfulMatterIds}:client);
 const specializations=state.specializations.map(spec=>spec.area===matter.area?withSpecializationLevel({...spec,experiencePoints:spec.experiencePoints+(success?25:12),successfulMatters:spec.successfulMatters+(success?1:0)}):spec);
 const rep=state.reputation;
 const reputation={technical:clamp100(rep.technical+(success?4:1)),internalTrust:clamp100(rep.internalTrust+(success?3:-3)),publicRecognition:clamp100(rep.publicRecognition+(success?2:0)),marketPrestige:clamp100(rep.marketPrestige+(success?2:-1)),lastReason:success?'Resultado profissional favorável':'Resultado profissional desfavorável'};
 const next={...state,clients,specializations,reputation,matters:state.matters.map(item=>item.id===matter.id?{...item,status:'CLOSED' as const,nextAction:'Processo encerrado'}:item)};saveProfessionalPortfolio(player,next);return next;
}

export function addSpecializationStudy(player:PlayerProfile,area:string,points=10){
 const state=readProfessionalPortfolio(player); const current=state.specializations.find(spec=>spec.area===area)||{area,experiencePoints:0,handledMatters:0,successfulMatters:0,studyPoints:0,level:'EXPERIENCE' as SpecializationLevel};
 const updated=withSpecializationLevel({...current,studyPoints:current.studyPoints+Math.max(0,points)});
 const next={...state,specializations:[...state.specializations.filter(spec=>spec.area!==area),updated]};saveProfessionalPortfolio(player,next);return next;
}

export function assignLongRunningProfessionalMatter(player:PlayerProfile,caseItem:LegalCase,gameDate:string){
 const predecessorCaseId=getAppealOfCaseId(caseItem);
 const state=assignProfessionalMatter(player,{caseId:caseItem.id,title:caseItem.title,clientName:caseItem.client.name,area:caseItem.area,status:predecessorCaseId?'APPEAL':'ACTIVE',responsibility:'LEAD',nextAction:predecessorCaseId?'Revisar decisão anterior e preparar recurso':'Analisar dossiê e definir estratégia',officePriority:caseItem.difficultyStars>=4?'URGENT':caseItem.difficultyStars>=3?'IMPORTANT':'NORMAL',lifecycleStage:getProceduralStage(caseItem),predecessorCaseId},gameDate);
 if(!predecessorCaseId)return state;
 const predecessor=state.matters.find(m=>m.caseId===predecessorCaseId);
 if(!predecessor)return state;
 const next={...state,matters:state.matters.map(m=>m.caseId===predecessorCaseId?{...m,status:'APPEAL' as const,nextAction:`Processo prossegue em ${getProceduralStage(caseItem)}`}:m)};
 saveProfessionalPortfolio(player,next);return next;
}

const clamp100=(value:number)=>Math.max(0,Math.min(100,Math.round(value)));
export function applyProfessionalReputation(player:PlayerProfile,delta:Partial<Omit<ProfessionalReputationState,'lastReason'>>,reason:string){
 const state=readProfessionalPortfolio(player),r=state.reputation;
 const reputation={technical:clamp100(r.technical+(delta.technical||0)),internalTrust:clamp100(r.internalTrust+(delta.internalTrust||0)),publicRecognition:clamp100(r.publicRecognition+(delta.publicRecognition||0)),marketPrestige:clamp100(r.marketPrestige+(delta.marketPrestige||0)),lastReason:reason};
 const next={...state,reputation};saveProfessionalPortfolio(player,next);return next;
}
export function recordProfessionalNetworkInteraction(player:PlayerProfile,input:{entityId:string;name:string;role:string;gameDate:string;trustDelta?:number;respectDelta?:number;influenceDelta?:number;opportunity?:boolean}){
 const state=readProfessionalPortfolio(player),current=state.network.find(item=>item.entityId===input.entityId)||{entityId:input.entityId,name:input.name,role:input.role,trust:20,respect:20,influence:10,opportunities:0,lastInteractionGameDate:null};
 const contact={...current,name:input.name,role:input.role,trust:clamp100(current.trust+(input.trustDelta||0)),respect:clamp100(current.respect+(input.respectDelta||0)),influence:clamp100(current.influence+(input.influenceDelta||0)),opportunities:current.opportunities+(input.opportunity?1:0),lastInteractionGameDate:input.gameDate};
 const next={...state,network:[...state.network.filter(item=>item.entityId!==input.entityId),contact]};saveProfessionalPortfolio(player,next);return next;
}
export function professionalMarketScore(player:PlayerProfile){
 const state=readProfessionalPortfolio(player),topSpec=state.specializations.reduce((best,spec)=>Math.max(best,spec.experiencePoints+spec.studyPoints+spec.successfulMatters*15),0);
 return Math.round(state.reputation.technical*.3+state.reputation.internalTrust*.2+state.reputation.publicRecognition*.15+state.reputation.marketPrestige*.2+Math.min(100,topSpec)*.15);
}

export interface ProfessionalConductRisk { band:'LOW'|'WATCH'|'HIGH'|'CRITICAL'; score:number; reasons:string[] }
export function getProfessionalConductRisk(player:PlayerProfile,ethics:number,exposure:number):ProfessionalConductRisk {
 const state=readProfessionalPortfolio(player),reasons:string[]=[];
 const unhappy=state.clients.filter(client=>client.trust<35||client.satisfaction<30).length;
 const score=clamp100(exposure*.55+(100-ethics)*.3+(100-state.reputation.internalTrust)*.15+unhappy*5);
 if(exposure>=60) reasons.push('Exposição profissional elevada.');
 if(ethics<45) reasons.push('Histórico ético fragilizado.');
 if(state.reputation.internalTrust<35) reasons.push('Confiança interna baixa.');
 if(unhappy) reasons.push('Existem clientes com confiança crítica.');
 return{band:score>=80?'CRITICAL':score>=60?'HIGH':score>=35?'WATCH':'LOW',score,reasons};
}
export function applyConductReputationImpact(player:PlayerProfile,ethics:number,exposure:number,reason:string){
 const risk=getProfessionalConductRisk(player,ethics,exposure);
 const penalty=risk.band==='CRITICAL'?-12:risk.band==='HIGH'?-7:risk.band==='WATCH'?-3:0;
 if(penalty) applyProfessionalReputation(player,{internalTrust:penalty,marketPrestige:penalty,publicRecognition:Math.ceil(penalty/2)},reason);
 return risk;
}
