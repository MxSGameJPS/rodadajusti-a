import React, { useEffect, useState } from 'react';
import { AlertTriangle, Building2, Gavel, Landmark, Scale, ShieldCheck } from 'lucide-react';
import type { PlayerProfile } from '../types/game';
import {
  choosePublicJurisdiction, ensurePublicAssignment, hydratePublicServiceGameplay,
  readPublicServiceGameplay, resolvePublicAssignment, type PublicServiceGameplayState,
} from '../lib/publicServiceGameplay';

export function PublicServiceDesk({ player }: { player: PlayerProfile }) {
  const [state, setState] = useState<PublicServiceGameplayState>(() => readPublicServiceGameplay(player));
  const [message, setMessage] = useState('');
  useEffect(() => { void hydratePublicServiceGameplay(player).then(async s => { setState(s); if (s.jurisdiction) setState(await ensurePublicAssignment(player)); }); }, [player.cloudCareerId, player.careerTier, player.gameCurrentDay, player.gameCurrentMonth, player.gameCurrentYear]);
  const assignment = state.assignment;
  const isMp = state.branch === 'PROSECUTION';

  if (!state.jurisdiction) return <section className="rounded-2xl border border-[#C5A059]/30 bg-[#0D0D0F] p-5 text-[#E8E8EA]">
    <div className="flex items-center gap-3"><Landmark className="text-[#C5A059]"/><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#C5A059]">Lotação inicial</p><h3 className="font-serif text-lg font-bold">Escolha o ramo da carreira</h3></div></div>
    <p className="mt-3 text-xs leading-5 text-[#999]">A escolha define o ambiente institucional e os tipos de processos distribuídos. Depois de confirmada, não pode ser trocada por este painel.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <button onClick={async()=>{const r=await choosePublicJurisdiction(player,'STATE');if(r.ok){setState(r.state);setState(await ensurePublicAssignment(player));}}} className="rounded-xl border border-[#C5A059]/35 bg-[#151517] p-4 text-left"><Building2 className="mb-2 text-[#C5A059]" size={20}/><b>Carreira Estadual</b><p className="mt-1 text-[11px] text-[#888]">{isMp?'Ministério Público Estadual':'Justiça Estadual'}</p></button>
      <button onClick={async()=>{const r=await choosePublicJurisdiction(player,'FEDERAL');if(r.ok){setState(r.state);setState(await ensurePublicAssignment(player));}}} className="rounded-xl border border-[#C5A059]/35 bg-[#151517] p-4 text-left"><Landmark className="mb-2 text-[#C5A059]" size={20}/><b>Carreira Federal</b><p className="mt-1 text-[11px] text-[#888]">{isMp?'Ministério Público Federal':'Justiça Federal'}</p></button>
    </div>
  </section>;

  return <section className="rounded-2xl border border-[#C5A059]/30 bg-[#0D0D0F] p-5 text-[#E8E8EA]">
    <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/10 p-3 text-[#C5A059]">{isMp?<ShieldCheck size={20}/>:<Gavel size={20}/>}</div><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#C5A059]">{state.jurisdiction==='FEDERAL'?'Ramo Federal':'Ramo Estadual'}</p><h3 className="font-serif text-lg font-bold">{isMp?'Gabinete do Ministério Público':'Gabinete Judicial'}</h3></div></div><div className="text-right"><span className="text-[9px] uppercase text-[#777]">Risco correcional</span><b className={state.correctionRisk>=50?'block text-[#F87171]':'block text-[#34D399]'}>{state.correctionRisk}/100</b></div></div>
    {message&&<p className="mt-3 rounded-lg border border-[#2A2A2E] bg-[#141416] p-3 text-xs text-[#D6C59C]">{message}</p>}
    {assignment ? <div className="mt-4 rounded-xl border border-[#2D2D32] bg-[#151517] p-4"><div className="flex items-center justify-between"><span className="rounded-md bg-[#C5A059]/10 px-2 py-1 text-[9px] font-black text-[#C5A059]">{assignment.area.toUpperCase()}</span><span className="text-[10px] text-[#777]">Complexidade {assignment.complexity}/5</span></div><h4 className="mt-3 font-serif text-base font-bold">{assignment.title}</h4><p className="mt-2 text-xs leading-5 text-[#999]">{assignment.summary}</p><div className="mt-4 space-y-2">{assignment.options.map(option=><button key={option.id} onClick={async()=>{const r=await resolvePublicAssignment(player,option.id);if(r.ok){setState(r.state);setMessage(r.qualityDelta>0?'A atuação foi tecnicamente consistente e fortaleceu sua posição institucional.':'A decisão gerou questionamentos e aumentou sua exposição correcional.');setState(await ensurePublicAssignment(player));}}} className="w-full rounded-lg border border-[#333] bg-[#111113] p-3 text-left hover:border-[#C5A059]/50"><b className="text-xs">{option.label}</b><p className="mt-1 text-[10px] text-[#777]">{option.rationale}</p></button>)}</div></div>:<button onClick={async()=>setState(await ensurePublicAssignment(player))} className="mt-4 w-full rounded-xl bg-[#C5A059] p-3 text-xs font-black text-[#111]">Receber nova distribuição</button>}
    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px]"><div className="rounded-lg border border-[#29292D] p-2"><Scale size={14} className="mx-auto mb-1 text-[#C5A059]"/><b>{state.stats.judicialDecisions+state.stats.prosecutionActs}</b><span className="block text-[#777]">Atos</span></div><div className="rounded-lg border border-[#29292D] p-2"><Gavel size={14} className="mx-auto mb-1 text-[#C5A059]"/><b>{state.stats.appellateVotes}</b><span className="block text-[#777]">2º grau</span></div><div className="rounded-lg border border-[#29292D] p-2"><AlertTriangle size={14} className="mx-auto mb-1 text-[#C5A059]"/><b>{state.stats.dissents}</b><span className="block text-[#777]">Divergências</span></div></div>
  </section>;
}
