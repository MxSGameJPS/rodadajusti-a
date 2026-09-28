import type { CareerTierId, PlayerProfile } from '../types/game';
import { getLegalReputationSnapshot } from './professionalActTwo';
import { readAcademicCareer } from './academicCareer';
import { readPublicService } from './publicServiceCareer';
import { supabase } from './supabase';

export type ApexAppointmentKind = 'STF' | 'STJ' | 'PGR' | 'JUSTICE_MINISTER';
export interface ApexAppointment {
  id: string; kind: ApexAppointmentKind; title: string; stage: 'INVITED' | 'SENATE' | 'APPOINTED' | 'DECLINED';
  month: string; requirements: string[];
}
export interface ApexCareerState { activeAppointment: ApexAppointment | null; history: ApexAppointment[]; processedKeys: string[]; }
const PREFIX='rota_apex_career_v1:';
const base=():ApexCareerState=>({activeAppointment:null,history:[],processedKeys:[]});
const owner=(p:PlayerProfile)=>p.cloudCareerId||p.name;
const month=(p:PlayerProfile)=>p.gameCurrentYear+'-'+String(p.gameCurrentMonth).padStart(2,'0');
export function readApexCareer(p:PlayerProfile){let s=base();try{s={...s,...JSON.parse(localStorage.getItem(PREFIX+owner(p))||'{}')}}catch{}return s}
function cache(p:PlayerProfile,s:ApexCareerState){try{localStorage.setItem(PREFIX+owner(p),JSON.stringify(s))}catch{}}
async function persist(p:PlayerProfile,s:ApexCareerState,tier?:CareerTierId){cache(p,s);if(supabase&&p.cloudCareerId){const patch:Record<string,unknown>={apex_career_state:s,last_played_at:new Date().toISOString()};if(tier)patch.career_stage=tier;const{error}=await supabase.from('careers').update(patch).eq('id',p.cloudCareerId);if(error)throw error}}
export async function hydrateApexCareer(p:PlayerProfile){if(supabase&&p.cloudCareerId){const{data}=await supabase.from('careers').select('apex_career_state').eq('id',p.cloudCareerId).maybeSingle();if(data?.apex_career_state){const s={...base(),...data.apex_career_state};cache(p,s);return s}}return readApexCareer(p)}
export async function rollApexAppointment(p:PlayerProfile){const s=readApexCareer(p),m=month(p);if(s.activeAppointment||s.processedKeys.includes(m))return s;const rep=getLegalReputationSnapshot(p),academic=readAcademicCareer(p),service=readPublicService(p);const avg=Math.round((rep.technical+rep.institutionalRespect+rep.publicRecognition)/3);const eligible:Omit<ApexAppointment,'id'|'stage'|'month'>[]=[];
 if(p.careerTier==='DESEMBARGADOR'&&service.monthsInRole>=60&&avg>=88&&academic.masterLevel>=3)eligible.push({kind:'STJ',title:'Possível indicação para Tribunal Superior',requirements:['Trajetória de segundo grau','Alta reputação institucional','Processo constitucional de escolha']});
 if((p.careerTier==='DESEMBARGADOR'||p.careerTier==='PROCURADOR_JUSTICA')&&service.monthsInRole>=96&&avg>=94&&academic.doctorateLevel>=2)eligible.push({kind:'STF',title:'Consulta para possível indicação ao Supremo',requirements:['Notável trajetória jurídica no jogo','Reputação institucional excepcional','Aprovação no processo de nomeação']});
 if(p.careerTier==='PROCURADOR_JUSTICA'&&service.monthsInRole>=72&&avg>=90)eligible.push({kind:'PGR',title:'Consulta para chefia do Ministério Público da União',requirements:['Trajetória ministerial avançada','Reputação institucional','Processo de nomeação e aprovação']});
 if(['ADVOGADO_SENIOR','SOCIO_ESCRITORIO','DONO_ESCRITORIO','DESEMBARGADOR','PROCURADOR_JUSTICA'].includes(p.careerTier)&&avg>=82)eligible.push({kind:'JUSTICE_MINISTER',title:'Convite para função política de Ministro da Justiça',requirements:['Reconhecimento jurídico elevado','Convite político institucional','Função temporária, não promoção de carreira']});
 const seed=(p.gameCurrentYear*101+p.gameCurrentMonth*17+p.name.length*7)%100;const next={...s,processedKeys:[...s.processedKeys,m].slice(-120)};if(!eligible.length||seed>=12){await persist(p,next);return next}const pick=eligible[seed%eligible.length];next.activeAppointment={...pick,id:pick.kind+':'+m,stage:'INVITED',month:m};await persist(p,next);return next}
export async function answerApexAppointment(p:PlayerProfile,accept:boolean){const s=readApexCareer(p),a=s.activeAppointment;if(!a)return{ok:false as const};if(!accept){const declined={...a,stage:'DECLINED' as const};const next={...s,activeAppointment:null,history:[declined,...s.history].slice(0,40)};await persist(p,next);return{ok:true as const,state:next,appointed:false as const}}const approvedSeed=(p.reputation+p.gameCurrentMonth*11+p.gameCurrentYear)%100;const senateRequired=a.kind==='STF'||a.kind==='STJ'||a.kind==='PGR';const approved=!senateRequired||approvedSeed>=30;if(!approved){const failed={...a,stage:'SENATE' as const};const next={...s,activeAppointment:null,history:[failed,...s.history].slice(0,40)};await persist(p,next);return{ok:true as const,state:next,appointed:false as const}}const appointed={...a,stage:'APPOINTED' as const};const next={...s,activeAppointment:null,history:[appointed,...s.history].slice(0,40)};const tier=a.kind==='STF'?'MINISTRO_STF' as CareerTierId:undefined;await persist(p,next,tier);return{ok:true as const,state:next,appointed:true as const,tier,kind:a.kind}}
