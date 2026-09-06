import type { PlayerProfile } from '../types/game';
import { getProfessionalOwnerKey } from './professionalRpg';

export type ExternalPhoneContactId =
  | 'MARIANA'
  | 'PARTNER'
  | 'ROBERTO'
  | 'LAWYER_FELIPE'
  | 'FRIEND_CARLOS';

export interface ExternalPhoneMessage {
  id: string;
  contactId: ExternalPhoneContactId;
  text: string;
  sentAt?: string;
}

interface StoredPhoneMessage {
  id: string;
  contactId: string;
  direction: 'IN' | 'OUT';
  text: string;
  sentAt: string;
}

interface StoredPhoneState {
  messages: StoredPhoneMessage[];
  handledWelcomeCall: boolean;
  callHistory: unknown[];
}

export const PHONE_STATE_UPDATED_EVENT = 'rota:professional-phone-state-updated';
export const PHONE_INCOMING_CALL_EVENT = 'rota:phone-incoming-call';

function clockNow() {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

function storageKey(player: PlayerProfile) {
  return `rota_professional_phone_v1:${getProfessionalOwnerKey(player)}`;
}

function readState(player: PlayerProfile): StoredPhoneState {
  try {
    const raw = window.localStorage.getItem(storageKey(player));
    if (!raw) return { messages: [], handledWelcomeCall: false, callHistory: [] };
    const parsed = JSON.parse(raw) as Partial<StoredPhoneState>;
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      handledWelcomeCall: Boolean(parsed.handledWelcomeCall),
      callHistory: Array.isArray(parsed.callHistory) ? parsed.callHistory : [],
    };
  } catch {
    return { messages: [], handledWelcomeCall: false, callHistory: [] };
  }
}

export function appendProfessionalPhoneMessage(player: PlayerProfile, message: ExternalPhoneMessage) {
  const current = readState(player);
  if (current.messages.some((item) => item.id === message.id)) return false;

  const next: StoredPhoneState = {
    ...current,
    messages: [
      ...current.messages,
      {
        id: message.id,
        contactId: message.contactId,
        direction: 'IN',
        text: message.text,
        sentAt: message.sentAt || clockNow(),
      },
    ].slice(-120),
  };

  try {
    window.localStorage.setItem(storageKey(player), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PHONE_STATE_UPDATED_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function requestIncomingProfessionalCall(contactId: ExternalPhoneContactId) {
  window.dispatchEvent(new CustomEvent(PHONE_INCOMING_CALL_EVENT, { detail: { contactId } }));
}
