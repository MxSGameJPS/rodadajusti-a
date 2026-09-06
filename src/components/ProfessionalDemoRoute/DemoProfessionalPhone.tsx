import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCheck,
  FileText,
  MessageCircle,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  Send,
  Smartphone,
  UserRound,
  X,
} from 'lucide-react';
import type { LegalCase, PlayerProfile } from '../../types/game';
import { sound } from '../../utils/sound';
import transcriptStyles from '../ProfessionalPhone/ProfessionalPhoneTranscript.module.css';
import styles from './ProfessionalDemoRoute.module.css';

const OPEN_PHONE_EVENT = 'rota:open-professional-phone';

type ContactId = 'MARIANA' | 'ROBERTO' | 'CLIENTE';
type TabId = 'WHATSAPP' | 'LIGACOES';
type CallDirection = 'IN' | 'OUT';

interface DemoMessage {
  id: string;
  contactId: ContactId;
  direction: 'IN' | 'OUT';
  text: string;
  time: string;
}

interface TranscriptLine {
  id: string;
  speaker: 'CONTACT' | 'PLAYER';
  text: string;
}

interface DemoCallRecord {
  id: string;
  contactId: ContactId;
  direction: CallDirection;
  time: string;
  durationSeconds: number;
  transcript: TranscriptLine[];
}

interface DemoCallOption {
  id: string;
  label: string;
  response: string;
}

interface DemoProfessionalPhoneProps {
  player: PlayerProfile;
  currentCase: LegalCase | null;
}

const INITIAL_MESSAGES: DemoMessage[] = [
  {
    id: 'm1',
    contactId: 'MARIANA',
    direction: 'IN',
    text: 'Bom dia, Dr. Rafael. O caso que o Dr. Roberto distribuiu já está no seu CRM do Social Jurídico.',
    time: '09:08',
  },
  {
    id: 'm2',
    contactId: 'ROBERTO',
    direction: 'IN',
    text: 'Leia o dossiê com atenção antes de falar com o cliente. Se surgir um ponto estratégico, venha à minha sala.',
    time: '09:14',
  },
];

function clockNow() {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

function formatDuration(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function demoOpening(contactId: ContactId, currentCase: LegalCase | null) {
  if (contactId === 'MARIANA') {
    return currentCase
      ? 'Doutor, o atendimento que o Dr. Roberto distribuiu já está no seu CRM. Confira o dossiê e os prazos antes de falar com o cliente.'
      : 'Doutor, estou confirmando que seu celular profissional está funcionando. Quando houver distribuição, eu cadastro no CRM e aviso você.';
  }
  if (contactId === 'ROBERTO') {
    return currentCase
      ? 'Revise o dossiê com atenção antes de tomar qualquer decisão estratégica. Quero fatos, documentos e prazos conferidos no Social Jurídico.'
      : 'Ainda não há caso novo. Assim que eu distribuir um atendimento, a Mariana vai disponibilizá-lo no seu CRM.';
  }
  return `Doutor, aqui é ${currentCase?.client.name || 'o cliente'}. Estou à disposição para esclarecer o que precisar sobre o meu caso.`;
}

function demoOptions(contactId: ContactId, currentCase: LegalCase | null): DemoCallOption[] {
  if (contactId === 'MARIANA') {
    return currentCase
      ? [
          {
            id: 'crm',
            label: 'Obrigado, Mariana. Vou abrir o CRM agora.',
            response: 'Perfeito. Qualquer documento, prazo ou orientação nova eu registro no atendimento e aviso você por aqui.',
          },
          {
            id: 'prazo',
            label: 'Me avise se surgir algum prazo urgente.',
            response: 'Pode deixar. Os prazos ficam registrados no Social Jurídico e eu reforço por ligação ou WhatsApp quando for urgente.',
          },
        ]
      : [
          {
            id: 'ok',
            label: 'Entendido. Vou manter o celular disponível.',
            response: 'Ótimo. Notebook para a operação no Social Jurídico e celular para comunicação do escritório.',
          },
        ];
  }

  if (contactId === 'ROBERTO') {
    return [
      {
        id: 'revisar',
        label: 'Vou revisar o dossiê antes de falar com o cliente.',
        response: 'Correto. Quero que você entenda o caso antes de agir e registre as providências no sistema.',
      },
      {
        id: 'retorno',
        label: 'Se surgir dúvida estratégica, eu retorno a ligação.',
        response: 'Faça isso. Mas venha com o problema identificado e uma proposta de encaminhamento.',
      },
    ];
  }

  return [
    {
      id: 'docs',
      label: 'Vou analisar seus documentos e retorno com as próximas orientações.',
      response: 'Tudo bem, doutor. Se precisar de mais alguma coisa, pode me chamar no WhatsApp.',
    },
    {
      id: 'fatos',
      label: 'Preciso confirmar alguns fatos antes de avançarmos.',
      response: 'Claro. Pode perguntar o que precisar para entender o caso corretamente.',
    },
  ];
}

export const DemoProfessionalPhone: React.FC<DemoProfessionalPhoneProps> = ({ player, currentCase }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>('WHATSAPP');
  const [selectedContactId, setSelectedContactId] = useState<ContactId>('MARIANA');
  const [messages, setMessages] = useState<DemoMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const [incomingCall, setIncomingCall] = useState(false);
  const [activeCall, setActiveCall] = useState<ContactId | null>(null);
  const [callDirection, setCallDirection] = useState<CallDirection>('OUT');
  const [callSeconds, setCallSeconds] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [responded, setResponded] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [callHistory, setCallHistory] = useState<DemoCallRecord[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const contacts = useMemo(
    () => [
      { id: 'MARIANA' as const, name: 'Mariana Duarte', role: 'Secretária do Escritório', avatar: '/personagens/mariana-duarte.png', available: true },
      { id: 'ROBERTO' as const, name: 'Dr. Roberto Ramos', role: 'Sócio responsável', avatar: '/personagens/dr-roberto-ramos.png', available: true },
      {
        id: 'CLIENTE' as const,
        name: currentCase?.client.name || 'Cliente do caso',
        role: currentCase ? `${currentCase.code} • ${currentCase.area}` : 'Nenhum caso ativo',
        avatar: null,
        available: Boolean(currentCase),
      },
    ],
    [currentCase],
  );

  useEffect(() => {
    const openPhone = () => {
      sound.playClick();
      setOpen(true);
    };
    window.addEventListener(OPEN_PHONE_EVENT, openPhone);
    const timer = window.setTimeout(() => setIncomingCall(true), 9000);
    return () => {
      window.removeEventListener(OPEN_PHONE_EVENT, openPhone);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!activeCall) return undefined;
    const timer = window.setInterval(() => setCallSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [activeCall]);

  useEffect(() => {
    if (!activeCall || transcript.length > 0) return undefined;
    const timer = window.setTimeout(() => {
      setTranscript([
        {
          id: `contact-${Date.now()}`,
          speaker: 'CONTACT',
          text: demoOpening(activeCall, currentCase),
        },
      ]);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activeCall, transcript.length, currentCase]);

  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) || contacts[0];
  const selectedMessages = messages.filter((message) => message.contactId === selectedContactId);
  const callContact = contacts.find((contact) => contact.id === activeCall) || null;
  const selectedHistory = callHistory.find((record) => record.id === selectedHistoryId) || null;
  const selectedHistoryContact = selectedHistory
    ? contacts.find((contact) => contact.id === selectedHistory.contactId) || null
    : null;

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !selectedContact.available) return;
    sound.playClick();
    setMessages((current) => [
      ...current,
      { id: `out-${Date.now()}`, contactId: selectedContactId, direction: 'OUT', text, time: 'agora' },
    ]);
    setDraft('');

    window.setTimeout(() => {
      const reply = selectedContactId === 'MARIANA'
        ? 'Perfeito. Qualquer atualização do escritório eu registro no CRM e aviso você por aqui.'
        : selectedContactId === 'ROBERTO'
          ? 'Certo. Continue pelo fluxo do Social Jurídico e me procure se precisar de validação estratégica.'
          : 'Obrigado, doutor. Fico no aguardo das suas orientações.';
      setMessages((current) => [
        ...current,
        { id: `in-${Date.now()}`, contactId: selectedContactId, direction: 'IN', text: reply, time: 'agora' },
      ]);
    }, 750);
  };

  const startCall = (contactId: ContactId, direction: CallDirection = 'OUT') => {
    const contact = contacts.find((item) => item.id === contactId);
    if (!contact?.available) return;
    sound.playClick();
    setSelectedHistoryId(null);
    setCallDirection(direction);
    setCallSeconds(0);
    setTranscript([]);
    setResponded(false);
    setAwaitingReply(false);
    setActiveCall(contactId);
    setTab('LIGACOES');
    setOpen(true);
  };

  const chooseResponse = (option: DemoCallOption) => {
    if (!activeCall || responded || awaitingReply) return;
    sound.playClick();
    setResponded(true);
    setAwaitingReply(true);
    setTranscript((current) => [
      ...current,
      { id: `player-${Date.now()}`, speaker: 'PLAYER', text: option.label },
    ]);
    window.setTimeout(() => {
      setTranscript((current) => [
        ...current,
        { id: `reply-${Date.now()}`, speaker: 'CONTACT', text: option.response },
      ]);
      setAwaitingReply(false);
    }, 700);
  };

  const endCall = () => {
    sound.playClick();
    if (activeCall && transcript.length > 0) {
      setCallHistory((current) => [
        {
          id: `call-${Date.now()}`,
          contactId: activeCall,
          direction: callDirection,
          time: clockNow(),
          durationSeconds: callSeconds,
          transcript,
        },
        ...current,
      ].slice(0, 20));
    }
    setActiveCall(null);
    setCallSeconds(0);
    setTranscript([]);
    setResponded(false);
    setAwaitingReply(false);
  };

  const responseOptions = activeCall ? demoOptions(activeCall, currentCase) : [];

  return (
    <>
      <button type="button" className={styles.demoPhoneLauncher} onClick={() => setOpen(true)}>
        <Smartphone size={18} /> Celular
      </button>

      {incomingCall && !activeCall && (
        <aside className={styles.demoIncomingCall}>
          <div><PhoneIncoming size={20} /></div>
          <section>
            <span>Ligação recebida</span>
            <strong>Mariana Duarte</strong>
            <small>Sem voz nesta versão • chamada será transcrita</small>
          </section>
          <button type="button" className={styles.demoRejectCall} onClick={() => setIncomingCall(false)}><PhoneOff size={16} /></button>
          <button
            type="button"
            className={styles.demoAcceptCall}
            onClick={() => {
              setIncomingCall(false);
              startCall('MARIANA', 'IN');
            }}
          ><PhoneCall size={16} /></button>
        </aside>
      )}

      {open && (
        <div className={styles.demoDeviceBackdrop}>
          <section className={styles.demoPhoneFrame}>
            <div className={styles.demoPhoneNotch} />
            <header className={styles.demoPhoneHeader}>
              <div><span>Ramos & Associados</span><strong>Dr. {player.name}</strong></div>
              <button type="button" onClick={() => setOpen(false)}><X size={17} /></button>
            </header>

            <nav className={styles.demoPhoneTabs}>
              <button type="button" className={tab === 'WHATSAPP' ? styles.demoPhoneTabActive : ''} onClick={() => setTab('WHATSAPP')}>
                <MessageCircle size={15} /> WhatsApp
              </button>
              <button type="button" className={tab === 'LIGACOES' ? styles.demoPhoneTabActive : ''} onClick={() => setTab('LIGACOES')}>
                <Phone size={15} /> Ligações
              </button>
            </nav>

            {tab === 'WHATSAPP' ? (
              <div className={styles.demoPhoneBody}>
                <aside className={styles.demoPhoneContacts}>
                  {contacts.map((contact) => (
                    <button
                      type="button"
                      key={contact.id}
                      disabled={!contact.available}
                      className={selectedContactId === contact.id ? styles.demoPhoneContactActive : ''}
                      onClick={() => setSelectedContactId(contact.id)}
                    >
                      <div className={styles.demoContactAvatar}>
                        {contact.avatar ? <img src={contact.avatar} alt="" /> : <UserRound size={17} />}
                      </div>
                      <div><strong>{contact.name}</strong><span>{contact.role}</span></div>
                    </button>
                  ))}
                </aside>

                <main className={styles.demoChatPanel}>
                  <header>
                    <div><strong>{selectedContact.name}</strong><span>{selectedContact.role}</span></div>
                    <button type="button" disabled={!selectedContact.available} onClick={() => startCall(selectedContact.id)}><PhoneCall size={16} /></button>
                  </header>
                  <div className={styles.demoMessages}>
                    {selectedMessages.map((message) => (
                      <div key={message.id} className={message.direction === 'OUT' ? styles.demoMessageOut : styles.demoMessageIn}>
                        <p>{message.text}</p>
                        <span>{message.time}{message.direction === 'OUT' && <CheckCheck size={11} />}</span>
                      </div>
                    ))}
                  </div>
                  <form className={styles.demoComposer} onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
                    <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Mensagem profissional..." disabled={!selectedContact.available} />
                    <button type="submit" disabled={!draft.trim() || !selectedContact.available}><Send size={15} /></button>
                  </form>
                </main>
              </div>
            ) : (
              <div className={styles.demoCallsBody}>
                {activeCall && callContact ? (
                  <div className={`${styles.demoCallScreen} ${transcriptStyles.activeCallScrollable}`}>
                    <div className={styles.demoCallAvatar}><PhoneCall size={26} /></div>
                    <span>Chamada em andamento • {formatDuration(callSeconds)}</span>
                    <strong>{callContact.name}</strong>
                    <p>Enquanto não há voz no jogo, a chamada acontece por transcrição e escolhas de diálogo.</p>

                    <div className={transcriptStyles.liveTranscriptWrap}>
                      <div className={transcriptStyles.transcriptHeader}>
                        <div><FileText size={14} /><span>Transcrição ao vivo</span></div>
                        <small>Áudio indisponível nesta versão</small>
                      </div>
                      <div className={transcriptStyles.callTranscript} aria-live="polite">
                        {transcript.length === 0 && <div className={transcriptStyles.transcribing}>Transcrevendo fala...</div>}
                        {transcript.map((line) => (
                          <div key={line.id} className={line.speaker === 'PLAYER' ? transcriptStyles.playerTranscriptLine : transcriptStyles.contactTranscriptLine}>
                            <span>{line.speaker === 'PLAYER' ? `Dr. ${player.name}` : callContact.name}</span>
                            <p>{line.text}</p>
                          </div>
                        ))}
                        {awaitingReply && <div className={transcriptStyles.transcribing}>Transcrevendo resposta...</div>}
                      </div>

                      {!responded && transcript.length > 0 && (
                        <div className={transcriptStyles.callChoices}>
                          <span>Responder na ligação</span>
                          {responseOptions.map((option) => (
                            <button type="button" key={option.id} onClick={() => chooseResponse(option)}>{option.label}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button type="button" onClick={endCall}><PhoneOff size={18} /> Encerrar</button>
                  </div>
                ) : (
                  <div className={styles.demoCallList}>
                    <h3>Contatos profissionais</h3>
                    {contacts.map((contact) => (
                      <button type="button" key={contact.id} disabled={!contact.available} onClick={() => startCall(contact.id)}>
                        <div className={styles.demoContactAvatar}>{contact.avatar ? <img src={contact.avatar} alt="" /> : <UserRound size={17} />}</div>
                        <div><strong>{contact.name}</strong><span>{contact.role}</span></div>
                        <PhoneCall size={16} />
                      </button>
                    ))}

                    <div className={transcriptStyles.historySection}>
                      <div className={transcriptStyles.historyTitle}>
                        <FileText size={15} />
                        <div><span>Histórico da demo</span><strong>Transcrições de chamadas</strong></div>
                      </div>
                      {callHistory.length === 0 ? (
                        <p className={transcriptStyles.emptyHistory}>Encerre uma ligação para vê-la registrada aqui. Nada é salvo no seu personagem real.</p>
                      ) : (
                        callHistory.map((record) => {
                          const contact = contacts.find((item) => item.id === record.contactId);
                          const selected = selectedHistoryId === record.id;
                          return (
                            <article key={record.id} className={transcriptStyles.historyRecord}>
                              <button type="button" onClick={() => setSelectedHistoryId(selected ? null : record.id)}>
                                <div>
                                  <strong>{contact?.name || 'Contato'}</strong>
                                  <span>{record.direction === 'IN' ? 'Recebida' : 'Realizada'} • {record.time} • {formatDuration(record.durationSeconds)}</span>
                                </div>
                                <FileText size={15} />
                              </button>
                              {selected && selectedHistory && selectedHistoryContact && (
                                <div className={transcriptStyles.historyTranscript}>
                                  {selectedHistory.transcript.map((line) => (
                                    <div key={line.id}>
                                      <strong>{line.speaker === 'PLAYER' ? `Dr. ${player.name}` : selectedHistoryContact.name}</strong>
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