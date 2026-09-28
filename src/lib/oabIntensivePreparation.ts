import type { PlayerProfile } from '../types/game';

export type OabStudyArea='ETHICS'|'CONSTITUTIONAL'|'CIVIL'|'CRIMINAL'|'LABOR'|'ADMINISTRATIVE';
export interface OabStudySession{ id:string; area:OabStudyArea; gameDate:string; minutes:number; gain:number }
export interface OabMockResult{ id:string; gameDate:string; mode:'QUICK'|'FULL'; questions:number; correct:number; score:number }
export interface OabPreparationState{
 unlocked:boolean; unlockedGameDate?:string; studyPoints:Record<OabStudyArea,number>;
 sessions:OabStudySession[]; mocks:OabMockResult[]; intensiveDays:number;
 finalExamUnlocked?:boolean; finalExamAttempts?:number; actOneCompleted?:boolean; actOneCompletedGameDate?:string;
}
export const OAB_AREAS:Record<OabStudyArea,{label:string;minutes:number}>={
 ETHICS:{label:'Etica Profissional',minutes:45},CONSTITUTIONAL:{label:'Direito Constitucional',minutes:55},
 CIVIL:{label:'Direito Civil',minutes:55},CRIMINAL:{label:'Direito Penal',minutes:55},
 LABOR:{label:'Direito do Trabalho',minutes:50},ADMINISTRATIVE:{label:'Direito Administrativo',minutes:50},
};
export function emptyOabPreparation():OabPreparationState{return{unlocked:false,studyPoints:{ETHICS:0,CONSTITUTIONAL:0,CIVIL:0,CRIMINAL:0,LABOR:0,ADMINISTRATIVE:0},sessions:[],mocks:[],intensiveDays:0,finalExamUnlocked:false,finalExamAttempts:0,actOneCompleted:false}}
export function unlockOabPreparation(state:OabPreparationState,gameDate:string){return state.unlocked?state:{...state,unlocked:true,unlockedGameDate:gameDate}}
export function completeOabStudy(state:OabPreparationState,area:OabStudyArea,gameDate:string){
 const cfg=OAB_AREAS[area],current=state.studyPoints[area]||0;
 const today=state.sessions.filter((session)=>session.gameDate===gameDate);
 const repeated=today.filter((session)=>session.area===area).length;
 if(repeated>=2)return state;
 const gain=Math.max(2,10-Math.floor(current/20)-repeated*3);
 const distinctDays=new Set([...state.sessions.map((session)=>session.gameDate),gameDate]).size;
 return {...state,studyPoints:{...state.studyPoints,[area]:Math.min(100,current+gain)},sessions:[...state.sessions,{id:`${area}:${gameDate}:${state.sessions.length}`,area,gameDate,minutes:cfg.minutes,gain}].slice(-120),intensiveDays:distinctDays};
}
export function recordOabMock(state:OabPreparationState,result:Omit<OabMockResult,'id'>){
 return {...state,mocks:[...state.mocks,{...result,id:`${result.mode}:${result.gameDate}:${state.mocks.length}`}].slice(-30)};
}
export function oabReadiness(state:OabPreparationState,player:PlayerProfile){
 const values=Object.values(state.studyPoints);const knowledge=values.reduce((a,b)=>a+b,0)/values.length;
 const latest=state.mocks[state.mocks.length-1];const mock=latest?.score||0;
 const discipline=Math.min(100,Math.max(state.intensiveDays||0,new Set(state.sessions.map((session)=>session.gameDate)).size)*14);
 const readiness=Math.round(knowledge*.5+mock*.35+discipline*.15);
 return {readiness,knowledge:Math.round(knowledge),mock,discipline,ready:state.unlocked&&readiness>=65&&state.sessions.length>=6&&new Set(state.sessions.map((session)=>session.gameDate)).size>=3&&Boolean(latest)};
}

export function unlockFinalOabExam(state:OabPreparationState,player:PlayerProfile){return oabReadiness(state,player).ready?{...state,finalExamUnlocked:true}:state}
export function recordFinalOabExam(state:OabPreparationState,passed:boolean,gameDate:string){
 return {...state,finalExamAttempts:(state.finalExamAttempts||0)+1,actOneCompleted:passed?true:state.actOneCompleted,actOneCompletedGameDate:passed?gameDate:state.actOneCompletedGameDate};
}
