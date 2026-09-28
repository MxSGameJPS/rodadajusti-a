import type { CareerTierId, PlayerProfile } from '../types/game';
import { applyProfessionalReputation } from './professionalActTwo';
import { applyWorldMemoryEvent } from './worldMemory';
import { supabase } from './supabase';

export type PublicJurisdiction = 'STATE' | 'FEDERAL';
export type PublicBranch = 'MAGISTRACY' | 'PROSECUTION';
export type PublicAssignmentKind =
  | 'CIVIL_JUDGMENT' | 'CRIMINAL_HEARING' | 'URGENT_ORDER' | 'APPELLATE_VOTE'
  | 'CRIMINAL_CHARGE' | 'CIVIL_INQUIRY' | 'JURY_SESSION' | 'COLLECTIVE_ACTION' | 'APPELLATE_OPINION';
export type PublicDecision = 'GRANT' | 'PARTIAL' | 'DENY' | 'ARCHIVE' | 'PROCEED' | 'DISSENT';

export interface PublicAssignment {
  id: string;
  kind: PublicAssignmentKind;
  title: string;
  summary: string;
  area: string;
  complexity: 1 | 2 | 3 | 4 | 5;
  institutionalWeight: number;
  publicInterest: number;
  options: Array<{ id: PublicDecision; label: string; rationale: string; quality: number; ethics: number }>;
}

export interface PublicServiceGameplayState {
  jurisdiction: PublicJurisdiction | null;
  branch: PublicBranch | null;
  assignment: PublicAssignment | null;
  completedAssignments: string[];
  stats: {
    judicialDecisions: number;
    hearings: number;
    prosecutionActs: number;
    jurySessions: number;
    civilInvestigations: number;
    appellateVotes: number;
    dissents: number;
  };
  correctionRisk: number;
  institutionalEvents: Array<{ id: string; title: string; gameDate: string; impact: number }>;
}

const PREFIX = 'rota_public_gameplay_v1:';
const base = (): PublicServiceGameplayState => ({
  jurisdiction: null, branch: null, assignment: null, completedAssignments: [],
  stats: { judicialDecisions: 0, hearings: 0, prosecutionActs: 0, jurySessions: 0, civilInvestigations: 0, appellateVotes: 0, dissents: 0 },
  correctionRisk: 0, institutionalEvents: [],
});
const owner = (p: PlayerProfile) => p.cloudCareerId || p.name;
const date = (p: PlayerProfile) => [p.gameCurrentYear, String(p.gameCurrentMonth).padStart(2, '0'), String(p.gameCurrentDay).padStart(2, '0')].join('-');
const monthIndex = (p: PlayerProfile) => p.gameCurrentYear * 12 + p.gameCurrentMonth - 1;
const magistracy = new Set<CareerTierId>(['MAGISTRADO_SUBSTITUTO', 'JUIZ_TITULAR', 'DESEMBARGADOR', 'MINISTRO_STF']);
const prosecution = new Set<CareerTierId>(['PROMOTOR_SUBSTITUTO', 'PROMOTOR_JUSTICA', 'PROCURADOR_JUSTICA']);

export function isPublicServiceTier(tier: CareerTierId) { return magistracy.has(tier) || prosecution.has(tier); }
export function publicBranchForTier(tier: CareerTierId): PublicBranch | null { return magistracy.has(tier) ? 'MAGISTRACY' : prosecution.has(tier) ? 'PROSECUTION' : null; }
export function readPublicServiceGameplay(p: PlayerProfile) {
  let state = base();
  try { state = { ...state, ...JSON.parse(localStorage.getItem(PREFIX + owner(p)) || '{}') }; } catch {}
  return state;
}
function cache(p: PlayerProfile, s: PublicServiceGameplayState) { try { localStorage.setItem(PREFIX + owner(p), JSON.stringify(s)); } catch {} }
async function persist(p: PlayerProfile, s: PublicServiceGameplayState) {
  cache(p, s);
  if (!supabase || !p.cloudCareerId) return;
  const { error } = await supabase.from('careers').update({ public_service_gameplay: s, last_played_at: new Date().toISOString() }).eq('id', p.cloudCareerId);
  if (error) throw error;
}
export async function hydratePublicServiceGameplay(p: PlayerProfile) {
  if (supabase && p.cloudCareerId) {
    const { data, error } = await supabase.from('careers').select('public_service_gameplay').eq('id', p.cloudCareerId).maybeSingle();
    if (!error && data?.public_service_gameplay) {
      const state = { ...base(), ...data.public_service_gameplay } as PublicServiceGameplayState;
      cache(p, state); return state;
    }
  }
  return readPublicServiceGameplay(p);
}
export async function choosePublicJurisdiction(p: PlayerProfile, jurisdiction: PublicJurisdiction) {
  const state = readPublicServiceGameplay(p);
  if (!isPublicServiceTier(p.careerTier)) return { ok: false as const, reason: 'NOT_PUBLIC_SERVICE' as const };
  if (state.jurisdiction && state.jurisdiction !== jurisdiction) return { ok: false as const, reason: 'ALREADY_DEFINED' as const };
  const next = { ...state, jurisdiction, branch: publicBranchForTier(p.careerTier) };
  await persist(p, next); return { ok: true as const, state: next };
}

const judgeTemplates = [
  ['CIVIL_JUDGMENT', 'Sentença em ação indenizatória', 'As partes divergem sobre responsabilidade, prova documental e extensão do dano.', 'Civil'],
  ['CRIMINAL_HEARING', 'Audiência de instrução criminal', 'Depoimentos apresentam contradições e exigem condução imparcial da instrução.', 'Penal'],
  ['URGENT_ORDER', 'Pedido de tutela de urgência', 'A medida pode evitar dano imediato, mas exige fundamentação e proporcionalidade.', 'Processual'],
] as const;
const prosecutorTemplates = [
  ['CRIMINAL_CHARGE', 'Análise para oferecimento de denúncia', 'O inquérito chegou ao Ministério Público e exige exame da justa causa.', 'Penal'],
  ['CIVIL_INQUIRY', 'Inquérito civil de interesse coletivo', 'Há indícios de lesão coletiva e necessidade de definir diligências ou medida judicial.', 'Coletivo'],
  ['JURY_SESSION', 'Sessão do Tribunal do Júri', 'A acusação precisa selecionar provas lícitas e sustentar a tese perante os jurados.', 'Penal'],
  ['COLLECTIVE_ACTION', 'Ação civil pública', 'O procedimento aponta possível violação de interesse social relevante.', 'Coletivo'],
] as const;
const appellateJudge = ['APPELLATE_VOTE', 'Recurso distribuído para relatoria', 'O colegiado aguarda relatório e voto fundamentado sobre a decisão recorrida.', 'Recursal'] as const;
const appellateProsecutor = ['APPELLATE_OPINION', 'Parecer perante o Tribunal', 'O recurso foi remetido ao órgão de segundo grau do Ministério Público para manifestação.', 'Recursal'] as const;

function makeAssignment(p: PlayerProfile, state: PublicServiceGameplayState): PublicAssignment {
  const branch = publicBranchForTier(p.careerTier) || state.branch || 'MAGISTRACY';
  const appellate = p.careerTier === 'DESEMBARGADOR' || p.careerTier === 'PROCURADOR_JUSTICA';
  const templates = appellate ? [branch === 'MAGISTRACY' ? appellateJudge : appellateProsecutor] : branch === 'MAGISTRACY' ? judgeTemplates : prosecutorTemplates;
  const seed = (monthIndex(p) * 31 + p.gameCurrentDay * 17 + p.name.length * 13 + state.completedAssignments.length * 7) >>> 0;
  const tpl = templates[seed % templates.length];
  const complexity = Math.min(5, 2 + (seed % 4)) as 1 | 2 | 3 | 4 | 5;
  const id = [branch, state.jurisdiction || 'STATE', date(p), tpl[0], state.completedAssignments.length].join(':');
  const options: PublicAssignment['options'] = branch === 'MAGISTRACY'
    ? [
        { id: 'GRANT', label: appellate ? 'Dar provimento' : 'Acolher o pedido', rationale: 'Fundamente a intervenção com base no conjunto probatório.', quality: seed % 3 === 0 ? 5 : 2, ethics: 4 },
        { id: 'PARTIAL', label: 'Acolher parcialmente', rationale: 'Reconheça apenas o que estiver suficientemente demonstrado.', quality: seed % 3 === 1 ? 5 : 3, ethics: 5 },
        { id: 'DENY', label: appellate ? 'Negar provimento' : 'Rejeitar o pedido', rationale: 'Preserve a situação quando os requisitos não estiverem demonstrados.', quality: seed % 3 === 2 ? 5 : 2, ethics: 4 },
        ...(appellate ? [{ id: 'DISSENT' as const, label: 'Abrir divergência', rationale: 'Apresente voto divergente quando sua interpretação jurídica justificar.', quality: seed % 4 === 0 ? 5 : 2, ethics: 4 }] : []),
      ]
    : [
        { id: 'PROCEED', label: tpl[0] === 'CIVIL_INQUIRY' ? 'Prosseguir com diligências' : 'Prosseguir com a atuação', rationale: 'Há elementos para aprofundar ou ajuizar a medida cabível.', quality: seed % 2 === 0 ? 5 : 3, ethics: 5 },
        { id: 'ARCHIVE', label: 'Promover arquivamento', rationale: 'Não utilize a instituição sem suporte probatório suficiente.', quality: seed % 2 === 1 ? 5 : 2, ethics: 5 },
      ];
  return { id, kind: tpl[0], title: tpl[1], summary: tpl[2], area: tpl[3], complexity, institutionalWeight: 20 + complexity * 10, publicInterest: (seed % 4) * 25, options };
}

export async function ensurePublicAssignment(p: PlayerProfile) {
  const state = readPublicServiceGameplay(p);
  if (!isPublicServiceTier(p.careerTier)) return state;
  if (state.assignment) return state;
  const next = { ...state, branch: publicBranchForTier(p.careerTier), assignment: makeAssignment(p, state) };
  await persist(p, next); return next;
}

export async function resolvePublicAssignment(p: PlayerProfile, decision: PublicDecision) {
  const state = readPublicServiceGameplay(p), assignment = state.assignment;
  if (!assignment) return { ok: false as const, reason: 'NO_ASSIGNMENT' as const };
  const option = assignment.options.find(o => o.id === decision);
  if (!option) return { ok: false as const, reason: 'INVALID_DECISION' as const };
  const qualityDelta = option.quality >= 5 ? 4 : option.quality >= 3 ? 1 : -3;
  const risk = Math.max(0, Math.min(100, state.correctionRisk + (qualityDelta < 0 ? 8 + assignment.complexity * 2 : -3)));
  const stats = { ...state.stats };
  if (state.branch === 'MAGISTRACY') {
    if (assignment.kind === 'APPELLATE_VOTE') stats.appellateVotes++; else stats.judicialDecisions++;
    if (assignment.kind === 'CRIMINAL_HEARING') stats.hearings++;
    if (decision === 'DISSENT') stats.dissents++;
  } else {
    stats.prosecutionActs++;
    if (assignment.kind === 'JURY_SESSION') stats.jurySessions++;
    if (assignment.kind === 'CIVIL_INQUIRY') stats.civilInvestigations++;
    if (assignment.kind === 'APPELLATE_OPINION') stats.appellateVotes++;
  }
  const event = { id: assignment.id, title: assignment.title, gameDate: date(p), impact: qualityDelta };
  const next: PublicServiceGameplayState = {
    ...state, assignment: null, stats, correctionRisk: risk,
    completedAssignments: [...state.completedAssignments, assignment.id].slice(-250),
    institutionalEvents: [event, ...state.institutionalEvents].slice(0, 80),
  };
  await persist(p, next);
  applyProfessionalReputation(p, { technical: qualityDelta, institutionalRespect: qualityDelta, publicRecognition: assignment.publicInterest >= 50 ? Math.max(-2, qualityDelta) : 0 }, assignment.title, 'public-assignment:' + assignment.id);
  if (assignment.publicInterest >= 50) await applyWorldMemoryEvent(p, { memoryKey: 'public-assignment:' + assignment.id, kind: 'PUBLIC_SERVICE_DECISION', title: assignment.title, description: option.label, scope: assignment.publicInterest >= 75 ? 'NATIONAL' : 'PROFESSIONAL_COMMUNITY', intensity: assignment.publicInterest, respectDelta: qualityDelta, trustDelta: option.ethics >= 5 ? 2 : 0, rivalryDelta: decision === 'DISSENT' ? 2 : 0 });
  return { ok: true as const, state: next, qualityDelta, option, assignment };
}
