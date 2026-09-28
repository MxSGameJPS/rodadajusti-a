import React, { useEffect, useState } from 'react';
import { Crown, Landmark, ShieldCheck } from 'lucide-react';
import type { PlayerProfile } from '../types/game';
import { answerApexAppointment, hydrateApexCareer, rollApexAppointment, type ApexCareerState } from '../lib/apexCareer';

export function ApexCareerPanel({player,onCareerChange}:{player:PlayerProfile;onCareerChange:(tier:PlayerProfile['careerTier'])=>void}) {
 const [state,setState]=useState<ApexCareerState>({activeAppointment:null,history:[],processedKeys:[]});
 const [message,setMessage]=useState('');
 useEffect(()=>{void hydrateApexCareer(player).then(()=>rollApexAppointment(player)).then(setState)},[player.cloudCareerId,player.careerTier,player.gameCurrentMonth,player.gameCurrentYear]);
 const a=state.activeAppointment;
 return <section className="rounded-2xl border border-[#C5A059]/25 bg-[#0D0D0F] p-5 text-[#E8E8EA]">
  <div className="flex items-center gap-3"><Crown size={20} className="text-[#C5A059]"/><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#C5A059]">Trajetórias de cúpula</p><h3 className="font-serif text-lg font-bold">Indicações e nomeações</h3></div></div>
  <p className="mt-2 text-[11px] leading-5 text-[#888]">Esses destinos não são promoções automáticas. Dependem da trajetória construída e de processo institucional próprio.</p>
  {message&&<p className="mt-3 text-xs text-[#D6C59C]">{message}</p>}
  {a?<div className="mt-4 rounded-xl border border-[#C5A059]/30 bg-[#151517] p-4"><div className="flex items-center gap-2 text-[#C5A059]">{a.kind==='PGR'?<ShieldCheck size={16}/>:<Landmark size={16}/>}<b className="text-xs">{a.title}</b></div><div className="mt-2 space-y-1">{a.requirements.map(r=><p key={r} className="text-[10px] text-[#888]">• {r}</p>)}</div><div className="mt-4 flex gap-2"><button onClick={async()=>{const r=await answerApexAppointment(player,false);if(r.ok){setState(r.state);setMessage('Você recusou participar deste processo institucional.')}} className="rounded-lg border border-[#333] px-3 py-2 text-xs">Recusar</button><button onClick={async()=>{const r=await answerApexAppointment(player,true);if(r.ok){setState(r.state);if(r.tier)onCareerChange(r.tier);setMessage(r.appointed?'O processo institucional resultou em nomeação.':'A candidatura não resultou em nomeação nesta oportunidade.')}}} className="rounded-lg bg-[#C5A059] px-3 py-2 text-xs font-black text-[#111]">Aceitar consulta</button></div></div>:<p className="mt-4 rounded-lg border border-[#29292D] p-3 text-xs text-[#777]">Nenhuma consulta institucional ativa neste momento.</p>}
 </section>
}