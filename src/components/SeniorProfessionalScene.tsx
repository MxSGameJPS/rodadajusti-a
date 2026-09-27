import React from 'react';
import { Gavel, MessageSquareText, UsersRound, X } from 'lucide-react';
import type { SeniorLegalDecision, SeniorProfessionalScene } from '../lib/seniorPortfolio';

interface Props { scene:SeniorProfessionalScene; onChoose:(decision:SeniorLegalDecision)=>void; onClose:()=>void; }
export const SeniorProfessionalScene:React.FC<Props>=({scene,onChoose,onClose})=>(
 <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-4">
  <section className="w-full max-w-4xl overflow-hidden rounded-2xl border border-[#C5A059]/30 bg-[#0D0D0F] shadow-2xl">
   <header className="border-b border-[#2A2A2E] bg-gradient-to-r from-[#1B1711] to-[#101012] p-6">
    <div className="flex items-start justify-between gap-4">
     <div><span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-[#C5A059]">{scene.kind==='HEARING'?<Gavel size={14}/>:<MessageSquareText size={14}/>} Experiência profissional supervisionada</span><h2 className="mt-2 font-serif text-2xl font-black text-[#F1EFE9]">{scene.title}</h2><p className="mt-1 text-xs text-[#AAA59B]">{scene.subtitle}</p></div>
     <button onClick={onClose} className="rounded-lg border border-[#333] p-2 text-[#888]"><X size={17}/></button>
    </div>
   </header>
   <div className="p-6">
    <div className="rounded-xl border border-[#29292E] bg-[#111114] p-5"><p className="text-sm leading-relaxed text-[#D1CDC4]">{scene.context}</p><div className="mt-4 flex flex-wrap gap-2">{scene.participants.map(p=><span key={p} className="flex items-center gap-1 rounded-full border border-[#333] px-3 py-1 text-[9px] text-[#999]"><UsersRound size={11}/>{p}</span>)}</div></div>
    <div className="mt-5"><span className="text-[9px] font-black uppercase tracking-wider text-[#C5A059]">Como você age?</span><div className="mt-3 grid gap-3">{scene.choices.map(choice=><button key={choice.id} onClick={()=>onChoose(choice)} className="rounded-xl border border-[#303036] bg-[#0A0A0C] p-4 text-left hover:border-[#C5A059]/50"><strong className="block text-sm text-[#E4E1DA]">{choice.label}</strong><span className="mt-1 block text-[10px] leading-relaxed text-[#8F8F96]">{choice.description}</span></button>)}</div></div>
    <p className="mt-5 text-[9px] text-[#706D67]">A cena-base ocupa aproximadamente {scene.minutes} minutos do expediente. A decisão escolhida pode exigir tempo adicional.</p>
   </div>
  </section>
 </div>
);
