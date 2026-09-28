import type { PlayerProfile } from '../types/game';
import { supabase } from './supabase';
import { readOfficeBusiness, type OfficeStaff, type OfficeStaffRole } from './officeBusiness';

export interface OfficeCaseAssignment {id:string;caseId:string;staffId:string|null;status:'ASSIGNED'|'IN_PROGRESS'|'REVIEW'|'COMPLETED'|'FAILED'|'CANCELLED';workloadPoints:number;qualityScore:number|null;riskScore:number;assignedGameDate:string;dueGameDate:string|null;outcome:string|null}
const day=(p:PlayerProfile)=>`${p.gameCurrentYear}-${String(p.gameCurrentMonth).padStart(2,'0')}-${String(p.gameCurrentDay).padStart(2,'0')}`;
const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
const maxLoad=(role:OfficeStaffRole)=>({INTERN:35,ASSISTANT:30,JUNIOR_LAWYER:55,MID_LAWYER:70,SENIOR_LAWYER:85}[role]);
export function staffCapacity(s:OfficeStaff){return Math.max(0,maxLoad(s.roleType)-(s.workload||0))}
export function staffPerformance(s:OfficeStaff){return clamp(s.technicalSkill*.4+s.productivity*.3+s.clientSkill*.1+(s.morale??70)*.1+s.loyalty*.1)}
export async function loadOfficeAssignments(p:PlayerProfile):Promise<OfficeCaseAssignment[]>{
 const office=readOfficeBusiness(p);if(!supabase||!office.id)return[];const {data}=await supabase.from('player_office_case_assignments').select('*').eq('office_business_id',office.id).in('status',['ASSIGNED','IN_PROGRESS','REVIEW']);
 return (data||[]).map((x:any)=>({id:x.id,caseId:x.case_id,staffId:x.staff_id,status:x.status,workloadPoints:x.workload_points,qualityScore:x.quality_score,riskScore:x.risk_score,assignedGameDate:x.assigned_game_date,dueGameDate:x.due_game_date,outcome:x.outcome}));
}
export async function delegateCase(p:PlayerProfile,caseId:string,staffId:string,complexity=50){
 const office=readOfficeBusiness(p);const staff=office.staff.find(x=>x.id===staffId);if(!supabase||!office.id||!p.cloudCareerId||!staff)return{ok:false as const,reason:'NOT_FOUND' as const};
 if(staff.roleType==='ASSISTANT')return{ok:false as const,reason:'ROLE' as const};const points=Math.max(10,Math.min(40,Math.round(complexity/3)));if(staffCapacity(staff)<points)return{ok:false as const,reason:'OVERLOAD' as const};
 const performance=staffPerformance(staff);const risk=clamp(complexity-performance+(staff.roleType==='INTERN'?18:0));const quality=clamp(performance-complexity*.2+15);
 const {data,error}=await supabase.from('player_office_case_assignments').insert({office_business_id:office.id,case_id:caseId,staff_id:staffId,supervisor_career_id:p.cloudCareerId,status:'IN_PROGRESS',workload_points:points,quality_score:quality,risk_score:risk,assigned_game_date:day(p)}).select('id').single();if(error)return{ok:false as const,reason:'DB' as const};
 await supabase.from('player_office_staff').update({workload:(staff.workload||0)+points,morale:clamp((staff.morale??70)-(risk>55?4:0))}).eq('id',staff.id);
 return{ok:true as const,id:data.id,quality,risk};
}
export async function reviewDelegatedCase(p:PlayerProfile,a:OfficeCaseAssignment,approve:boolean){
 const office=readOfficeBusiness(p);const staff=office.staff.find(x=>x.id===a.staffId);if(!supabase||!office.id||!staff)return{ok:false as const};
 const success=approve&&(a.qualityScore||0)>=Math.max(25,a.riskScore-10);const status=success?'COMPLETED':'FAILED';await supabase.from('player_office_case_assignments').update({status,outcome:success?'APPROVED':'ERROR',resolved_game_date:day(p)}).eq('id',a.id).eq('office_business_id',office.id);
 const xp=success?6:2;await supabase.from('player_office_staff').update({workload:Math.max(0,(staff.workload||0)-a.workloadPoints),experience:(staff.experience||0)+xp,technical_skill:clamp(staff.technicalSkill+(success?1:0)),morale:clamp((staff.morale??70)+(success?2:-6)),loyalty:clamp(staff.loyalty+(approve?1:-2))}).eq('id',staff.id);
 return{ok:true as const,success};
}
const promotion:Partial<Record<OfficeStaffRole,{role:OfficeStaffRole;salary:number}>>={INTERN:{role:'JUNIOR_LAWYER',salary:3800},JUNIOR_LAWYER:{role:'MID_LAWYER',salary:5600},MID_LAWYER:{role:'SENIOR_LAWYER',salary:8200}};
export async function promoteOfficeStaff(p:PlayerProfile,staffId:string){
 const office=readOfficeBusiness(p);const staff=office.staff.find(x=>x.id===staffId);if(!supabase||!staff)return{ok:false as const,reason:'NOT_FOUND' as const};const next=promotion[staff.roleType];if(!next)return{ok:false as const,reason:'MAX' as const};if((staff.experience||0)<20)return{ok:false as const,reason:'EXPERIENCE' as const};if(staff.roleType==='INTERN'&&staff.oabStatus!=='APPROVED')return{ok:false as const,reason:'OAB' as const};
 await supabase.from('player_office_staff').update({role_type:next.role,salary_monthly_jr:Math.max(staff.salaryMonthly,next.salary),morale:clamp((staff.morale??70)+10),loyalty:clamp(staff.loyalty+8)}).eq('id',staffId);return{ok:true as const};
}
export async function advanceInternDevelopment(p:PlayerProfile,staffId:string){
 const office=readOfficeBusiness(p);const staff=office.staff.find(x=>x.id===staffId);if(!supabase||!staff||staff.roleType!=='INTERN')return{ok:false as const};const semester=Math.min(10,(staff.semester||7)+1);const oab=semester>=10&&staff.technicalSkill>=55?'ELIGIBLE':'STUDYING';await supabase.from('player_office_staff').update({semester,oab_status:oab,experience:(staff.experience||0)+5,technical_skill:clamp(staff.technicalSkill+3)}).eq('id',staffId);return{ok:true as const,semester,oabStatus:oab};
}
export async function attemptInternOab(p:PlayerProfile,staffId:string){
 const office=readOfficeBusiness(p);const staff=office.staff.find(x=>x.id===staffId);if(!supabase||!staff||staff.roleType!=='INTERN'||staff.oabStatus!=='ELIGIBLE')return{ok:false as const};const seed=(p.gameCurrentYear*10000+p.gameCurrentMonth*100+p.gameCurrentDay+staff.technicalSkill*17)%100;const passed=seed<Math.min(90,staff.technicalSkill+15);await supabase.from('player_office_staff').update({oab_status:passed?'APPROVED':'ELIGIBLE',morale:clamp((staff.morale??70)+(passed?8:-4))}).eq('id',staffId);return{ok:true as const,passed};
}