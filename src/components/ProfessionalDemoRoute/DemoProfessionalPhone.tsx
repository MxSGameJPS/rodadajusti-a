import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCheck,
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
import styles from './ProfessionalDemoRoute.module.css';

const OPEN_PHONE_EVENT = 'rota:open-professional-phone';

type ContactId = 'MARIANA' | 'ROBERTO' | 'CLIENTE';
type TabId = 'WHATSAPP' | 'LIGACOES';

interface DemoMessage {
  id: string;
  contactId: ContactId;
  direction: 'IN' | 'OUT';
  text: string;
  time: string;
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

export const DemoProfessionalPhone: React.FC<DemoProfessionalPhoneProps> = ({ player, currentCase }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>('WHATSAPP');
  const [selectedContactId, setSelectedContactId] = useState<ContactId>('MARIANA');
  const [messages, setMessages] = useState<DemoMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const [incomingCall, setIncomingCall] = useState(false);
  const [activeCall, setActiveCall] = useState<ContactId | null>(null);

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

  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) || contacts[0];
  const selectedMessages = messages.filter((message) => message.contactId === selectedContactId);

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
            <small>Celular profissional</small>
          </section>
          <button type="button" className={styles.demoRejectCall} onClick={() => setIncomingCall(false)}><PhoneOff size={16} /></button>
          <button
            type="button"
            className={styles.demoAcceptCall}
            onClick={() => {
              setIncomingCall(false);
              setActiveCall('MARIANA');
              setTab('LIGACOES');
              setOpen(true);
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
                    <button type="button" disabled={!selectedContact.available} onClick={() => { setActiveCall(selectedContact.id); setTab('LIGACOES'); }}><PhoneCall size={16} /></button>
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
                {activeCall ? (
                  <div className={styles.demoCallScreen}>
                    <div className={styles.demoCallAvatar}><PhoneCall size={26} /></div>
                    <span>Chamada em andamento</span>
                    <strong>{contacts.find((contact) => contact.id === activeCall)?.name}</strong>
                    <p>Esta chamada é simulada e não utiliza nenhum dado do seu personagem real.</p>
                    <button type="button" onClick={() => setActiveCall(null)}><PhoneOff size={18} /> Encerrar</button>
                  </div>
                ) : (
                  <div className={styles.demoCallList}>
                    <h3>Contatos profissionais</h3>
                    {contacts.map((contact) => (
                      <button type="button" key={contact.id} disabled={!contact.available} onClick={() => setActiveCall(contact.id)}>
                        <div className={styles.demoContactAvatar}>{contact.avatar ? <img src={contact.avatar} alt="" /> : <UserRound size={17} />}</div>
                        <div><strong>{contact.name}</strong><span>{contact.role}</span></div>
                        <PhoneCall size={16} />
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
