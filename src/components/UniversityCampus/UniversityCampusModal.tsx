import React from 'react';
import { BookOpen, Clock3, GraduationCap, Library, Users, X } from 'lucide-react';
import type { PlayerProfile } from '../../types/game';
import { CAMPUS_ACTIVITIES, classIsAvailable, campusIsOpen, LEGAL_KNOWLEDGE_LABELS, normalizeLegalKnowledge, type CampusActivityId } from '../../lib/academicLife';

export function UniversityCampusModal({ isOpen, player, onClose, onActivity }:{
  isOpen:boolean; player:PlayerProfile; onClose:()=>void; onActivity:(id:CampusActivityId)=>void;
}) {
  if (!isOpen) return null;
  const open = campusIsOpen(player.gameCurrentMinutes);
  const classNow = classIsAvailable(player.gameCurrentMinutes);
  const knowledge = normalizeLegalKnowledge(player.legalKnowledge);
  const icons = { CLASS: GraduationCap, LIBRARY: Library, STUDY_GROUP: Users };
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#050709]/90 p-4 backdrop-blur-md">
    <div className="w-full max-w-4xl overflow-hidden rounded-[26px] border border-[#C5A059]/30 bg-[#0B0E11] shadow-2xl">
      <header className="flex items-center justify-between border-b border-[#292E34] p-5">
        <div><span className="text-[9px] font-black uppercase tracking-[.2em] text-[#C5A059]">Campus universitário</span><h2 className="font-serif text-2xl font-black text-[#F3EFE7]">Faculdade de Direito</h2><p className="mt-1 text-xs text-[#8F969F]">{open ? 'Campus aberto • atividades acadêmicas disponíveis' : 'Campus fechado • funcionamento das 07h às 23h'}</p></div>
        <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-[#343A42] text-[#AAB0B7]"><X size={18}/></button>
      </header>
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_300px]">
        <section><h3 className="mb-3 text-xs font-black uppercase tracking-wider text-[#D8DADF]">O que deseja fazer?</h3><div className="grid gap-3 sm:grid-cols-3">
          {CAMPUS_ACTIVITIES.map(a => { const Icon=icons[a.id]; const available=open && (a.id!=='CLASS'||classNow); return <button key={a.id} disabled={!available} onClick={()=>onActivity(a.id)} className="rounded-2xl border border-[#2C3239] bg-[#11161B] p-4 text-left transition hover:border-[#C5A059]/50 disabled:opacity-35">
            <Icon size={22} className="text-[#CDB16C]"/><strong className="mt-3 block text-sm text-white">{a.title}</strong><span className="mt-1 block text-[10px] text-[#8F969F]"><Clock3 size={11} className="mr-1 inline"/>{a.minutes} min • Estudo +{a.study}</span>{a.id==='CLASS'&&!classNow&&<small className="mt-2 block text-[9px] text-[#D9A86C]">Aulas: 08–12h e 18–22h</small>}</button>})}
        </div><div className="mt-4 rounded-2xl border border-[#2A3036] bg-[#0E1216] p-4 text-xs leading-5 text-[#959CA5]"><BookOpen size={15} className="mr-2 inline text-[#60A5FA]"/>A frequência ao campus agora desenvolve conhecimento jurídico real. Esse conhecimento poderá influenciar OAB, concursos e desempenho nos casos.</div></section>
        <aside className="rounded-2xl border border-[#2A3036] bg-[#0E1216] p-4"><h3 className="text-xs font-black uppercase tracking-wider text-[#34D399]">Conhecimento jurídico</h3><div className="mt-4 space-y-3">{Object.entries(knowledge).map(([area,value])=><div key={area}><div className="flex justify-between text-[9px]"><span className="text-[#A8AFB7]">{LEGAL_KNOWLEDGE_LABELS[area as keyof typeof LEGAL_KNOWLEDGE_LABELS]}</span><b>{value}/100</b></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#22272D]"><div className="h-full bg-[#34D399]" style={{width:value+'%'}}/></div></div>)}</div></aside>
      </div>
    </div>
  </div>;
}
