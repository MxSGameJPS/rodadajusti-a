import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Beer,
  CalendarDays,
  Heart,
  MessageCircle,
  Music2,
  PhoneCall,
  Sparkles,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { isProfessionalEmploymentActive } from '../../lib/professionalEmployment';
import { emitProfessionalLifeNotifications } from '../../lib/professionalLife';
import {
  OPEN_SOCIAL_LIFE_EVENT,
  RELATIONSHIP_LABELS,
  SOCIAL_LIFE_DECLINE_EVENT,
  SOCIAL_LIFE_UPDATED_EVENT,
  addGameDays,
  buildSocialOpportunity,
  completeSocialEvent,
  declineSocialEvent,
  gameDateKey,
  isCommittedRelationship,
  readSocialLifeState,
  registerSocialOpportunity,
  updatePersonalLifeProfile,
  type RelationshipStatus,
  type SocialEvent,
  type SocialLifeState,
} from '../../lib/socialLife';
import {
  appendProfessionalPhoneMessage,
  requestIncomingProfessionalCall,
} from '../../lib/professionalPhoneBridge';
import { readCurrentPlayerSnapshot } from '../../lib/professionalRpg';
import type { PlayerProfile } from '../../types/game';
import { sound } from '../../utils/sound';
import styles from './ProfessionalLifeExperience.module.css';

const PLAYER_SAVE_KEY = 'rota_da_justica_save_v1';
const BAR_AUDIO_PATH = '/audio/social/bar-ambience.mp3';

type NightPackage = {
  id: string;
  label: string;
  detail: string;
  cost: number;
  socialGain: number;
};

const BAR_PACKAGES: NightPackage[] = [
  { id: 'quick', label: 'Uma cerveja e conversa', detail: 'Passagem rápida pelo bar, sem exagerar nos gastos.', cost: 45, socialGain: 4 },
  { id: 'normal', label: 'Noite com a galera', detail: 'Cervejas, petiscos e algumas horas longe do escritório.', cost: 90, socialGain: 7 },
  { id: 'full', label: 'Aproveitar a noite', detail: 'Rodada, petiscos e uma noite mais completa.', cost: 140, socialGain: 10 },
];

const DATE_PACKAGES: NightPackage[] = [
  { id: 'simple-date', label: 'Saída simples a dois', detail: 'Um lugar tranquilo, conversa e uma bebida.', cost: 70, socialGain: 5 },
  { id: 'date-night', label: 'Jantar e barzinho', detail: 'Jantar, bebida e tempo de qualidade longe do trabalho.', cost: 130, socialGain: 8 },
  { id: 'special-date', label: 'Noite especial', detail: 'Um programa mais completo para cuidar da relação.', cost: 190, socialGain: 11 },
];

function samePlayer(left: PlayerProfile | null, right: PlayerProfile) {
  if (!left) return false;
  return (
    left.cloudCareerId === right.cloudCareerId &&
    left.name === right.name &&
    left.money === right.money &&
    left.careerTier === right.careerTier &&
    left.activeCase?.caseId === right.activeCase?.caseId &&
    left.activeCase?.hoursSpent === right.activeCase?.hoursSpent &&
    left.history.length === right.history.length &&
    left.gameCurrentDay === right.gameCurrentDay &&
    left.gameCurrentMonth === right.gameCurrentMonth &&
    left.gameCurrentYear === right.gameCurrentYear
  );
}

function patchPlayerAfterNight(player: PlayerProfile, moneySpent: number) {
  const nextDate = addGameDays(player, 1);
  try {
    const raw = window.localStorage.getItem(PLAYER_SAVE_KEY);
    const current = raw ? (JSON.parse(raw) as PlayerProfile) : player;
    window.localStorage.setItem(
      PLAYER_SAVE_KEY,
      JSON.stringify({
        ...current,
        money: Math.max(0, Number(current.money || 0) - Math.max(0, moneySpent)),
        ...nextDate,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export const ProfessionalLifeExperience: React.FC = () => {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [social, setSocial] = useState<SocialLifeState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<RelationshipStatus>('SINGLE');
  const [draftPartner, setDraftPartner] = useState('');
  const [nightEvent, setNightEvent] = useState<SocialEvent | null>(null);
  const [nightPackage, setNightPackage] = useState<NightPackage | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState<boolean | null>(null);
  const [toastEventId, setToastEventId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    const sync = () => {
      const current = readCurrentPlayerSnapshot();
      if (!active || !current || !isProfessionalEmploymentActive(current)) {
        if (active) {
          setPlayer(null);
          setSocial(null);
        }
        return;
      }

      setPlayer((previous) => (samePlayer(previous, current) ? previous : current));
      setSocial(readSocialLifeState(current));
      emitProfessionalLifeNotifications(current);
    };

    sync();
    const timer = window.setInterval(sync, 1200);
    const open = () => {
      sync();
      sound.playClick();
      setIsOpen(true);
    };
    const refresh = () => sync();
    const decline = () => {
      const current = readCurrentPlayerSnapshot();
      if (!current || !isProfessionalEmploymentActive(current)) return;
      const state = readSocialLifeState(current);
      if (!state.pendingEvent) return;
      setSocial(declineSocialEvent(current, state));
    };

    window.addEventListener(OPEN_SOCIAL_LIFE_EVENT, open);
    window.addEventListener(SOCIAL_LIFE_UPDATED_EVENT, refresh);
    window.addEventListener(SOCIAL_LIFE_DECLINE_EVENT, decline);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(OPEN_SOCIAL_LIFE_EVENT, open);
      window.removeEventListener(SOCIAL_LIFE_UPDATED_EVENT, refresh);
      window.removeEventListener(SOCIAL_LIFE_DECLINE_EVENT, decline);
    };
  }, []);

  useEffect(() => {
    if (!player || !social) return;
    if (social.profile.relationshipStatus === 'UNDEFINED') {
      const timer = window.setTimeout(() => setSetupOpen(true), 1400);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [player?.cloudCareerId, player?.name, social?.profile.relationshipStatus]);

  useEffect(() => {
    if (!player || !social || social.profile.relationshipStatus === 'UNDEFINED' || social.pendingEvent) return;
    const opportunity = buildSocialOpportunity(player, social);
    if (!opportunity) return;

    const next = registerSocialOpportunity(player, social, opportunity);
    setSocial(next);
    setToastEventId(opportunity.id);

    if (opportunity.channel === 'WHATSAPP') {
      appendProfessionalPhoneMessage(player, {
        id: `social-message-${opportunity.id}`,
        contactId: opportunity.sourceContactId,
        text: opportunity.message.replace(/^.*?:\s*/, ''),
      });
    } else {
      callTimerRef.current = window.setTimeout(() => {
        requestIncomingProfessionalCall(opportunity.sourceContactId);
        callTimerRef.current = null;
      }, 2200);
    }
  }, [player, social, player ? gameDateKey(player) : '']);

  useEffect(() => () => {
    if (callTimerRef.current !== null) window.clearTimeout(callTimerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const packages = useMemo(() => (nightEvent?.kind === 'DATE_NIGHT' ? DATE_PACKAGES : BAR_PACKAGES), [nightEvent?.kind]);

  if (!player || !social) return null;

  const relationshipLabel = RELATIONSHIP_LABELS[social.profile.relationshipStatus];
  const hasPartner = isCommittedRelationship(social.profile.relationshipStatus);
  const pending = social.pendingEvent;

  const saveProfile = () => {
    if (isCommittedRelationship(draftStatus) && !draftPartner.trim()) return;
    sound.playClick();
    const next = updatePersonalLifeProfile(player, {
      relationshipStatus: draftStatus,
      partnerName: draftPartner.trim(),
    });
    setSocial(next);
    setSetupOpen(false);
    setIsOpen(true);
  };

  const openInvitation = () => {
    if (!pending) return;
    sound.playClick();
    setToastEventId(null);
    setNightEvent(pending);
    setNightPackage(null);
    setIsOpen(false);
  };

  const declineInvitation = () => {
    sound.playClick();
    const next = declineSocialEvent(player, social);
    setSocial(next);
    setToastEventId(null);
    setNightEvent(null);
    setNightPackage(null);
  };

  const startNight = async (option: NightPackage) => {
    if (!nightEvent || player.money < option.cost) return;
    sound.playClick();
    setNightPackage(option);
    setAudioAvailable(null);

    const audio = new Audio(BAR_AUDIO_PATH);
    audio.loop = true;
    audio.volume = 0.38;
    audioRef.current = audio;

    if (!audioEnabled) {
      setAudioAvailable(true);
      return;
    }

    try {
      await audio.play();
      setAudioAvailable(true);
    } catch {
      setAudioAvailable(false);
    }
  };

  const toggleAudio = async () => {
    sound.playClick();
    const next = !audioEnabled;
    setAudioEnabled(next);
    const audio = audioRef.current;
    if (!audio) return;
    if (!next) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
      setAudioAvailable(true);
    } catch {
      setAudioAvailable(false);
    }
  };

  const finishNight = () => {
    if (!nightPackage || !nightEvent) return;
    sound.playClick();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const current = readSocialLifeState(player);
    completeSocialEvent(player, current, nightPackage.cost, nightPackage.socialGain);
    patchPlayerAfterNight(player, nightPackage.cost);
    window.location.reload();
  };

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        onClick={() => {
          sound.playClick();
          setIsOpen(true);
        }}
        title="Abrir vida pessoal"
        aria-label="Abrir vida pessoal"
      >
        <Heart size={18} />
        <span>Vida social</span>
        {pending && <i />}
      </button>

      {toastEventId && pending?.id === toastEventId && (
        <aside className={styles.toast} aria-live="polite">
          <div className={styles.toastIcon}>{pending.channel === 'CALL' ? <PhoneCall size={20} /> : <MessageCircle size={20} />}</div>
          <div>
            <span>{pending.channel === 'CALL' ? 'Convite recebido por ligação' : 'Nova mensagem no WhatsApp'}</span>
            <strong>{pending.sourceContactId === 'PARTNER' ? social.profile.partnerName : 'Mariana Duarte'}</strong>
            <p>{pending.title}</p>
          </div>
          <button type="button" onClick={openInvitation}>Responder</button>
        </aside>
      )}

      {setupOpen && (
        <div className={styles.backdrop}>
          <section className={styles.profileModal} role="dialog" aria-modal="true" aria-label="Configurar vida pessoal">
            <div className={styles.modalHeader}>
              <div><UserRound size={21} /><div><span>Perfil do personagem</span><h2>Vida pessoal</h2></div></div>
            </div>
            <p className={styles.intro}>Esta informação influencia quem procura você fora do expediente, os convites que aparecem no celular e parte dos gastos pessoais do personagem.</p>

            <div className={styles.relationshipGrid}>
              {(['SINGLE', 'DATING', 'MARRIED', 'STABLE_UNION'] as RelationshipStatus[]).map((status) => (
                <button
                  type="button"
                  key={status}
                  className={draftStatus === status ? styles.relationshipSelected : ''}
                  onClick={() => setDraftStatus(status)}
                >
                  <Heart size={16} />
                  <strong>{RELATIONSHIP_LABELS[status]}</strong>
                </button>
              ))}
            </div>

            {isCommittedRelationship(draftStatus) && (
              <label className={styles.partnerField}>
                <span>Nome do parceiro ou parceira</span>
                <input value={draftPartner} onChange={(event) => setDraftPartner(event.target.value)} placeholder="Ex.: Ana" maxLength={40} />
              </label>
            )}

            <div className={styles.profileActions}>
              <button type="button" className={styles.primaryButton} disabled={isCommittedRelationship(draftStatus) && !draftPartner.trim()} onClick={saveProfile}>Salvar perfil pessoal</button>
            </div>
          </section>
        </div>
      )}

      {isOpen && !setupOpen && (
        <div className={styles.backdrop}>
          <section className={styles.socialModal} role="dialog" aria-modal="true" aria-label="Vida social do personagem">
            <header className={styles.modalHeader}>
              <div><Heart size={21} /><div><span>Fora do escritório</span><h2>Vida social</h2></div></div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Fechar"><X size={18} /></button>
            </header>

            <div className={styles.socialStats}>
              <div><span>Estado civil</span><strong>{relationshipLabel}</strong>{hasPartner && <small>{social.profile.partnerName}</small>}</div>
              <div><span>Convívio social</span><strong>{social.socialBalance}/100</strong><small>Equilíbrio fora do trabalho</small></div>
              <div><span>Gastos sociais</span><strong>R$ {social.totalSpent.toLocaleString('pt-BR')}</strong><small>Acumulado do personagem</small></div>
            </div>

            {pending ? (
              <article className={styles.invitationCard}>
                <div className={styles.invitationTop}>
                  <div>{pending.kind === 'BAR' ? <Beer size={21} /> : <Heart size={21} />}</div>
                  <div><span>{pending.channel === 'CALL' ? 'Ligação recebida' : 'WhatsApp recebido'}</span><h3>{pending.title}</h3></div>
                </div>
                <p>{pending.message}</p>
                <div className={styles.invitationActions}>
                  <button type="button" onClick={declineInvitation}>Hoje não</button>
                  <button type="button" className={styles.primaryButton} onClick={openInvitation}>Aceitar convite</button>
                </div>
              </article>
            ) : (
              <div className={styles.emptySocial}>
                <CalendarDays size={26} />
                <h3>Nenhum convite pendente</h3>
                <p>A vida pessoal acontece conforme os dias avançam. Finais de semana aumentam a chance de convites, mas eles também podem surgir depois do expediente em dias úteis.</p>
              </div>
            )}

            <section className={styles.historySection}>
              <div className={styles.sectionTitle}><Sparkles size={16} /><strong>Últimos momentos</strong></div>
              {social.history.length === 0 ? (
                <p className={styles.emptyHistory}>Sua história fora do escritório ainda está começando.</p>
              ) : (
                social.history.slice(0, 6).map((event) => (
                  <div key={event.id} className={styles.historyRow}>
                    <div><strong>{event.title}</strong><span>{event.completedDateKey || event.createdDateKey}</span></div>
                    <small>{event.status === 'COMPLETED' ? `Saiu • R$ ${event.moneySpent || 0}` : 'Convite recusado'}</small>
                  </div>
                ))
              )}
            </section>

            <button
              type="button"
              className={styles.editProfile}
              onClick={() => {
                setDraftStatus(social.profile.relationshipStatus === 'UNDEFINED' ? 'SINGLE' : social.profile.relationshipStatus);
                setDraftPartner(social.profile.partnerName);
                setSetupOpen(true);
              }}
            >
              Editar estado civil / relacionamento
            </button>
          </section>
        </div>
      )}

      {nightEvent && !nightPackage && (
        <div className={styles.backdrop}>
          <section className={styles.inviteDecision} role="dialog" aria-modal="true" aria-label="Escolher programa social">
            <header>
              <div className={styles.bigIcon}>{nightEvent.kind === 'BAR' ? <Beer size={28} /> : <Heart size={28} />}</div>
              <span>Você aceitou sair</span>
              <h2>{nightEvent.kind === 'BAR' ? 'Como será a noite?' : 'Quanto você quer investir nessa noite a dois?'}</h2>
              <p>O lazer consome dinheiro e faz o calendário avançar. Isso faz parte da vida real do personagem, não é uma recompensa gratuita.</p>
            </header>

            <div className={styles.packageGrid}>
              {packages.map((option) => (
                <button type="button" key={option.id} disabled={player.money < option.cost} onClick={() => startNight(option)}>
                  <WalletCards size={18} />
                  <div><strong>{option.label}</strong><p>{option.detail}</p><span>R$ {option.cost.toLocaleString('pt-BR')}</span></div>
                </button>
              ))}
            </div>

            <div className={styles.inviteFooter}>
              <span>Saldo atual: <strong>R$ {player.money.toLocaleString('pt-BR')}</strong></span>
              <button type="button" onClick={() => { setNightEvent(null); setIsOpen(true); }}>Voltar</button>
            </div>
          </section>
        </div>
      )}

      {nightEvent && nightPackage && (
        <div className={styles.nightScene} role="dialog" aria-modal="true" aria-label="Noite no bar">
          <div className={styles.lightOne} />
          <div className={styles.lightTwo} />
          <div className={styles.lightThree} />
          <div className={styles.lightFour} />
          <div className={styles.barNoise} />

          <section className={styles.nightContent}>
            <div className={styles.barSign}>{nightEvent.kind === 'BAR' ? <Beer size={30} /> : <Heart size={30} />}</div>
            <span>{nightEvent.kind === 'BAR' ? 'Depois do expediente' : 'Noite a dois'}</span>
            <h2>{nightEvent.kind === 'BAR' ? 'Bar • música • conversa' : 'Uma noite longe dos processos'}</h2>
            <p>{nightEvent.kind === 'BAR' ? 'Por algumas horas não existe prazo, audiência ou petição. O personagem está vivendo fora do escritório.' : `Você e ${social.profile.partnerName || 'seu par'} deixam o trabalho de lado por algumas horas.`}</p>

            <div className={styles.nightReceipt}>
              <div><span>Programa</span><strong>{nightPackage.label}</strong></div>
              <div><span>Gasto da noite</span><strong>R$ {nightPackage.cost.toLocaleString('pt-BR')}</strong></div>
              <div><span>Convívio</span><strong>+{nightPackage.socialGain}</strong></div>
            </div>

            <button type="button" className={styles.audioButton} onClick={toggleAudio}>
              <Music2 size={17} /> {audioEnabled ? 'Desligar som ambiente' : 'Ligar som ambiente'}
            </button>
            {audioAvailable === false && (
              <small className={styles.audioHint}>O arquivo opcional <code>{BAR_AUDIO_PATH}</code> ainda não foi encontrado. A cena continua funcionando com os efeitos visuais.</small>
            )}

            <button type="button" className={styles.finishNight} onClick={finishNight}>Encerrar a noite e voltar para casa</button>
          </section>
        </div>
      )}
    </>
  );
};
