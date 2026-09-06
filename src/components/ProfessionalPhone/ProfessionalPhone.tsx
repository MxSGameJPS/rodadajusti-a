import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCheck,
  FileText,
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
import {
  isProfessionalEmploymentActive,
  isRamosEmploymentActive,
} from '../../lib/professionalEmployment';
import { getProfessionalOwnerKey, readCurrentPlayerSnapshot } from '../../lib/professionalRpg';
import { usePlayerDisplayName } from '../../lib/playerTreatment';
import type { PlayerProfile } from '../../types/game';
import { sound } from '../../utils/sound';
import styles from './ProfessionalPhone.module.css';
import transcriptStyles from './ProfessionalPhoneTranscript.module.css';

const OPEN_PHONE_EVENT = 'rota:open-professional-phone';

type PhoneTab = 'WHATSAPP' | 'CALLS';
type ContactId = 'MARIANA' | 'ROBERTO' | 'CLIENT';
type CallStatus = 'IDLE' | 'DIALING' | 'CONNECTED';
type CallDirection = 'IN' | 'OUT';

interface PhoneMessage {
  id: string;
  contactId: ContactId;
  direction: 'IN' | 'OUT';
  text: string;
  sentAt: string;
}

interface CallTranscriptLine {
  id: string;
  speaker: 'CONTACT' | 'PLAYER';
  text: string;
}

interface CallHistoryRecord {
  id: string;
  contactId: ContactId;
  direction: CallDirection;
  startedAt: string;
  durationSeconds: number;
  transcript: CallTranscriptLine[];
  caseId?: string;
}

interface PhoneConversationState {
  messages: PhoneMessage[];
  handledWelcomeCall: boolean;
  callHistory: CallHistoryRecord[];
}

interface Contact {
  id: ContactId;
  name: string;
  role: string;
  avatar?: string;
  available: boolean;
}

interface CallOption {
  id: string;
  label: string;
  response: string;
}

function clockNow() {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

function emptyPhoneState(): PhoneConversationState {
  return {
    handledWelcomeCall: false,
    callHistory: [],
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
      callHistory: Array.isArray(parsed.callHistory) ? parsed.callHistory : [],
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

function sameRelevantPlayer(left: PlayerProfile | null, right: PlayerProfile) {
  if (!left) return false;
  return (
    left.cloudCareerId === right.cloudCareerId &&
    left.name === right.name &&
    left.careerTier === right.careerTier &&
    left.officeDiscipline?.employmentStatus === right.officeDiscipline?.employmentStatus &&
    left.activeCase?.caseId === right.activeCase?.caseId &&
    left.activeCase?.hoursSpent === right.activeCase?.hoursSpent &&
    left.gameCurrentDay === right.gameCurrentDay &&
    left.gameCurrentMonth === right.gameCurrentMonth &&
    left.gameCurrentYear === right.gameCurrentYear
  );
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

function callOpening(contactId: ContactId, hasActiveCase: boolean, clientName?: string) {
  if (contactId === 'MARIANA') {
    return hasActiveCase
      ? 'Doutor, estou ligando para confirmar que o atendimento distribuído pelo Dr. Roberto já está no seu CRM. Confira o dossiê e os prazos antes de falar com o cliente.'
      : 'Doutor, estou ligando para confirmar que seu celular profissional está funcionando. Quando o Dr. Roberto distribuir um atendimento, eu vou disponibilizá-lo no CRM e avisar você.';
  }
  if (contactId === 'ROBERTO') {
    return hasActiveCase
      ? 'Revise o caso que está no seu CRM com atenção. Quero que qualquer decisão estratégica importante seja tomada com base no dossiê e nos prazos registrados no Social Jurídico.'
      : 'Ainda não há caso novo para você. Assim que eu fizer uma distribuição, a Mariana vai registrar o atendimento no CRM.';
  }
  return `Doutor, aqui é ${clientName || 'o cliente'}. Estou à disposição para esclarecer as informações do meu caso e enviar o que for necessário.`;
}

function callOptions(contactId: ContactId, hasActiveCase: boolean): CallOption[] {
  if (contactId === 'MARIANA') {
    return hasActiveCase
      ? [
          {
            id: 'crm',
            label: 'Obrigado, Mariana. Vou conferir o CRM agora.',
            response: 'Perfeito. Se houver documento novo, prazo ou orientação do Dr. Roberto, eu registro no atendimento e aviso você pelo celular.',
          },
          {
            id: 'orientacao',
            label: 'O Dr. Roberto deixou alguma orientação específica?',
            response: 'Por enquanto, a orientação é revisar o dossiê antes de qualquer contato externo. Se ele acrescentar algo, aparecerá no histórico do atendimento.',
          },
          {
            id: 'prazo',
            label: 'Me avise imediatamente se houver prazo urgente.',
            response: 'Pode deixar. Os prazos ficam no Social Jurídico, e eu também aviso você por aqui quando houver algo que exija atenção imediata.',
          },
        ]
      : [
          {
            id: 'entendido',
            label: 'Entendido. Vou manter o celular disponível.',
            response: 'Ótimo. O notebook fica para a operação no Social Jurídico e o celular para ligações e WhatsApp do escritório.',
          },
          {
            id: 'casos',
            label: 'Como vou saber quando chegar meu primeiro caso?',
            response: 'O Dr. Roberto define a distribuição. Eu disponibilizo um atendimento por vez no seu CRM e aviso você pelo WhatsApp ou por ligação.',
          },
        ];
  }

  if (contactId === 'ROBERTO') {
    return hasActiveCase
      ? [
          {
            id: 'revisar',
            label: 'Vou revisar o dossiê antes de falar com o cliente.',
            response: 'É isso que espero. Primeiro entenda fatos, documentos e prazos. Depois escolha a estratégia e registre as providências no sistema.',
          },
          {
            id: 'duvida',
            label: 'Se eu tiver dúvida estratégica, posso retornar?',
            response: 'Sim. Questões relevantes podem ser discutidas comigo, mas quero que você chegue com o problema identificado e uma proposta de encaminhamento.',
          },
        ]
      : [
          {
            id: 'aguardar',
            label: 'Certo, doutor. Vou aguardar a distribuição.',
            response: 'Perfeito. Use esse tempo para conhecer as ferramentas do Social Jurídico e manter sua agenda organizada.',
          },
        ];
  }

  return [
    {
      id: 'documentos',
      label: 'Vou revisar os documentos e retorno com as próximas orientações.',
      response: 'Tudo bem, doutor. Se precisar de algum documento ou informação complementar, pode me solicitar por WhatsApp.',
    },
    {
      id: 'fatos',
      label: 'Antes de avançarmos, preciso confirmar alguns fatos do caso.',
      response: 'Claro. Pode perguntar o que precisar. Quero que o senhor tenha todas as informações antes de decidir o próximo passo.',
    },
  ];
}

function formatDuration(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
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
  const [callDirection, setCallDirection] = useState<CallDirection>('OUT');
  const [callSeconds, setCallSeconds] = useState(0);
  const [callTranscript, setCallTranscript] = useState<CallTranscriptLine[]>([]);
  const [callResponseUsed, setCallResponseUsed] = useState(false);
  const [awaitingCallReply, setAwaitingCallReply] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const welcomeTimerRef = useRef<number | null>(null);
  const displayName = usePlayerDisplayName(player, 'Advogado');
  const ramosEmploymentActive = Boolean(player && isRamosEmploymentActive(player));

  const activeCase = useMemo(
    () => GAME_CASES.find((caseItem) => caseItem.id === player?.activeCase?.caseId) || null,
    [player?.activeCase?.caseId],
  );

  const contacts = useMemo<Contact[]>(
    () => [
      {
        id: 'MARIANA',
        name: 'Mariana Duarte',
        role: ramosEmploymentActive ? 'Secretária • Ramos & Associados' : 'Antigo contato • Ramos & Associados',
        avatar: '/personagens/mariana-duarte.png',
        available: ramosEmploymentActive,
      },
      {
        id: 'ROBERTO',
        name: 'Dr. Roberto Ramos',
        role: ramosEmploymentActive ? 'Sócio responsável' : 'Antigo empregador',
        avatar: '/personagens/dr-roberto-ramos.png',
        available: ramosEmploymentActive,
      },
      {
        id: 'CLIENT',
        name: activeCase?.client.name || 'Cliente do caso',
        role: activeCase ? `${activeCase.code} • ${activeCase.area}` : 'Nenhum cliente ativo',
        available: Boolean(activeCase),
      },
    ],
    [activeCase, ramosEmploymentActive],
  );

  useEffect(() => {
    let active = true;

    const sync = () => {
      const current = readCurrentPlayerSnapshot();
      if (!active || !current || !isProfessionalEmploymentActive(current)) {
        if (active) setPlayer(null);
        return;
      }

      setPlayer((existing) => (sameRelevantPlayer(existing, current) ? existing : current));
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
    if (!ramosEmploymentActive || !player || !phoneState || phoneState.handledWelcomeCall || welcomeTimerRef.current !== null) return undefined;

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
  }, [ramosEmploymentActive, player?.cloudCareerId, player?.name, phoneState?.handledWelcomeCall]);

  useEffect(() => {
    if (!ramosEmploymentActive || !player || !phoneState || !activeCase || !player.activeCase) return;
    const notificationId = `case-assigned-${player.activeCase.caseId}`;
    if (phoneState.messages.some((message) => message.id === notificationId)) return;

    const notification: PhoneMessage = {
      id: notificationId,
      contactId: 'MARIANA',
      direction: 'IN',
      text: `O Dr. Roberto atribuiu o caso ${activeCase.code} a você. Ele já está ativo no seu CRM do Social Jurídico. Cliente: ${activeCase.client.name}.`,
      sentAt: clockNow(),
    };
    const next = { ...phoneState, messages: [...phoneState.messages, notification] };
    setPhoneState(next);
    savePhoneState(player, next);
  }, [activeCase?.id, phoneState, player, ramosEmploymentActive]);

  useEffect(() => {
    if (!ramosEmploymentActive && activeCase) setSelectedContactId('CLIENT');
  }, [ramosEmploymentActive, activeCase?.id]);

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

  useEffect(() => {
    if (callStatus !== 'CONNECTED' || !callContactId || callTranscript.length > 0) return undefined;
    const timer = window.setTimeout(() => {
      setCallTranscript([
        {
          id: `line-contact-${Date.now()}`,
          speaker: 'CONTACT',
          text: callOpening(callContactId, Boolean(activeCase), activeCase?.client.name),
        },
      ]);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [callStatus, callContactId, callTranscript.length, activeCase]);

  if (!player || !phoneState) return null;

  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) || contacts[0];
  const callContact = contacts.find((contact) => contact.id === callContactId) || null;
  const selectedMessages = phoneState.messages.filter((message) => message.contactId === selectedContactId);
  const selectedHistory = phoneState.callHistory.find((record) => record.id === selectedHistoryId) || null;
  const selectedHistoryContact = selectedHistory
    ? contacts.find((contact) => contact.id === selectedHistory.contactId) || null
    : null;

  const updatePhoneState = (next: PhoneConversationState) => {
    setPhoneState(next);
    savePhoneState(player, next);
  };

  const markWelcomeCallHandled = () => {
    updatePhoneState({ ...phoneState, handledWelcomeCall: true });
  };

  const resetLiveCall = () => {
    setCallContactId(null);
    setCallStatus('IDLE');
    setCallSeconds(0);
    setCallTranscript([]);
    setCallResponseUsed(false);
    setAwaitingCallReply(false);
  };

  const acceptIncomingCall = () => {
    if (!incomingContactId) return;
    sound.playClick();
    markWelcomeCallHandled();
    setCallDirection('IN');
    setCallContactId(incomingContactId);
    setIncomingContactId(null);
    setCallSeconds(0);
    setCallTranscript([]);
    setCallResponseUsed(false);
    setAwaitingCallReply(false);
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
    setSelectedHistoryId(null);
    setCallDirection('OUT');
    setCallContactId(contactId);
    setCallSeconds(0);
    setCallTranscript([]);
    setCallResponseUsed(false);
    setAwaitingCallReply(false);
    setCallStatus('DIALING');
    setTab('CALLS');
  };

  const endCall = () => {
    sound.playClick();
    if (callContactId && callTranscript.length > 0) {
      const record: CallHistoryRecord = {
        id: `call-${Date.now()}`,
        contactId: callContactId,
        direction: callDirection,
        startedAt: clockNow(),
        durationSeconds: callSeconds,
        transcript: callTranscript,
        caseId: player.activeCase?.caseId || undefined,
      };
      updatePhoneState({
        ...phoneState,
        callHistory: [record, ...phoneState.callHistory].slice(0, 40),
      });
    }
    resetLiveCall();
  };

  const chooseCallResponse = (option: CallOption) => {
    if (!callContactId || callResponseUsed || awaitingCallReply) return;
    sound.playClick();
    setCallResponseUsed(true);
    setAwaitingCallReply(true);
    setCallTranscript((current) => [
      ...current,
      {
        id: `line-player-${Date.now()}`,
        speaker: 'PLAYER',
        text: option.label,
      },
    ]);

    window.setTimeout(() => {
      setCallTranscript((current) => [
        ...current,
        {
          id: `line-contact-reply-${Date.now()}`,
          speaker: 'CONTACT',
          text: option.response,
        },
      ]);
      setAwaitingCallReply(false);
    }, 700);
  };

  const sendMessage = () => {
    const text = messageDraft.trim();
    if (!text || !selectedContact.available) return;

    sound.playClick();
    const replyContactId = selectedContactId;
    const outgoing: PhoneMessage = {
      id: `msg-out-${Date.now()}`,
      contactId: replyContactId,
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
          contactId: replyContactId,
          direction: 'IN',
          text: autoReply(replyContactId, Boolean(activeCase)),
          sentAt: clockNow(),
        };
        const replied = { ...current, messages: [...current.messages, incoming] };
        savePhoneState(player, replied);
        return replied;
      });
    }, 1000);
  };

  const callTime = formatDuration(callSeconds);
  const responseOptions = callContactId ? callOptions(callContactId, Boolean(activeCase)) : [];
  const phoneWorkspaceLabel = ramosEmploymentActive
    ? 'Ramos & Associados'
    : player.officeFinances.isOfficeOpen
      ? player.officeFinances.officeName
      : 'Advocacia independente';

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
            <small>Sem voz nesta versão • chamada será transcrita</small>
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
                <span>{phoneWorkspaceLabel}</span>
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
                      <div className={styles.emptyChat}>
                        {!ramosEmploymentActive && selectedContact.id !== 'CLIENT'
                          ? 'Este contato pertence ao seu antigo vínculo com o Ramos & Associados. Novas comunicações profissionais do escritório foram encerradas.'
                          : 'Quando houver um cliente ativo, ele ficará disponível para contato.'}
                      </div>
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
                  <div className={`${styles.activeCall} ${transcriptStyles.activeCallScrollable}`}>
                    <div className={styles.callAvatar}>
                      {callContact.avatar ? <img src={callContact.avatar} alt="" /> : <UserRound size={30} />}
                    </div>
                    <span>{callStatus === 'DIALING' ? 'Chamando...' : 'Ligação em andamento'}</span>
                    <h3>{callContact.name}</h3>
                    <p>{callContact.role}</p>
                    <strong>{callStatus === 'CONNECTED' ? callTime : '...'}</strong>

                    {callStatus === 'CONNECTED' && (
                      <div className={transcriptStyles.liveTranscriptWrap}>
                        <div className={transcriptStyles.transcriptHeader}>
                          <div><FileText size={14} /><span>Transcrição ao vivo</span></div>
                          <small>Áudio indisponível nesta versão</small>
                        </div>
                        <div className={transcriptStyles.callTranscript} aria-live="polite">
                          {callTranscript.length === 0 && <div className={transcriptStyles.transcribing}>Transcrevendo fala...</div>}
                          {callTranscript.map((line) => (
                            <div key={line.id} className={line.speaker === 'PLAYER' ? transcriptStyles.playerTranscriptLine : transcriptStyles.contactTranscriptLine}>
                              <span>{line.speaker === 'PLAYER' ? displayName : callContact.name}</span>
                              <p>{line.text}</p>
                            </div>
                          ))}
                          {awaitingCallReply && <div className={transcriptStyles.transcribing}>Transcrevendo resposta...</div>}
                        </div>

                        {!callResponseUsed && callTranscript.length > 0 && (
                          <div className={transcriptStyles.callChoices}>
                            <span>Responder na ligação</span>
                            {responseOptions.map((option) => (
                              <button key={option.id} type="button" onClick={() => chooseCallResponse(option)}>
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
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

                    <div className={transcriptStyles.historySection}>
                      <div className={transcriptStyles.historyTitle}>
                        <FileText size={15} />
                        <div><span>Histórico</span><strong>Transcrições de chamadas</strong></div>
                      </div>

                      {phoneState.callHistory.length === 0 ? (
                        <p className={transcriptStyles.emptyHistory}>As chamadas concluídas aparecerão aqui com a transcrição.</p>
                      ) : (
                        phoneState.callHistory.map((record) => {
                          const contact = contacts.find((item) => item.id === record.contactId);
                          const isSelected = selectedHistoryId === record.id;
                          return (
                            <article key={record.id} className={transcriptStyles.historyRecord}>
                              <button type="button" onClick={() => setSelectedHistoryId(isSelected ? null : record.id)}>
                                <div>
                                  <strong>{contact?.name || 'Contato profissional'}</strong>
                                  <span>{record.direction === 'IN' ? 'Recebida' : 'Realizada'} • {record.startedAt} • {formatDuration(record.durationSeconds)}</span>
                                </div>
                                <FileText size={15} />
                              </button>
                              {isSelected && selectedHistory && selectedHistoryContact && (
                                <div className={transcriptStyles.historyTranscript}>
                                  {selectedHistory.transcript.map((line) => (
                                    <div key={line.id}>
                                      <strong>{line.speaker === 'PLAYER' ? displayName : selectedHistoryContact.name}</strong>
                                      <p>{line.text}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </article>
                          );
                        })
                      )}
                    </div>
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
