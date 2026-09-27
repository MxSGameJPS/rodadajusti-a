import type { PlayerProfile } from '../types/game';

export type SeniorPortfolioStatus = 'ACTIVE' | 'READY_FOR_REVIEW' | 'COMPLETED';
export interface SeniorPortfolioMatter {
  id: string; title: string; client: string; responsibility: string; supervisor: string;
  dueInDays: number; progress: number; status: SeniorPortfolioStatus;
  pending: Array<'DOCUMENTS'|'CLIENT_RETURN'|'RESEARCH'|'DRAFT'|'HEARING_PREP'>;
}
export interface SeniorPortfolioDecision {
  id: string; matterId: string; gameDate: string; action: string; outcome: string;
}

const TEMPLATES = [
  { id:'consumer', title:'Silva x Loja Center', client:'João Silva', responsibility:'Preparar minuta e conferir documentos', pending:['DOCUMENTS','DRAFT'] as SeniorPortfolioMatter['pending'] },
  { id:'labor', title:'Fernandes x Empregadora', client:'Maria Fernandes', responsibility:'Organizar prova e roteiro de audiência', pending:['DOCUMENTS','HEARING_PREP'] as SeniorPortfolioMatter['pending'] },
  { id:'insurance', title:'Carlos x Seguradora', client:'Carlos Almeida', responsibility:'Cobrar documentos e preparar pesquisa', pending:['CLIENT_RETURN','RESEARCH'] as SeniorPortfolioMatter['pending'] },
];

export function createInitialSeniorPortfolio(): SeniorPortfolioMatter[] {
  return TEMPLATES.map((x,index)=>({...x,supervisor:'Dr. Roberto Ramos',dueInDays:index+2,progress:0,status:'ACTIVE' as const}));
}

export function seniorPortfolioActionLabel(action: SeniorPortfolioMatter['pending'][number]) {
  return ({DOCUMENTS:'Conferir documentos',CLIENT_RETURN:'Retornar ao cliente',RESEARCH:'Pesquisar jurisprudência',DRAFT:'Preparar minuta',HEARING_PREP:'Preparar audiência'} as const)[action];
}

export function completeSeniorPortfolioAction(matter: SeniorPortfolioMatter, action: SeniorPortfolioMatter['pending'][number]) {
  if (!matter.pending.includes(action)) return matter;
  const pending=matter.pending.filter(x=>x!==action);
  const total=Math.max(1,matter.pending.length);
  const progress=Math.min(100,matter.progress+Math.round(100/total));
  return {...matter,pending,progress:pending.length?progress:100,status:pending.length?'ACTIVE':'READY_FOR_REVIEW'} as SeniorPortfolioMatter;
}

export function portfolioDate(player: PlayerProfile) {
  return `${String(player.gameCurrentDay).padStart(2,'0')}/${String(player.gameCurrentMonth).padStart(2,'0')}/${player.gameCurrentYear}`;
}
