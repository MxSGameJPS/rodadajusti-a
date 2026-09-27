import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Heart, History, ShieldCheck, Users, X } from 'lucide-react';
import type { PlayerProfile } from '../../types/game';
import { readRelationshipEngine, relationshipLabel, type RelationshipRecord } from '../../lib/relationshipEngine';
import styles from './RelationshipCenter.module.css';

export const OPEN_RELATIONSHIP_CENTER_EVENT='rota:open-relationship-center';

const bars:[keyof RelationshipRecord['dimensions'],string][]=[
 ['affinity','Afinidade'],['trust','Confiança'],['intimacy','Intimidade'],['attraction','Atração'],
 ['romance','Romance'],['commitment','Compromisso'],['professionalRespect','Respeito profissional'],
 ['professionalTrust','Confiança profissional'],['rivalry','Rivalidade'],['institutionalReputation','Reputação institucional'],['loyalty','Lealdade'],
];

export function RelationshipCenter({player}:{player:PlayerProfile}){
 const [open,setOpen]=useState(false); const [tick,setTick]=useState(0); const [filter,setFilter]=useState<'ALL'|'NPC'|'ESTABLISHMENT'>('ALL'); const [selected,setSelected]=useState<string|null>(null);
 useEffect(()=>{const show=()=>setOpen(true); const refresh=()=>setTick(v=>v+1); window.addEventListener(OPEN_RELATIONSHIP_CENTER_EVENT,show); window.addEventListener('rota:relationships-updated',refresh); return()=>{window.removeEventListener(OPEN_RELATIONSHIP_CENTER_EVENT,show);window.removeEventListener('rota:relationships-updated',refresh)}},[]);
 const records=useMemo(()=>Object.values(readRelationshipEngine(player).records).sort((a,b)=>b.interactionCount-a.interactionCount),[player,tick,open]);
 const visible=records.filter(r=>filter==='ALL'||r.entityType===filter); const current=records.find(r=>r.entityId===selected)||visible[0];
 if(!open)return <button className={styles.launcher} onClick={()=>setOpen(true)}><Users size={18}/><span>Relacionamentos</span></button>;
 return <div className={styles.backdrop}><section className={styles.modal}>
  <header><div><Users size={22}/><div><span>Motor social e institucional</span><h2>Relacionamentos</h2></div></div><button onClick={()=>setOpen(false)}><X size={19}/></button></header>
  <nav><button onClick={()=>setFilter('ALL')} className={filter==='ALL'?styles.active:''}>Todos</button><button onClick={()=>setFilter('NPC')} className={filter==='NPC'?styles.active:''}><Heart size={14}/>Pessoas</button><button onClick={()=>setFilter('ESTABLISHMENT')} className={filter==='ESTABLISHMENT'?styles.active:''}><Building2 size={14}/>Estabelecimentos</button></nav>
  <div className={styles.layout}><aside>{visible.length?visible.map(r=><button key={r.entityId} className={current?.entityId===r.entityId?styles.selected:''} onClick={()=>setSelected(r.entityId)}><strong>{r.name}</strong><span>{r.role||relationshipLabel(r)}</span><small>{r.interactionCount} interações</small></button>):<p>Nenhum relacionamento registrado ainda. Interaja com pessoas e estabelecimentos para construir seu histórico.</p>}</aside>
  <main>{current&&<><div className={styles.identity}><div>{current.entityType==='NPC'?<Heart/>:<Building2/>}</div><div><span>{current.entityType==='NPC'?'Pessoa':'Estabelecimento'}</span><h3>{current.name}</h3><p>{current.role||relationshipLabel(current)}</p></div></div>
   <div className={styles.bonds}>{current.bonds.map(b=><span key={b}>{b.replaceAll('_',' ')}</span>)}</div>
   <div className={styles.metrics}>{bars.filter(([k])=>current.entityType==='NPC'||!['attraction','romance','commitment','intimacy','professionalRespect','professionalTrust','rivalry'].includes(k)).map(([k,label])=><div key={k}><div><span>{label}</span><strong>{current.dimensions[k]}</strong></div><i><b style={{width:`${current.dimensions[k]}%`}}/></i></div>)}</div>
   <section className={styles.memories}><h4><History size={16}/>Memórias</h4>{current.memories.length?current.memories.slice(0,10).map(m=><article key={m.id}><div><strong>{m.title}</strong><span>{m.gameDate} • {m.scope.replaceAll('_',' ')}</span></div><p>{m.description}</p></article>):<p>Sem memórias relevantes ainda.</p>}</section>
   {current.entityType==='NPC'&&<div className={styles.notice}><ShieldCheck size={17}/><span>Relações pessoais e profissionais são independentes. Vínculos com agentes públicos não alteram automaticamente decisões institucionais.</span></div>}
  </>}</main></div>
 </section></div>
}
