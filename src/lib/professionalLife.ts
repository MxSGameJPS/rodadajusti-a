import { GAME_CASES } from '../data/cases';
import type { PlayerProfile } from '../types/game';
import { getProfessionalOwnerKey } from './professionalRpg';
import {
  getAssignmentContext,
  getProcessStatusInfo,
  getProfessionalAssignedCase,
} from './processLifecycle';
import { readSocialLifeState } from './socialLife';
import { appendProfessionalPhoneMessage } from './professionalPhoneBridge';

export type ProfessionalAgendaTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success' | 'social';
export type ProfessionalAgendaAction = 'CRM' | 'PHONE' | 'SOCIAL' | 'CASE';

export interface ProfessionalAgendaItem {
  id: string;
  title: string;
  description: string;
  meta: string;
  tone: ProfessionalAgendaTone;
  action: ProfessionalAgendaAction;
  urgent: boolean;
}

interface PulseState {
  version: 1;
  notifiedKeys: string[];
}

const PULSE_PREFIX = 'rota_professional_life_pulse_v1:';

function pulseStorageKey(player: PlayerProfile) {
  return `${PULSE_PREFIX}${getProfessionalOwnerKey(player)}`;
}

function readPulseState(player: PlayerProfile): PulseState {
  try {
    const raw = window.localStorage.getItem(pulseStorageKey(player));
    if (!raw) return { version: 1, notifiedKeys: [] };
    const parsed = JSON.parse(raw) as Partial<PulseState>;
    return {
      version: 1,
      notifiedKeys: Array.isArray(parsed.notifiedKeys)
        ? parsed.notifiedKeys.filter((value): value is string => typeof value === 'string').slice(-120)
        : [],
    };
  } catch {
    return { version: 1, notifiedKeys: [] };
  }
}

function markNotified(player: PlayerProfile, current: PulseState, key: string) {
  if (current.notifiedKeys.includes(key)) return current;
  const next = { version: 1 as const, notifiedKeys: [...current.notifiedKeys, key].slice(-120) };
  try {
    window.localStorage.setItem(pulseStorageKey(player), JSON.stringify(next));
  } catch {
    // O aviso pode reaparecer em outra sessão se o armazenamento estiver indisponível.
  }
  return next;
}

function dateLabel(player: PlayerProfile) {
  return `${String(player.gameCurrentDay).padStart(2, '0')}/${String(player.gameCurrentMonth).padStart(2, '0')}/${player.gameCurrentYear}`;
}

export function buildProfessionalAgenda(player: PlayerProfile): ProfessionalAgendaItem[] {
  const items: ProfessionalAgendaItem[] = [];
  const activeCase = GAME_CASES.find((caseItem) => caseItem.id === player.activeCase?.caseId) || null;

  if (activeCase && player.activeCase) {
    const remaining = Math.max(0, activeCase.deadlineHours - player.activeCase.hoursSpent);
    items.push({
      id: `active-${activeCase.id}`,
      title: `Prazo do caso ${activeCase.code}`,
      description: activeCase.title,
      meta: remaining <= 0 ? 'Prazo esgotado' : `${remaining}h processuais restantes`,
      tone: remaining <= 12 ? 'danger' : remaining <= 24 ? 'warning' : 'info',
      action: 'CASE',
      urgent: remaining <= 24,
    });
  }

  const assigned = getProfessionalAssignedCase(player, GAME_CASES);
  if (!player.activeCase && assigned) {
    const context = getAssignmentContext(assigned, player);
    items.push({
      id: `assigned-${assigned.id}`,
      title: context.title,
      description: `${assigned.code} • ${assigned.title}`,
      meta: context.isAppeal ? context.description : 'Aguardando aceite no CRM',
      tone: context.isAppeal ? 'warning' : 'info',
      action: 'CRM',
      urgent: context.isAppeal,
    });
  }

  for (const record of player.history.slice(0, 6)) {
    const info = getProcessStatusInfo(record, player, GAME_CASES);
    if (info.status === 'PRAZO_RECURSAL_ABERTO') {
      items.push({
        id: `appeal-${record.caseId}`,
        title: 'Prazo recursal em aberto',
        description: record.caseTitle,
        meta: info.appealDeadlineLabel
          ? `${info.appealTypeLabel || 'Recurso'} • até ${info.appealDeadlineLabel}`
          : info.appealTypeLabel || 'Recurso cabível',
        tone: 'danger',
        action: 'CRM',
        urgent: true,
      });
      continue;
    }

    if (info.status === 'RECURSO_PARTE_CONTRARIA') {
      items.push({
        id: `opponent-appeal-${record.caseId}`,
        title: 'A parte contrária recorreu',
        description: record.caseTitle,
        meta: info.description,
        tone: 'warning',
        action: 'CRM',
        urgent: true,
      });
      continue;
    }

    if (info.status === 'AGUARDANDO_CAPACIDADE') {
      items.push({
        id: `locked-appeal-${record.caseId}`,
        title: info.label,
        description: record.caseTitle,
        meta: info.description,
        tone: 'neutral',
        action: 'CRM',
        urgent: false,
      });
    }
  }

  const social = readSocialLifeState(player);
  if (social.activeCondition && social.activeCondition.hearingModifier < 0) {
    items.push({
      id: `energy-${social.activeCondition.sourceEventId}`,
      title: social.activeCondition.label === 'EXAUSTO' ? 'Você está exausto' : 'Você está cansado',
      description: `Energia atual: ${social.energy}/100. ${social.activeCondition.sourceTitle} ainda está afetando sua disposição.`,
      meta: 'Vida pessoal • pode influenciar audiência',
      tone: social.activeCondition.label === 'EXAUSTO' ? 'danger' : 'warning',
      action: 'SOCIAL',
      urgent: social.activeCondition.label === 'EXAUSTO',
    });
  }

  if (social.pendingEvent) {
    const risk = social.pendingEvent.professionalRisk;
    items.push({
      id: social.pendingEvent.id,
      title: social.pendingEvent.title,
      description: `${social.pendingEvent.contactName}: ${social.pendingEvent.contactRole}`,
      meta: risk && risk.level !== 'LOW'
        ? `Vida social • atenção: ${risk.caseCode} está em andamento`
        : 'Vida social • decisão pendente',
      tone: risk?.level === 'CRITICAL' ? 'danger' : risk?.level === 'HIGH' ? 'warning' : 'social',
      action: 'SOCIAL',
      urgent: risk?.level === 'CRITICAL',
    });
  }

  if (items.length === 0) {
    items.push({
      id: `quiet-${dateLabel(player)}`,
      title: 'Expediente sem pendências urgentes',
      description: 'Use o tempo para revisar o CRM, organizar a agenda e acompanhar movimentações dos processos.',
      meta: dateLabel(player),
      tone: 'success',
      action: 'CRM',
      urgent: false,
    });
  }

  return items.slice(0, 7);
}

export function emitProfessionalLifeNotifications(player: PlayerProfile) {
  let pulse = readPulseState(player);
  const activeCase = GAME_CASES.find((caseItem) => caseItem.id === player.activeCase?.caseId) || null;

  if (activeCase && player.activeCase) {
    const remaining = activeCase.deadlineHours - player.activeCase.hoursSpent;
    if (remaining <= 24) {
      const key = `deadline:${activeCase.id}:${remaining <= 12 ? 'critical' : 'warning'}`;
      if (!pulse.notifiedKeys.includes(key)) {
        appendProfessionalPhoneMessage(player, {
          id: `life-${key}`,
          contactId: 'MARIANA',
          text: remaining <= 0
            ? `Atenção: o prazo do caso ${activeCase.code} está esgotado no CRM. Verifique imediatamente a situação processual.`
            : `Atenção ao prazo do caso ${activeCase.code}: restam aproximadamente ${remaining}h processuais. O Dr. Roberto pediu prioridade na conferência do CRM.`,
        });
        pulse = markNotified(player, pulse, key);
      }
    }
  }

  const assigned = getProfessionalAssignedCase(player, GAME_CASES);
  if (!player.activeCase && assigned) {
    const context = getAssignmentContext(assigned, player);
    const key = `assignment:${assigned.id}`;
    if (!pulse.notifiedKeys.includes(key)) {
      appendProfessionalPhoneMessage(player, {
        id: `life-${key}`,
        contactId: 'MARIANA',
        text: context.isAppeal
          ? `Doutor(a), aquele processo voltou. ${context.description} O Dr. Roberto pediu para você abrir o CRM e analisar a nova etapa.`
          : `O Dr. Roberto distribuiu um novo atendimento para você: ${assigned.code} — ${assigned.title}. Já está disponível no CRM.`,
      });
      pulse = markNotified(player, pulse, key);
    }
  }

  for (const record of player.history.slice(0, 8)) {
    const info = getProcessStatusInfo(record, player, GAME_CASES);
    if (info.status !== 'PRAZO_RECURSAL_ABERTO' && info.status !== 'RECURSO_PARTE_CONTRARIA') continue;
    const key = `process:${record.caseId}:${info.status}`;
    if (pulse.notifiedKeys.includes(key)) continue;

    appendProfessionalPhoneMessage(player, {
      id: `life-${key}`,
      contactId: 'MARIANA',
      text: info.status === 'PRAZO_RECURSAL_ABERTO'
        ? `Saiu uma decisão desfavorável no processo “${record.caseTitle}”. ${info.appealTypeLabel || 'Há recurso cabível'}${info.appealDeadlineLabel ? ` até ${info.appealDeadlineLabel}` : ''}. O processo ainda não terminou.`
        : `Movimentação importante: a parte contrária recorreu no processo “${record.caseTitle}”. O processo ainda não transitou em julgado e seguirá em grau recursal.`,
    });
    pulse = markNotified(player, pulse, key);
  }

  return pulse;
}
