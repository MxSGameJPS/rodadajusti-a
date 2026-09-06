import React, { useEffect, useState } from 'react';
import { FileText, Heart, PhoneCall, PhoneIncoming, PhoneOff } from 'lucide-react';
import { isProfessionalEmploymentActive } from '../../lib/professionalEmployment';
import { PHONE_INCOMING_CALL_EVENT } from '../../lib/professionalPhoneBridge';
import { readCurrentPlayerSnapshot } from '../../lib/professionalRpg';
import {
  OPEN_SOCIAL_LIFE_EVENT,
  SOCIAL_LIFE_DECLINE_EVENT,
  isCommittedRelationship,
  readSocialLifeState,
} from '../../lib/socialLife';
import type { PlayerProfile } from '../../types/game';
import { sound } from '../../utils/sound';
import styles from './PersonalIncomingCallExperience.module.css';

type CallStage = 'RINGING' | 'CONNECTED' | 'ANSWERED';

interface IncomingPayload {
  contactId?: string;
}

export const PersonalIncomingCallExperience: React.FC = () => {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [stage, setStage] = useState<CallStage | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [openingLine, setOpeningLine] = useState('');
  const [playerLine, setPlayerLine] = useState('');
  const [partnerReply, setPartnerReply] = useState('');
  const [acceptedInvitation, setAcceptedInvitation] = useState(false);

  useEffect(() => {
    const incoming = (event: Event) => {
      const detail = (event as CustomEvent<IncomingPayload>).detail;
      if (detail?.contactId !== 'PARTNER') return;

      const current = readCurrentPlayerSnapshot();
      if (!current || !isProfessionalEmploymentActive(current)) return;
      const social = readSocialLifeState(current);
      if (!isCommittedRelationship(social.profile.relationshipStatus) || !social.pendingEvent) return;

      setPlayer(current);
      setPartnerName(social.profile.partnerName || 'Meu amor');
      setOpeningLine('');
      setPlayerLine('');
      setPartnerReply('');
      setAcceptedInvitation(false);
      setStage('RINGING');
    };

    window.addEventListener(PHONE_INCOMING_CALL_EVENT, incoming);
    return () => window.removeEventListener(PHONE_INCOMING_CALL_EVENT, incoming);
  }, []);

  useEffect(() => {
    if (stage !== 'CONNECTED' || openingLine) return undefined;
    const timer = window.setTimeout(() => {
      setOpeningLine('Oi, amor. Eu sei que o trabalho está puxado, mas queria te ver fora desse ritmo. Vamos sair hoje à noite para jantar, conversar e tomar alguma coisa?');
    }, 450);
    return () => window.clearTimeout(timer);
  }, [stage, openingLine]);

  if (!stage || !player) return null;

  const acceptCall = () => {
    sound.playClick();
    setStage('CONNECTED');
  };

  const closeCall = () => {
    sound.playClick();
    setStage(null);
    setPlayer(null);
  };

  const answerInvitation = (accept: boolean) => {
    sound.playClick();
    setAcceptedInvitation(accept);
    setPlayerLine(
      accept
        ? 'Vamos sim. Quero sair um pouco do escritório e ficar com você.'
        : 'Hoje eu não vou conseguir. Estou com coisa demais para resolver.',
    );
    setPartnerReply(
      accept
        ? 'Combinado. Então hoje à noite você fecha o notebook e vem comigo. Trabalho nenhum pode ocupar tudo.'
        : 'Tudo bem. Só não deixa o trabalho virar a sua vida inteira, tá? A gente combina outro dia.',
    );
    setStage('ANSWERED');

    if (!accept) {
      window.dispatchEvent(new CustomEvent(SOCIAL_LIFE_DECLINE_EVENT));
    }
  };

  const finishAccepted = () => {
    sound.playClick();
    setStage(null);
    setPlayer(null);
    window.dispatchEvent(new CustomEvent(OPEN_SOCIAL_LIFE_EVENT));
  };

  return (
    <>
      {stage === 'RINGING' && (
        <aside className={styles.ringing} role="dialog" aria-label={`Ligação de ${partnerName}`}>
          <div className={styles.pulse}><PhoneIncoming size={23} /></div>
          <div className={styles.ringingCopy}>
            <span>Ligação pessoal recebida</span>
            <strong>{partnerName}</strong>
            <small>Sem voz nesta versão • chamada será transcrita</small>
          </div>
          <div className={styles.ringingActions}>
            <button type="button" className={styles.reject} onClick={closeCall} aria-label="Recusar ligação"><PhoneOff size={17} /></button>
            <button type="button" className={styles.accept} onClick={acceptCall} aria-label="Atender ligação"><PhoneCall size={17} /></button>
          </div>
        </aside>
      )}

      {(stage === 'CONNECTED' || stage === 'ANSWERED') && (
        <div className={styles.backdrop}>
          <section className={styles.callFrame} role="dialog" aria-modal="true" aria-label={`Ligação transcrita com ${partnerName}`}>
            <div className={styles.avatar}><Heart size={28} /></div>
            <span className={styles.callStatus}>Ligação pessoal • transcrição ao vivo</span>
            <h2>{partnerName}</h2>
            <p className={styles.role}>Vida pessoal • relacionamento</p>

            <div className={styles.transcriptBox}>
              <div className={styles.transcriptHeader}><FileText size={14} /> Transcrição</div>
              {!openingLine && <div className={styles.transcribing}>Transcrevendo fala...</div>}
              {openingLine && (
                <div className={styles.partnerLine}>
                  <strong>{partnerName}</strong>
                  <p>{openingLine}</p>
                </div>
              )}
              {playerLine && (
                <div className={styles.playerLine}>
                  <strong>Você</strong>
                  <p>{playerLine}</p>
                </div>
              )}
              {partnerReply && (
                <div className={styles.partnerLine}>
                  <strong>{partnerName}</strong>
                  <p>{partnerReply}</p>
                </div>
              )}
            </div>

            {stage === 'CONNECTED' && openingLine && (
              <div className={styles.choices}>
                <span>Responder</span>
                <button type="button" onClick={() => answerInvitation(true)}>Vamos sim. Quero sair um pouco do escritório.</button>
                <button type="button" onClick={() => answerInvitation(false)}>Hoje não vou conseguir.</button>
              </div>
            )}

            {stage === 'ANSWERED' && (
              <button type="button" className={styles.finish} onClick={acceptedInvitation ? finishAccepted : closeCall}>
                {acceptedInvitation ? 'Encerrar ligação e escolher o programa' : 'Encerrar ligação'}
              </button>
            )}
          </section>
        </div>
      )}
    </>
  );
};
