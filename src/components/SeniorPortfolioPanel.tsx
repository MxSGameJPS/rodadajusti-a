import React from 'react';
import { BriefcaseBusiness, Clock3, FileCheck2, UserRound } from 'lucide-react';
import { seniorPortfolioActionLabel, type SeniorPortfolioMatter } from '../lib/seniorPortfolio';

interface Props { portfolio: SeniorPortfolioMatter[]; busy?: boolean; onAction: (matterId:string, action:SeniorPortfolioMatter['pending'][number])=>void; onReview?: (matterId:string)=>void; onDecision?: (matterId:string)=>void; }
export const SeniorPortfolioPanel: React.FC<Props> = ({portfolio,busy,onAction,onReview,onDecision}) => (
<section className="mb-5 overflow-hidden rounded-2xl border border-[#C5A059]/30 bg-[#0D0D0F]">
 <div className="border-b border-[#2A2A2E] p-5">
  <span className="text-[9px] font-black uppercase tracking-[.18em] text-[#C5A059]">Carteira supervisionada</span>
  <h3 className="mt-1 font-serif text-xl font-black text-[#F1EFE9]">Processos sob seu acompanhamento</h3>
  <p className="mt-1 text-xs text-[#969188]">Você acompanha as pendências ao longo dos dias. Dr. Roberto continua sendo o advogado responsável e revisa suas entregas.</p>
 </div>
 <div className="grid gap-3 p-5 lg:grid-cols-3">
 {portfolio.map(m=><article key={m.id} className="rounded-xl border border-[#29292E] bg-[#0B0B0D] p-4">
   <div className="flex justify-between gap-3"><span className="flex items-center gap-1 text-[9px] uppercase text-[#C5A059]"><BriefcaseBusiness size={13}/> supervisionado</span><span className="flex items-center gap-1 text-[9px] text-[#888]"><Clock3 size={12}/>{m.dueInDays}d</span></div>
   <strong className="mt-2 block text-sm text-[#E4E1DA]">{m.title}</strong>
   <span className="mt-1 flex items-center gap-1 text-[10px] text-[#8F8F96]"><UserRound size={12}/>{m.client}</span>
   <p className="mt-2 text-[10px] leading-relaxed text-[#8F8F96]">{m.responsibility}</p>
   <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#202024]"><div className="h-full bg-[#C5A059]" style={{width:`${m.progress}%`}}/></div>
   <span className="mt-1 block text-right font-mono text-[9px] text-[#777]">{m.progress}%</span>
   <div className="mt-3 space-y-2">{m.pending.map(a=><button disabled={busy} key={a} onClick={()=>onAction(m.id,a)} className="flex w-full items-center gap-2 rounded-lg border border-[#303036] px-3 py-2 text-left text-[10px] text-[#CFCBC2] hover:border-[#C5A059]/50 disabled:opacity-50"><FileCheck2 size={13}/>{seniorPortfolioActionLabel(a)}</button>)}</div>
   {!m.pending.length&&m.status==='READY_FOR_REVIEW'&&<button onClick={()=>onReview?.(m.id)} className="mt-3 w-full rounded-lg border border-[#34D399]/25 bg-[#34D399]/[.05] p-2 text-[10px] text-[#86D6B6] hover:bg-[#34D399]/10">Solicitar revisão do Dr. Roberto</button>}
   {m.status==='COMPLETED'&&<button onClick={()=>onDecision?.(m.id)} className="mt-3 w-full rounded-lg border border-[#C5A059]/25 bg-[#C5A059]/[.05] p-2 text-[10px] text-[#D8BC7B] hover:bg-[#C5A059]/10">Participar da próxima decisão</button>}
 </article>)}
 </div>
</section>);
