import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCheck,
  MessageCircle,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  Search,
  Send,
  Smartphone,
  UserRound,
  X,
} from 'lucide-react';
import { GAME_CASES } from '../../data/cases';
import { isProfessionalEmploymentActive } from '../../lib/professionalEmployment';
import { getProfessionalOwnerKey, readCurrentPlayerSnapshot } from '../../lib/professionalRpg';
import { usePlayerDisplayName } from '../../lib/playerTreatment';
import type { PlayerProfile } from '../../types/game';
import { sound } from '../../utils/sound';
import styles from './ProfessionalPhone.module.css';

const OPEN_PHONE_EVENT = 'rota:open-professional-phone';

type PhoneTab = 'WHATSAPP' | 'CALLS';
type ContactId = 'MARIANA' | 'ROBERTO' | 'CLIENT';
type CallStatus = 'IDLE' | 'DIALING' | 'CONNECTED';

interface PhoneMessage {
  id: string;
  contactId: ContactId;
  direction: 'IN' | 'OUT';
  text: string;
  sentAt: string;
}

interface PhoneConversationState {
  messages: PhoneMessage[];
  handledWelcomeCall: boolean;
}

interface Contact {
  id: ContactId;
  name: string;
  role: string;
  avatar?: string;
  available: boolean;
}

function clockNow() {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

function emptyPhoneState(): PhoneConversationState {
  return {
    handledWelcomeCall: false,
    messages: [
      {
        id: 'welcome-mariana',
        contactId: 'MARIANA',
        direction: 'IN',
        text: 'Olá! Este é o seu número profissional. Quando o Dr. Roberto distribuir um novo atendimento, também posso avisar você por aqui.',
        sentAt: clockNow(),
      },
      {
        id: 'welcome-roberto',
        contactId: 'ROBERTO',
        direction: 'IN',
        text: 'Mantenha este telefone disponível durante o expediente. Assuntos urgentes de clientes e do escritório podem chegar por aqui.',
        sentAt: clockNow(),
      },
    ],
  };
}

function phoneStorageKey(player: PlayerProfile) {
  return `rota_professional_phone_v1:${getProfessionalOwnerKey(player)}`;
}

function readPhoneState(player: PlayerProfile): PhoneConversationState {
  try {
    const raw = window.localStorage.getItem(phoneStorageKey(player));
    if (!raw) return emptyPhoneState();
    const parsed = JSON.parse(raw) as Partial<PhoneConversationState>;
    return {
      handledWelcomeCall: Boolean(parsed.handledWelcomeCall),
      messages: Array.isArray(parsed.messages) ? parsed.messages : emptyPhoneState().messages,
    };
  } catch {
    return emptyPhoneState();
  }
}

function savePhoneState(player: PlayerProfile, state: PhoneConversationState) {
  try {
    window.localStorage.setItem(phoneStorageKey(player), JSON.stringify(state));
  } catch {
    // O telefone continua funcional durante a sessão sem persistência local.
  }
}

function autoReply(contactId: ContactId, hasActiveCase: boolean) {
  if (contactId === 'ROBERTO') {
    return hasActiveCase
      ? 'Concentre-se no caso que está no seu CRM. Se surgir uma decisão estratégica importante, venha falar comigo no escritório.'
      : 'Ainda não distribuí um novo caso. Quando houver um atendimento adequado, a Mariana vai disponibilizá-lo no seu CRM.';
  }
  if (contactId === 'MARIANA') {
    return hasActiveCase
      ? 'Seu caso ativo continua registrado no Social Jurídico. Confira o CRM e os prazos pelo notebook.'
      : 'Assim que o Dr. Roberto fizer uma distribuição, eu cadastro o atendimento no seu CRM e aviso você.';
  }
  return 'Obrigado, doutor(a). Vou separar as informações e lhe retorno assim que possível.';
}

export const ProfessionalPhone: React.FC = () => {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<PhoneTab>('WHATSAPP');
  const [selectedContactId, setSelectedContactId] = useState<ContactId>('MARIANA');
  const [phoneState, setPhoneState] = useState<PhoneConversationState | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [incomingContactId, setIncomingContactId] = useState<ContactId | null>(null);
  const [callContactId, setCallContactId] = useState<ContactId | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('IDLE');
  const [callSeconds, setCallSeconds] = useState(0);
  const welcomeTimerRef = useRef<number | null>(null);
  const displayName = usePlayerDisplayName(player, 'Advogado');

  const activeCase = useMemo(
    () => GAME_CASES.find((caseItem) => caseItem.id === player?.activeCase?.caseId) || null,
    [player?.activeCase?.caseId],
  );

  const contacts = useMemo<Contact[]>(
    () => [
      {
        id: 'MARIANA',
        name: 'Mariana Duarte',
        role: 'Secretária • Ramos & Associados',
        avatar: '/personagens/mariana-duarte.png',
        available: true,
      },
      {
        id: 'ROBERTO',
        name: 'Dr. Roberto Ramos',
        role: 'Sócio responsável',
        avatar: '/personagens/dr-roberto-ramos.png',
        available: true,
      },
      {
        id: 'CLIENT',
        name: activeCase?.client.name || 'Cliente do caso',
        role: activeCase ? `${activeCase.code} • ${activeCase.area}` : 'Nenhum cliente atribuído',
        available: Boolean(activeCase),
      },
    ],
    [activeCase],
  );

  useEffect(() => {
    let active = true;

    const sync = () => {
      const current = readCurrentPlayerSnapshot();
      if (!active || !current || !isProfessionalEmploymentActive(current)) {
        if (active) setPlayer(null);
        return;
      }

      setPlayer(current);
      setPhoneState((existing) => existing || readPhoneState(current));
    };

    sync();
    const timer = window.setInterval(sync, 900);
    const openPhone = () => {
      sync();
      sound.playClick();
      setIsOpen(true);
    };
    window.addEventListener(OPEN_PHONE_EVENT, openPhone);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(OPEN_PHONE_EVENT, openPhone);
    };
  }, []);

  useEffect(() => {
    if (!player || !phoneState || phoneState.handledWelcomeCall || welcomeTimerRef.current !== null) return;

    welcomeTimerRef.current = window.setTimeout(() => {
      setIncomingContactId('MARIANA');
      welcomeTimerRef.current = null;
    }, 12000);

    return () => {
      if (welcomeTimerRef.current !== null) {
        window.clearTimeout(welcomeTimerRef.current);
        welcomeTimerRef.current = null;
      }
    };
  }, [player, phoneState]);

  useEffect(() => {
    if (callStatus !== 'CONNECTED') return undefined;
    const timer = window.setInterval(() => setCallSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [callStatus]);

  useEffect(() => {
    if (callStatus !== 'DIALING') return undefined;
    const timer = window.setTimeout(() => setCallStatus('CONNECTED'), 1600);
    return () => window.clearTimeout(timer);
  }, [callStatus, callContactId]);

  if (!player || !phoneState) return null;

  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) || contacts[0];
  const callContact = contacts.find((contact) => contact.id === callContactId) || null;
  const selectedMessages = phoneState.messages.filter((message) => message.contactId === selectedContactId);

  const updatePhoneState = (next: PhoneConversationState) => {
    setPhoneState(next);
    savePhoneState(player, next);
  };

  const markWelcomeCallHandled = () => {
    updatePhoneState({ ...phoneState, handledWelcomeCall: true });
  };

  const acceptIncomingCall = () => {
    if (!incomingContactId) return;
    sound.playClick();
    markWelcomeCallHandled();
    setCallContactId(incomingContactId);
    setIncomingContactId(null);
    setCallSeconds(0);
    setCallStatus('CONNECTED');
    setTab('CALLS');
    setIsOpen(true);
  };

  const rejectIncomingCall = () => {
    sound.playClick();
    markWelcomeCallHandled();
    setIncomingContactId(null);
  };

  const startCall = (contactId: ContactId) => {
    const contact = contacts.find((item) => item.id === contactId);
    if (!contact?.available) return;
    sound.playClick();
    setCallContactId(contactId);
    setCallSeconds(0);
    setCallStatus('DIALING');
    setTab('CALLS');
  };

  const endCall = () => {
    sound.playClick();
    setCallContactId(null);
    setCallStatus('IDLE');
    setCallSeconds(0);
  };

  const sendMessage = () => {
    const text = messageDraft.trim();
    if (!text || !selectedContact.available) return;

    sound.playClick();
    const outgoing: PhoneMessage = {
      id: `msg-out-${Date.now()}`,
      contactId: selectedContactId,
      direction: 'OUT',
      text,
      sentAt: clockNow(),
    };
    const next = { ...phoneState, messages: [...phoneState.messages, outgoing] };
    updatePhoneState(next);
    setMessageDraft('');

    window.setTimeout(() => {
      setPhoneState((current) => {
        if (!current) return current;
        const incoming: PhoneMessage = {
          id: `msg-in-${Date.now()}`,
          contactId: selectedContactId,
          direction: 'IN',
          text: autoReply(selectedContactId, Boolean(activeCase)),
          sentAt: clockNow(),
        };
        const replied = { ...current, messages: [...current.messages, incoming] };
        savePhoneState(player, replied);
        return replied;
      });
    }, 1000);
  };

  const callTime = `${String(Math.floor(callSeconds / 60)).padStart(2, '0')}:${String(callSeconds % 60).padStart(2, '0')}`;

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        onClick={() => {
          sound.playClick();
          setIsOpen(true);
        }}
        title="Abrir celular profissional"
        aria-label="Abrir celular profissional"
      >
        <Smartphone size={20} />
        <span>Celular</span>
        {incomingContactId && <i />}
      </button>

      {incomingContactId && (
        <aside className={styles.incomingCall} aria-label="Ligação recebida">
          <div className={styles.incomingPulse}><PhoneIncoming size={23} /></div>
          <div className={styles.incomingCopy}>
            <span>Ligação recebida</span>
            <strong>{contacts.find((contact) => contact.id === incomingContactId)?.name}</strong>
            <small>Celular profissional</small>
          </div>
          <div className={styles.incomingActions}>
            <button type="button" className={styles.rejectButton} onClick={rejectIncomingCall} aria-label="Recusar ligação"><PhoneOff size={17} /></button>
            <button type="button" className={styles.acceptButton} onClick={acceptIncomingCall} aria-label="Atender ligação"><PhoneCall size={17} /></button>
          </div>
        </aside>
      )}

      {isOpen && (
        <div className={styles.backdrop}>
          <section className={styles.phoneFrame} role="dialog" aria-modal="true" aria-label="Celular profissional">
            <div className={styles.phoneSpeaker} />
            <header className={styles.phoneHeader}>
              <div>
                <span>Ramos & Associados</span>
                <strong>{displayName}</strong>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Fechar celular"><X size={17} /></button>
            </header>

            <nav className={styles.tabs} aria-label="Aplicativos do celular">
              <button type="button" className={tab === 'WHATSAPP' ? styles.activeTab : ''} onClick={() => setTab('WHATSAPP')}>
                <MessageCircle size={16} /> WhatsApp
              </button>
              <button type="button" className={tab === 'CALLS' ? styles.activeTab : ''} onClick={() => setTab('CALLS')}>
                <Phone size={16} /> Ligações
              </button>
            </nav>

            {tab === 'WHATSAPP' && (
              <div className={styles.appBody}>
                <div className={styles.contactList}>
                  <div className={styles.searchBar}><Search size={14} /><span>Conversas profissionais</span></div>
                  {contacts.map((contact) => {
                    const lastMessage = [...phoneState.messages].reverse().find((message) => message.contactId === contact.id);
                    return (
                      <button
                        type="button"
                        key={contact.id}
                        disabled={!contact.available}
                        className={selectedContactId === contact.id ? styles.selectedContact : ''}
                        onClick={() => setSelectedContactId(contact.id)}
                      >
                        <div className={styles.avatar}>
                          {contact.avatar ? <img src={contact.avatar} alt="" /> : <UserRound size={18} />}
                        </div>
                        <div className={styles.contactText}>
                          <strong>{contact.name}</strong>
                          <span>{lastMessage?.text || contact.role}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className={styles.chatPanel}>
                  <header className={styles.chatHeader}>
                    <div>
                      <strong>{selectedContact.name}</strong>
                      <span>{selectedContact.role}</span>
                    </div>
                    <button type="button" disabled={!selectedContact.available} onClick={() => startCall(selectedContact.id)} aria-label={`Ligar para ${selectedContact.name}`}>
                      <Phone size={16} />
                    </button>
                  </header>

                  <div className={styles.messages}>
                    {!selectedContact.available && (
                      <div className={styles.emptyChat}>Quando um caso for atribuído no CRM, o cliente ficará disponível para contato.</div>
                    )}
                    {selectedMessages.map((message) => (
                      <div key={message.id} className={message.direction === 'OUT' ? styles.outgoingMessage : styles.incomingMessageBubble}>
                        <p>{message.text}</p>
                        <span>{message.sentAt}{message.direction === 'OUT' && <CheckCheck size={11} />}</span>
                      </div>
                    ))}
                  </div>

                  <form
                    className={styles.composer}
                    onSubmit={(event) => {
                      event.preventDefault();
                      sendMessage();
                    }}
                  >
                    <input
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      placeholder={selectedContact.available ? 'Mensagem profissional...' : 'Contato indisponível'}
                      disabled={!selectedContact.available}
                    />
                    <button type="submit" disabled={!messageDraft.trim() || !selectedContact.available} aria-label="Enviar mensagem"><Send size={16} /></button>
                  </form>
                </div>
              </div>
            )}

            {tab === 'CALLS' && (
              <div className={styles.callsApp}>
                {callStatus !== 'IDLE' && callContact ? (
                  <div className={styles.activeCall}>
                    <div className={styles.callAvatar}>
                      {callContact.avatar ? <img src={callContact.avatar} alt="" /> : <UserRound size={30} />}
                    </div>
                    <span>{callStatus === 'DIALING' ? 'Chamando...' : 'Ligação em andamento'}</span>
                    <h3>{callContact.name}</h3>
                    <p>{callContact.role}</p>
                    <strong>{callStatus === 'CONNECTED' ? callTime : '...'}</strong>
                    {callStatus === 'CONNECTED' && (
                      <div className={styles.callTranscript}>
                        {callContact.id === 'MARIANA'
                          ? 'Mariana: “Seu celular está funcionando. Use o notebook para o CRM e me chame por aqui quando precisar falar comigo durante a rotina.”'
                          : callContact.id === 'ROBERTO'
                            ? 'Dr. Roberto: “Mantenha o foco no atendimento que foi atribuído. Qualquer questão estratégica importante pode ser discutida comigo.”'
                            : `${callContact.name}: “Doutor(a), estou à disposição para esclarecer as informações do meu caso.”`}
                      </div>
                    )}
                    <button type="button" className={styles.hangupButton} onClick={endCall}><PhoneOff size={19} /> Encerrar</button>
                  </div>
                ) : (
                  <div className={styles.callDirectory}>
                    <div className={styles.callIntro}>
                      <Phone size={24} />
                      <div><span>Telefone</span><strong>Contatos profissionais</strong></div>
                    </div>
                    {contacts.map((contact) => (
                      <button type="button" key={contact.id} disabled={!contact.available} onClick={() => startCall(contact.id)}>
                        <div className={styles.avatar}>
                          {contact.avatar ? <img src={contact.avatar} alt="" /> : <UserRound size={18} />}
                        </div>
                        <div className={styles.contactText}><strong>{contact.name}</strong><span>{contact.role}</span></div>
                        <PhoneCall size={17} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
};
