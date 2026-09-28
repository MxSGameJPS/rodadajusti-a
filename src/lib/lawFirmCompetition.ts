import type { PlayerProfile } from '../types/game';
import { supabase } from './supabase';
import { getLegalReputationSnapshot } from './professionalActTwo';
import { readOfficeBusiness } from './officeBusiness';

export interface FirmCompetition {lawFirmId:string;name:string;ownershipType:'NPC'|'PLAYER';prestige:number;publicReputation:number;clientStrength:number;talentStrength:number;financialStrength:number;caseload:number;wins:number;losses:number;growthScore:number;momentum:number;lastEvent:string|null}
const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const month=(p:PlayerProfile)=>`${p.gameCurrentYear}-${String(p.gameCurrentMonth).padStart(2,'0')}`;
export async function loadFirmCompetition():Promise<FirmCompetition[]>{
 if(!supabase)return[];const {data:firms}=await supabase.from('law_firms').select('id,name,ownership_type,prestige,public_reputation').eq('status','published').eq('is_active',true);if(!firms)return[];
 const {data:sim}=await supabase.from('law_firm_market_simulation').select('*');const by=new Map((sim||[]).map((x:any)=>[x.law_firm_id,x]));
 return firms.map((f:any)=>{const s:any=by.get(f.id);return{lawFirmId:f.id,name:f.name,ownershipType:f.ownership_type||'NPC',prestige:f.prestige||0,publicReputation:f.public_reputation||0,clientStrength:s?.client_strength??30,talentStrength:s?.talent_strength??30,financialStrength:s?.financial_strength??30,caseload:s?.caseload??0,wins:s?.wins??0,losses:s?.losses??0,growthScore:s?.growth_score??0,momentum:s?.momentum??0,lastEvent:s?.last_event??null}});
}
export async function simulateFirmMarketMonth(p:PlayerProfile){
 if(!supabase)return{ok:false as const,reason:'CLOUD' as const};const m=month(p);const firms=await loadFirmCompetition();const office=readOfficeBusiness(p);const rep=getLegalReputationSnapshot(p);const events:string[]=[];
 for(const firm of firms){const seed=hash(`${m}:${firm.lawFirmId}`);let client=firm.clientStrength,talent=firm.talentStrength,financial=firm.financialStrength,caseload=firm.caseload,wins=firm.wins,losses=firm.losses,momentum=firm.momentum;
  if(firm.ownershipType==='PLAYER'&&firm.lawFirmId===office.lawFirmId){client=clamp(rep.clientReputation*.45+rep.publicRecognition*.25+firm.prestige*.3);talent=clamp(office.staff.length*8+(office.staff.reduce((n,s)=>n+s.loyalty,0)/(office.staff.length||1))*.45);financial=clamp(Math.log10(Math.max(1,office.bankBalance)+1)*20);caseload=Math.max(caseload,p.history.filter(x=>x.success).slice(-12).length)}
  else{const swing=(seed%13)-6;client=clamp(client+swing+Math.round(firm.publicReputation/25));talent=clamp(talent+((seed>>>4)%9)-4);financial=clamp(financial+((seed>>>8)%11)-5);const newCases=Math.max(0,Math.round((client+firm.prestige)/28)+((seed>>>12)%3)-1);caseload+=newCases;const resolved=Math.min(caseload,(seed>>>16)%4);const won=Math.min(resolved,Math.round(resolved*(.35+(firm.prestige+client)/400)));wins+=won;losses+=resolved-won;caseload-=resolved}
  const growth=clamp(client*.3+talent*.2+financial*.2+firm.prestige*.2+Math.max(0,momentum)*.1);const nextMomentum=Math.max(-20,Math.min(20,Math.round((growth-50)/5)));const event=nextMomentum>=5?'Escritório ganhou espaço no mercado.':nextMomentum<=-5?'Escritório perdeu força competitiva.':'Posição de mercado estável.';
  const payload={law_firm_id:firm.lawFirmId,simulated_game_month:m,client_strength:client,talent_strength:talent,financial_strength:financial,caseload,wins,losses,growth_score:growth,momentum:nextMomentum,last_event:event};
  await supabase.from('law_firm_market_simulation').upsert(payload,{onConflict:'law_firm_id'});const source=`monthly:${m}`;await supabase.from('law_firm_market_events').upsert({game_month:m,law_firm_id:firm.lawFirmId,event_type:nextMomentum>=5?'GROWTH':nextMomentum<=-5?'DECLINE':'STABLE',impact:nextMomentum,description:event,source_key:source},{onConflict:'law_firm_id,source_key'});events.push(`${firm.name}: ${event}`);
 }
 return{ok:true as const,month:m,events};
}
export function competitionScore(f:FirmCompetition){return clamp(f.clientStrength*.3+f.talentStrength*.2+f.financialStrength*.2+f.prestige*.2+Math.max(0,f.momentum)*.1)}
