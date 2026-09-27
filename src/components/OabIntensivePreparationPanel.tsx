import React from 'react';
import { BookOpenCheck, Brain, Target } from 'lucide-react';
import { OAB_AREAS, oabReadiness, type OabPreparationState, type OabStudyArea } from '../lib/oabIntensivePreparation';
import type { PlayerProfile } from '../types/game';
interface Props{player:PlayerProfile;state:OabPreparationState;onStudy:(area:OabStudyArea)=>void;onQuickMock:()=>void}
export const OabIntensivePreparationPanel:React.FC<Props>=({player,state,onStudy,onQuickMock})=>{
 if(!state.unlocked)return null;const r=oabReadiness(state,player);
 return <section className="mt-4 rounded-xl border border-[#8B6F3D]/30 bg-[#11100D] p-4">
  <div className="flex items-center gap-2"><BookOpenCheck size={16} className="text-[#C5A059]"/><div><span className="text-[9px] font-black uppercase tracking-wider text-[#C5A059]">Preparação intensiva OAB</span><p className="text-[10px] text-[#8F8B82]">Liberada pelo Dr. Roberto • prontidão {r.readiness}%</p></div></div>
  <div className="mt-4 grid gap-2 md:grid-cols-2">{(Object.entries(OAB_AREAS) as [OabStudyArea,(typeof OAB_AREAS)[OabStudyArea]][]).map(([id,a])=><button type="button" key={id} onClick={()=>onStudy(id)} className="rounded-lg border border-[#2C2B27] p-3 text-left hover:border-[#C5A059]/40"><strong className="block text-[11px] text-[#DDD8CE]">{a.label}</strong><span className="text-[9px] text-[#77736C]">{state.studyPoints[id]}% • {a.minutes} min</span></button>)}</div>
  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[9px]"><div className="rounded-lg bg-black/20 p-2"><Brain size={13} className="mx-auto mb-1"/>Conhecimento<br/><b>{r.knowledge}%</b></div><div className="rounded-lg bg-black/20 p-2"><Target size={13} className="mx-auto mb-1"/>Último simulado<br/><b>{r.mock}%</b></div><div className="rounded-lg bg-black/20 p-2">Sessões<br/><b>{state.sessions.length}</b></div></div>
  <button type="button" onClick={onQuickMock} className="mt-3 w-full rounded-lg border border-[#C5A059]/30 px-3 py-2 text-[10px] font-bold text-[#D8BC7B] hover:bg-[#C5A059]/10">Fazer simulado rápido de preparação</button>
 </section>
}
