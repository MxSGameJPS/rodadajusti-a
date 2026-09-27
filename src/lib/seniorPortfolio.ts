import type { PlayerProfile } from '../types/game';

export type SeniorPortfolioStatus = 'ACTIVE' | 'READY_FOR_REVIEW' | 'COMPLETED';
export interface SeniorPortfolioMatter {
  id: string; title: string; client: string; responsibility: string; supervisor: string;
  dueInDays: number; progress: number; status: SeniorPortfolioStatus;
  pending: Array<'DOCUMENTS'|'CLIENT_RETURN'|'RESEARCH'|'DRAFT'|'HEARING_PREP'>;
  decisionCompleted?: boolean;
  consequence?: string;
  lastDeadlineDate?: string;
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


export interface SupervisorPortfolioReview {
  approved: boolean;
  title: string;
  dialogues: Array<{ eyebrow: string; text: string }>;
  techniqueDelta: number;
  trustDelta: number;
}
export function buildSupervisorPortfolioReview(player: PlayerProfile, matter: SeniorPortfolioMatter): SupervisorPortfolioReview {
  const p=player.officePerformance;
  const quality=Math.round((p.technique+p.diligence+p.deadlineManagement+p.supervisorTrust)/4);
  const approved=quality>=58;
  return {
    approved,
    title: approved?'Trabalho aprovado':'Revisão necessária',
    techniqueDelta: approved?2:1,
    trustDelta: approved?3:-1,
    dialogues: approved ? [
      {eyebrow:'Revisão técnica',text:`Revisei o acompanhamento de ${matter.title}. Você organizou as pendências e trouxe o processo em condições de avançar.`},
      {eyebrow:'Autonomia',text:`É isso que espero de um Estagiário Sênior: não apenas executar tarefas, mas perceber o que o caso precisa antes de chegar à minha mesa.`},
      {eyebrow:'Decisão',text:'Aprovado. Vou assumir a próxima providência jurídica como advogado responsável e registrar sua participação no acompanhamento.'},
    ] : [
      {eyebrow:'Revisão técnica',text:`Analisei ${matter.title}. O trabalho avançou, mas ainda não está seguro para seguirmos.`},
      {eyebrow:'Ponto de atenção',text:quality<50?'Sua análise ainda precisa de mais consistência técnica e controle de prazo.':'Há bons elementos, mas quero uma conferência adicional antes de assumir a próxima providência.'},
      {eyebrow:'Decisão',text:'A promoção trouxe autonomia, não independência. Faça a revisão indicada e devolva o processo para minha conferência.'},
    ],
  };
}

export type SeniorLegalDecisionId='CLIENT_GUARANTEE'|'CLIENT_TRANSPARENT'|'CLIENT_DEFER'|'HEARING_CONTRADICTION'|'HEARING_NOTES'|'HEARING_IGNORE';
export interface SeniorLegalDecision {
 id:SeniorLegalDecisionId; label:string; description:string; minutes:number;
 technique:number; ethics:number; trust:number; outcome:string;
}
export function getSeniorLegalDecisions(matter:SeniorPortfolioMatter):SeniorLegalDecision[] {
 if(matter.id==='labor') return [
  {id:'HEARING_CONTRADICTION',label:'Apontar a contradição ao Dr. Roberto',description:'Relacionar o depoimento atual com os documentos e sinalizar a inconsistência.',minutes:15,technique:3,ethics:1,trust:3,outcome:'Roberto reconhece que você identificou um ponto relevante para a estratégia da audiência.'},
  {id:'HEARING_NOTES',label:'Registrar e aguardar a revisão',description:'Anotar a divergência e entregar suas observações após a audiência.',minutes:10,technique:1,ethics:1,trust:1,outcome:'Você preserva a supervisão e produz um registro útil, embora demonstre menos iniciativa.'},
  {id:'HEARING_IGNORE',label:'Não destacar a divergência',description:'Considerar que o ponto provavelmente não é importante.',minutes:5,technique:-3,ethics:0,trust:-2,outcome:'Roberto percebe depois a contradição e questiona por que ela não foi sinalizada.'},
 ];
 return [
  {id:'CLIENT_TRANSPARENT',label:'Explicar cenário sem prometer resultado',description:'Apresentar avanços, riscos e próximos passos com linguagem clara.',minutes:20,technique:1,ethics:3,trust:2,outcome:'O cliente entende o cenário e Roberto aprova a forma responsável da comunicação.'},
  {id:'CLIENT_DEFER',label:'Pedir que Roberto dê o posicionamento final',description:'Organizar os fatos e encaminhar a conclusão jurídica ao supervisor.',minutes:15,technique:0,ethics:2,trust:0,outcome:'A comunicação é segura, mas Roberto nota que você ainda pode desenvolver mais autonomia.'},
  {id:'CLIENT_GUARANTEE',label:'Garantir que o cliente vencerá',description:'Tentar tranquilizar o cliente prometendo um resultado favorável.',minutes:10,technique:-2,ethics:-5,trust:-4,outcome:'A promessa de resultado é inadequada. Roberto intervém e corrige a orientação dada ao cliente.'},
 ];
}


export type SeniorSceneKind='CLIENT_MEETING'|'HEARING';
export interface SeniorProfessionalScene {
  kind:SeniorSceneKind; title:string; subtitle:string; context:string; participants:string[];
  minutes:number; choices:SeniorLegalDecision[];
}
export function getSeniorProfessionalScene(matter:SeniorPortfolioMatter):SeniorProfessionalScene {
 const hearing=matter.id==='labor';
 return hearing ? {
  kind:'HEARING',title:'Audiência supervisionada',subtitle:matter.title,
  context:'Durante a audiência, um depoimento entra em tensão com documentos que você revisou. Dr. Roberto olha para suas anotações e espera sua leitura antes de definir a estratégia.',
  participants:['Dr. Roberto Ramos','Maria Fernandes','Representante da parte contrária'],
  minutes:45,choices:getSeniorLegalDecisions(matter),
 } : {
  kind:'CLIENT_MEETING',title:'Reunião com cliente',subtitle:matter.title,
  context:`${matter.client} quer saber o que aconteceu no processo e pergunta diretamente se vai ganhar a causa. Você participa da reunião ao lado do Dr. Roberto.`,
  participants:['Dr. Roberto Ramos',matter.client],
  minutes:30,choices:getSeniorLegalDecisions(matter),
 };
}


function serialDay(player: Pick<PlayerProfile,'gameCurrentDay'|'gameCurrentMonth'|'gameCurrentYear'>) {
 return Math.floor(new Date(player.gameCurrentYear,player.gameCurrentMonth-1,player.gameCurrentDay).getTime()/86400000);
}
function parsePortfolioDate(value?:string) {
 if(!value)return null; const [d,m,y]=value.split('/').map(Number); if(!d||!m||!y)return null;
 return Math.floor(new Date(y,m-1,d).getTime()/86400000);
}
export function advanceSeniorPortfolioDeadlines(player:PlayerProfile, portfolio:SeniorPortfolioMatter[]) {
 const today=serialDay(player); let changed=false;
 const next=portfolio.map(m=>{
  if(m.status==='COMPLETED'&&m.decisionCompleted)return m;
  const last=parsePortfolioDate(m.lastDeadlineDate);
  if(last===today)return m;
  const elapsed=last===null?0:Math.max(0,today-last);
  const dueInDays=Math.max(0,m.dueInDays-elapsed);
  const consequence=dueInDays===0&&m.status!=='COMPLETED'?'Prazo crítico: o processo chegou ao limite sem conclusão da sua etapa supervisionada.':m.consequence;
  if(dueInDays!==m.dueInDays||m.lastDeadlineDate!==portfolioDate(player)||consequence!==m.consequence)changed=true;
  return {...m,dueInDays,lastDeadlineDate:portfolioDate(player),consequence};
 });
 return {portfolio:next,changed};
}
export function applySeniorDecisionConsequence(matter:SeniorPortfolioMatter, decision:SeniorLegalDecision) {
 const negative=decision.ethics<0||decision.trust<0||decision.technique<0;
 return {...matter,decisionCompleted:true,consequence:negative
  ? 'Sua decisão gerou repercussão. O episódio será considerado por Roberto nas próximas avaliações.'
  : 'A condução foi registrada positivamente no histórico supervisionado.'};
}
