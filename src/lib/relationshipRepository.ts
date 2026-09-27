import type { PlayerProfile } from '../types/game';
import { supabase } from './supabase';
import { readRelationshipEngine, saveRelationshipEngine, type RelationshipEngineState, type RelationshipRecord } from './relationshipEngine';

const MIGRATION_KEY='rota_relationship_supabase_v1:';

function eligible(player:PlayerProfile){return Boolean(supabase&&player.cloudCareerId)}
function row(record:RelationshipRecord,careerId:string,userId:string){
 const d=record.dimensions;
 return {career_id:careerId,user_id:userId,entity_id:record.entityId,entity_type:record.entityType,entity_name:record.name,entity_role:record.role||null,adult_only:record.adultOnly,bonds:record.bonds,
 affinity:d.affinity,trust:d.trust,intimacy:d.intimacy,attraction:d.attraction,romance:d.romance,commitment:d.commitment,conflict:d.conflict,professional_respect:d.professionalRespect,professional_trust:d.professionalTrust,rivalry:d.rivalry,institutional_reputation:d.institutionalReputation,loyalty:d.loyalty,interaction_count:record.interactionCount,last_interaction_game_date:record.lastInteractionDate||null};
}
function fromRow(r:any):RelationshipRecord{return{entityId:r.entity_id,entityType:r.entity_type,name:r.entity_name,role:r.entity_role||undefined,adultOnly:r.adult_only,bonds:Array.isArray(r.bonds)?r.bonds:[],dimensions:{affinity:r.affinity,trust:r.trust,intimacy:r.intimacy,attraction:r.attraction,romance:r.romance,commitment:r.commitment,conflict:r.conflict,professionalRespect:r.professional_respect,professionalTrust:r.professional_trust,rivalry:r.rivalry,institutionalReputation:r.institutional_reputation,loyalty:r.loyalty},memories:[],interactionCount:r.interaction_count,lastInteractionDate:r.last_interaction_game_date||undefined}}
export async function pushRelationshipRecord(player:PlayerProfile,record:RelationshipRecord){
 if(!eligible(player)||!supabase)return;
 const {data:{user}}=await supabase.auth.getUser();if(!user)return;
 const {data:rel,error}=await supabase.from('player_relationships').upsert(row(record,player.cloudCareerId!,user.id),{onConflict:'career_id,entity_id'}).select('id').single();if(error){console.warn('[relationships] sync',error.message);return}
 if(!record.memories.length)return;
 const memories=record.memories.map(m=>({relationship_id:rel.id,career_id:player.cloudCareerId!,user_id:user.id,memory_key:m.id,kind:m.kind,title:m.title,description:m.description,game_date:m.gameDate,intensity:m.intensity,scope:m.scope,dimension_effects:m.dimensions}));
 const {error:me}=await supabase.from('relationship_memories').upsert(memories,{onConflict:'relationship_id,memory_key'});if(me)console.warn('[relationships] memories',me.message);
}
export async function syncRelationshipEngine(player:PlayerProfile):Promise<RelationshipEngineState>{
 const local=readRelationshipEngine(player);if(!eligible(player)||!supabase)return local;
 const {data:{user}}=await supabase.auth.getUser();if(!user)return local;
 const {data:rows,error}=await supabase.from('player_relationships').select('*').eq('career_id',player.cloudCareerId!);if(error)return local;
 if(!rows?.length){await Promise.all(Object.values(local.records).map(r=>pushRelationshipRecord(player,r)));localStorage.setItem(MIGRATION_KEY+player.cloudCareerId,'1');return local}
 const ids=rows.map((x:any)=>x.id);const {data:memories}=await supabase.from('relationship_memories').select('*').in('relationship_id',ids).order('created_at',{ascending:false});
 const byRel=new Map<string,any[]>();for(const m of memories||[]){const list=byRel.get(m.relationship_id)||[];list.push(m);byRel.set(m.relationship_id,list)}
 const state:RelationshipEngineState={version:1,records:{}};
 for(const rr of rows){const rec=fromRow(rr);rec.memories=(byRel.get(rr.id)||[]).map(m=>({id:m.memory_key||m.id,kind:m.kind,title:m.title,description:m.description,gameDate:m.game_date,intensity:m.intensity,scope:m.scope,dimensions:m.dimension_effects||{}}));state.records[rec.entityId]=rec}
 saveRelationshipEngine(player,state);return state;
}
export async function persistRelationshipEngine(player:PlayerProfile){const state=readRelationshipEngine(player);await Promise.all(Object.values(state.records).map(r=>pushRelationshipRecord(player,r)))}
export async function persistPlayerRelationshipStatus(player:PlayerProfile){
 if(!eligible(player)||!supabase)return;await supabase.from('careers').update({relationship_status:player.relationshipStatus||'SINGLE',partner_name:player.relationshipStatus==='SINGLE'?null:player.partnerName||null}).eq('id',player.cloudCareerId!);
}
