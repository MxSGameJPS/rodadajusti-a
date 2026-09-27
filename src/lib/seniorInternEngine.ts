import type { PlayerProfile } from '../types/game';

export type SeniorPriorityKind = 'DEADLINE' | 'CLIENT' | 'EVIDENCE' | 'RESEARCH' | 'DILIGENCE';
export interface SeniorPriority {
  id: string;
  kind: SeniorPriorityKind;
  title: string;
  detail: string;
  urgency: 'NORMAL' | 'IMPORTANTE' | 'URGENTE' | 'CRITICO';
  minutes: number;
  dueLabel: string;
  recommended: boolean;
}

function hash(value: string) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
function key(player: PlayerProfile) {
  return [player.gameCurrentYear, player.gameCurrentMonth, player.gameCurrentDay, player.avatarSeed].join(':');
}

export function getSeniorDailyDesk(player: PlayerProfile): SeniorPriority[] {
  if (player.careerTier !== 'ESTAGIARIO_SENIOR') return [];
  const seed = hash(key(player));
  const pool: SeniorPriority[] = [
    { id: 'deadline', kind: 'DEADLINE', title: 'Revisar minuta antes do prazo', detail: 'Confira fatos, fundamentos, pedidos e documentos antes de entregar a minuta ao Dr. Roberto.', urgency: 'CRITICO', minutes: 55, dueLabel: 'Hoje, 13:30', recommended: true },
    { id: 'client', kind: 'CLIENT', title: 'Retorno ao cliente', detail: 'O cliente aguarda atualização. Organize o que pode ser informado sem prometer resultado.', urgency: 'IMPORTANTE', minutes: 25, dueLabel: 'Hoje', recommended: false },
    { id: 'evidence', kind: 'EVIDENCE', title: 'Auditar documentos do caso', detail: 'Há uma inconsistência documental que precisa ser sinalizada antes da revisão do advogado.', urgency: 'URGENTE', minutes: 40, dueLabel: 'Hoje, 12:30', recommended: true },
    { id: 'research', kind: 'RESEARCH', title: 'Pesquisa jurisprudencial orientada', detail: 'Prepare uma síntese curta com precedentes realmente pertinentes à controvérsia.', urgency: 'NORMAL', minutes: 45, dueLabel: 'Amanhã', recommended: false },
    { id: 'diligence', kind: 'DILIGENCE', title: 'Preparar diligência externa', detail: 'Confira documentos, destino e objetivo antes de sair do escritório.', urgency: 'IMPORTANTE', minutes: 30, dueLabel: 'Hoje', recommended: false },
  ];
  const rotated = [...pool.slice(seed % pool.length), ...pool.slice(0, seed % pool.length)];
  return rotated.slice(0, 4);
}

export function buildSeniorFirstDayDialogues(player: PlayerProfile) {
  const desk = getSeniorDailyDesk(player);
  return [
    { eyebrow: 'Novo nível de responsabilidade', text: `${player.name || 'Colega'}, algumas coisas mudaram. O Dr. Roberto pediu para eu não organizar mais toda a sua ordem de trabalho. Como Sênior, parte das prioridades agora será sua.` },
    { eyebrow: 'Sua mesa', text: `Hoje existem ${desk.length} demandas na sua mesa. Algumas têm prazo mais sensível do que outras. Você precisa avaliar impacto, tempo disponível e urgência antes de começar.` },
    { eyebrow: 'Autonomia supervisionada', text: 'Você continua atuando sob responsabilidade dos advogados do escritório. A diferença é que agora esperamos que você identifique riscos, proponha caminhos e peça orientação quando realmente precisar.' },
  ];
}
