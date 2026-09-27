import type { PlayerProfile } from '../types/game';
import { getProfessionalOwnerKey } from './professionalRpg';

export type RelationshipEntityType = 'NPC' | 'ESTABLISHMENT' | 'ORGANIZATION';
export type RelationshipBond =
  | 'UNKNOWN' | 'ACQUAINTANCE' | 'FRIEND' | 'CLOSE_FRIEND'
  | 'CASUAL_ROMANTIC' | 'CASUAL_INTIMATE' | 'DATING' | 'PARTNER'
  | 'MARRIED' | 'EX_PARTNER' | 'RIVAL' | 'ENEMY'
  | 'PROFESSIONAL' | 'CLIENT' | 'FREQUENT_CUSTOMER';

export interface RelationshipDimensions {
  affinity:number; trust:number; intimacy:number; attraction:number;
  romance:number; commitment:number; conflict:number;
  professionalRespect:number; professionalTrust:number; rivalry:number;
  institutionalReputation:number; loyalty:number;
}
export type RelationshipDimension = keyof RelationshipDimensions;
export type RelationshipMemoryScope = 'PRIVATE'|'SOCIAL_CIRCLE'|'WORKPLACE'|'PROFESSIONAL_COMMUNITY'|'CITY'|'REGIONAL'|'NATIONAL';
export interface RelationshipMemory {
  id:string; kind:string; title:string; description:string; gameDate:string;
  intensity:number; scope:RelationshipMemoryScope; dimensions:Partial<RelationshipDimensions>;
}
export interface RelationshipRecord {
  entityId:string; entityType:RelationshipEntityType; name:string; role?:string;
  adultOnly:boolean; bonds:RelationshipBond[]; dimensions:RelationshipDimensions;
  memories:RelationshipMemory[]; interactionCount:number; lastInteractionDate?:string;
}
export interface RelationshipEngineState { version:1; records:Record<string,RelationshipRecord>; }

const PREFIX='rota_relationship_engine_v1:';
const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
export const DEFAULT_RELATIONSHIP_DIMENSIONS:RelationshipDimensions={
  affinity:20,trust:15,intimacy:0,attraction:0,romance:0,commitment:0,conflict:0,
  professionalRespect:10,professionalTrust:10,rivalry:0,institutionalReputation:10,loyalty:5,
};
function key(player:Pick<PlayerProfile,'cloudCareerId'|'name'|'oabRegistration'>){return PREFIX+getProfessionalOwnerKey(player);}
export function readRelationshipEngine(player:Pick<PlayerProfile,'cloudCareerId'|'name'|'oabRegistration'>):RelationshipEngineState{
  try{const raw=localStorage.getItem(key(player)); if(!raw)return{version:1,records:{}}; const parsed=JSON.parse(raw); return{version:1,records:parsed?.records||{}};}catch{return{version:1,records:{}}}
}
export function saveRelationshipEngine(player:Pick<PlayerProfile,'cloudCareerId'|'name'|'oabRegistration'>,state:RelationshipEngineState){
  try{localStorage.setItem(key(player),JSON.stringify(state)); window.dispatchEvent(new CustomEvent('rota:relationships-updated',{detail:state}));}catch{}
  return state;
}
export function relationshipRecord(state:RelationshipEngineState,input:{entityId:string;entityType:RelationshipEntityType;name:string;role?:string;adultOnly?:boolean}){
  return state.records[input.entityId]||{entityId:input.entityId,entityType:input.entityType,name:input.name,role:input.role,adultOnly:input.adultOnly!==false,bonds:[input.entityType==='NPC'?'ACQUAINTANCE':'FREQUENT_CUSTOMER'],dimensions:{...DEFAULT_RELATIONSHIP_DIMENSIONS},memories:[],interactionCount:0};
}
export function applyRelationshipInteraction(player:Pick<PlayerProfile,'cloudCareerId'|'name'|'oabRegistration'>,input:{
  entityId:string;entityType:RelationshipEntityType;name:string;role?:string;gameDate:string;
  kind:string;title:string;description:string;scope?:RelationshipMemoryScope;intensity?:number;
  dimensions:Partial<RelationshipDimensions>;bond?:RelationshipBond;adultOnly?:boolean;
}){
  const state=readRelationshipEngine(player); const current=relationshipRecord(state,input);
  const dimensions={...current.dimensions};
  for(const [dimension,delta] of Object.entries(input.dimensions)){const d=dimension as RelationshipDimension; dimensions[d]=clamp(dimensions[d]+(Number(delta)||0));}
  const bonds=[...current.bonds]; if(input.bond&&!bonds.includes(input.bond))bonds.push(input.bond);
  const memory:RelationshipMemory={id:`rel-${input.entityId}-${Date.now()}`,kind:input.kind,title:input.title,description:input.description,gameDate:input.gameDate,intensity:Math.max(1,Math.min(100,input.intensity||20)),scope:input.scope||'PRIVATE',dimensions:input.dimensions};
  state.records[input.entityId]={...current,name:input.name,role:input.role||current.role,adultOnly:input.adultOnly!==false,bonds,dimensions,memories:[memory,...current.memories].slice(0,60),interactionCount:current.interactionCount+1,lastInteractionDate:input.gameDate};
  return saveRelationshipEngine(player,state);
}
export function canAttemptRomanticInteraction(record:RelationshipRecord){return record.adultOnly&&record.dimensions.affinity>=30&&record.dimensions.trust>=20;}
export function canAttemptIntimateInteraction(record:RelationshipRecord){return record.adultOnly&&record.dimensions.attraction>=45&&record.dimensions.trust>=35&&record.dimensions.intimacy>=30;}
export function relationshipLabel(record:RelationshipRecord){
  if(record.bonds.includes('MARRIED'))return'Casamento';
  if(record.bonds.includes('PARTNER'))return'Relacionamento duradouro';
  if(record.bonds.includes('DATING'))return'Namoro';
  if(record.bonds.includes('CASUAL_INTIMATE'))return'Relação íntima casual';
  if(record.bonds.includes('CASUAL_ROMANTIC'))return'Encontros casuais';
  if(record.bonds.includes('RIVAL'))return'Rivalidade';
  if(record.dimensions.affinity>=70)return'Muito próximo';
  if(record.dimensions.affinity>=45)return'Boa relação';
  return record.entityType==='NPC'?'Conhecido':'Cliente';
}
