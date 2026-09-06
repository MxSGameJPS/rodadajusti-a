import React, { useEffect, useRef, useState } from 'react';
import {
  BatteryMedium,
  Beer,
  BriefcaseBusiness,
  CalendarDays,
  Heart,
  MapPin,
  MessageCircle,
  Music2,
  PhoneCall,
  Sparkles,
  UserRound,
  Users,
  Utensils,
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
  getRelationshipLabel,
  isCommittedRelationship,
  readSocialLifeState,
  registerSocialOpportunity,
  updatePersonalLifeProfile,
  type RelationshipStatus,
  type SocialEvent,
  type SocialEventKind,
  type SocialLifeState,
  type SocialPlanOption,
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

function patchPlayerAfterSocialEvent(player: PlayerProfile, option: SocialPlanOption) {
  const nextDate = addGameDays(player, option.daysAdvance);
  try {
    const raw = window.localStorage.getItem(PLAYER_SAVE_KEY);
    const current = raw ? (JSON.parse(raw) as PlayerProfile) : player;
    const currentActiveCase = current.activeCase;
    window.localStorage.setItem(
      PLAYER_SAVE_KEY,
      JSON.stringify({
        ...current,
        money: Math.max(0, Number(current.money || 0) - Math.max(0, option.cost)),
        activeCase: currentActiveCase
          ? {
              ...currentActiveCase,
              hoursSpent: Math.max(0, Number(currentActiveCase.hoursSpent || 0) + Math.max(0, option.caseHoursCost)),
            }
          : currentActiveCase,
        ...nextDate,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

function eventIcon(kind: SocialEventKind) {
  if (kind === 'BAR') return <Beer size={21} />;
  if (kind === 'DATE_NIGHT') return <Heart size={21} />;
  if (kind === 'LUNCH' || kind === 'DINNER') return <Utensils size={21} />;
  if (kind === 'NETWORKING') return <BriefcaseBusiness size={21} />;
  return <MapPin size={21} />;
}

function eventSceneCopy(event: SocialEvent) {
  if (event.kind === 'BAR') {
    return {
      eyebrow: 'Depois do expediente',
      title: 'Bar • música • conversa',
      description: 'Por algumas horas, o personagem troca o escritório por uma mesa de bar. O relógio continua correndo e amanhã ainda existe trabalho.',
    };
  }
  if (event.kind === 'DATE_NIGHT') {
    return {
      eyebrow: 'Vida a dois',
      title: 'Uma noite longe dos processos',
      description: 'O relacionamento também exige tempo. O trabalho fica de lado por algumas horas, mas os compromissos profissionais continuam no calendário.',
    };
  }
  if (event.kind === 'LUNCH') {
    return {
      eyebrow: 'Intervalo do expediente',
      title: 'Almoço • conversa • contatos',
      description: 'Nem toda oportunidade profissional aparece no CRM. Algumas começam numa mesa de restaurante e voltam muito tempo depois.',
    };
  }
  if (event.kind === 'DINNER') {
    return {
      eyebrow: 'Fim do dia',
      title: 'Jantar • amizade • vida fora do trabalho',
      description: 'Manter amizades também ocupa tempo e dinheiro. O equilíbrio social do personagem cresce quando a carreira não ocupa tudo.',
    };
  }
  if (event.kind === 'NETWORKING') {
    return {
      eyebrow: 'Circulação profissional',
      title: 'Networking • advocacia • oportunidades',
      description: 'Você passa a noite entre advogados, empresários e novos contatos. Isso pode aumentar seu capital social, mas cobra energia e tempo.',
    };
  }
  if (event.kind === 'WEEKEND_BEACH') {
    return {
      eyebrow: 'Fim de semana',
      title: 'Praia • descanso • distância do escritório',
      description: 'Dois mundos disputam sua agenda: o processo continua existindo, mas descansar pode devolver energia para a próxima semana.',
    };
  }
  if (event.kind === 'WEEKEND_MOUNTAIN') {
    return {
      eyebrow: 'Fim de semana',
      title: 'Montanha • pousada • conversa',
      description: 'Um fim de semana fora pode recuperar energia e ainda criar novas conexões. O custo é abandonar algumas horas de preparação.',
    };
  }
  return {
    eyebrow: 'Fim de semana',
    title: 'Serra • descanso • convivência',
    description: 'A carreira não para, mas o personagem escolheu viver dois dias fora dela. O descanso pode ajudar; o tempo perdido pode cobrar seu preço.',
  };
}

function usesBarAudio(kind: SocialEventKind) {
  return kind === 'BAR' || kind === 'NETWORKING';
}

function riskTone(level: SocialEvent['professionalRisk'] extends infer T ? T extends { level: infer L } ? L : never : never) {
  if (level === 'CRITICAL') return 'border-[#EF4444]/45 bg-[#EF4444]/10 text-[#FCA5A5]';
  if (level === 'HIGH') return 'border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FCD34D]';
  return 'border-[#60A5FA]/30 bg-[#60A5FA]/[0.07] text-[#AFCDF6]';
}

export const ProfessionalLifeExperience: React.FC = () => {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [social, setSocial] = useState<SocialLifeState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<RelationshipStatus>('SINGLE');
  const [draftPartner, setDraftPartner] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<SocialEvent | null>(null);
  const [selectedOption, setSelectedOption] = useState<SocialPlanOption | null>(null);
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

    if (opportunity.channel === 'CALL' && opportunity.sourceContactId === 'PARTNER') {
      callTimerRef.current = window.setTimeout(() => {
        requestIncomingProfessionalCall('PARTNER');
        callTimerRef.current = null;
      }, 2200);
      return;
    }

    appendProfessionalPhoneMessage(player, {
      id: `social-message-${opportunity.id}`,
      contactId: opportunity.sourceContactId,
      text: opportunity.message.replace(/^.*?:\s*/, ''),
    });
  }, [player, social, player ? gameDateKey(player) : '']);

  useEffect(() => () => {
    if (callTimerRef.current !== null) window.clearTimeout(callTimerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  if (!player || !social) return null;

  const relationshipLabel = RELATIONSHIP_LABELS[social.profile.relationshipStatus];
  const hasPartner = isCommittedRelationship(social.profile.relationshipStatus);
  const pending = social.pendingEvent;
  const sceneCopy = selectedEvent ? eventSceneCopy(selectedEvent) : null;

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
    setSelectedEvent(pending);
    setSelectedOption(null);
    setIsOpen(false);
  };

  const declineInvitation = () => {
    sound.playClick();
    const next = declineSocialEvent(player, social);
    setSocial(next);
    setToastEventId(null);
    setSelectedEvent(null);
    setSelectedOption(null);
  };

  const startEvent = async (option: SocialPlanOption) => {
    if (!selectedEvent || player.money < option.cost) return;
    sound.playClick();
    setSelectedOption(option);
    setAudioAvailable(null);

    if (!usesBarAudio(selectedEvent.kind)) {
      setAudioAvailable(true);
      return;
    }

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

  const finishEvent = () => {
    if (!selectedOption || !selectedEvent) return;
    sound.playClick();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const current = readSocialLifeState(player);
    completeSocialEvent(player, current, selectedOption);
    patchPlayerAfterSocialEvent(player, selectedOption);
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
            <span>{pending.channel === 'CALL' ? 'Convite recebido por ligação' : 'Novo convite no WhatsApp'}</span>
            <strong>{pending.contactName}</strong>
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
            <p className={styles.intro}>Esta informação influencia quem procura você fora do expediente, os convites que aparecem no celular, seu convívio social e parte das decisões de rotina.</p>

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
              <div><span>Atributo social</span><strong>{social.socialBalance}/100</strong><small>Convívio e equilíbrio pessoal</small></div>
              <div><span>Capital social</span><strong>{social.socialCapital}/100</strong><small>Networking e circulação</small></div>
              <div><span>Energia</span><strong>{social.energy}/100</strong><small>{social.activeCondition?.label || 'Equilibrado'}</small></div>
              <div><span>Gastos sociais</span><strong>R$ {social.totalSpent.toLocaleString('pt-BR')}</strong><small>Acumulado do personagem</small></div>
            </div>

            {pending ? (
              <article className={styles.invitationCard}>
                <div className={styles.invitationTop}>
                  <div>{eventIcon(pending.kind)}</div>
                  <div><span>{pending.channel === 'CALL' ? 'Ligação recebida' : 'WhatsApp recebido'} • {pending.contactRole}</span><h3>{pending.title}</h3></div>
                </div>
                <p>{pending.message}</p>
                {pending.professionalRisk && pending.professionalRisk.level !== 'LOW' && (
                  <div className={`mt-4 rounded-xl border p-3 text-[10px] leading-relaxed ${riskTone(pending.professionalRisk.level)}`}>
                    <strong className="block uppercase tracking-[0.08em]">Conflito com a rotina profissional</strong>
                    <span className="mt-1 block">{pending.professionalRisk.message}</span>
                  </div>
                )}
                <div className={styles.invitationActions}>
                  <button type="button" onClick={declineInvitation}>Recusar convite</button>
                  <button type="button" className={styles.primaryButton} onClick={openInvitation}>Ver opções e aceitar</button>
                </div>
              </article>
            ) : (
              <div className={styles.emptySocial}>
                <CalendarDays size={26} />
                <h3>Nenhum convite pendente</h3>
                <p>Almoços, jantares, viagens, happy hours e encontros aparecem conforme os dias avançam. Nem todo convite é conveniente para sua agenda profissional.</p>
              </div>
            )}

            <section className={styles.historySection}>
              <div className={styles.sectionTitle}><Users size={16} /><strong>Relações importantes</strong></div>
              {([
                ['ROBERTO', 'Dr. Roberto Ramos'],
                ['MARIANA', 'Mariana Duarte'],
                ['LAWYER_FELIPE', 'Dr. Felipe Martins'],
                ['FRIEND_CARLOS', 'Carlos Nogueira'],
                ...(hasPartner ? [['PARTNER', social.profile.partnerName || 'Parceiro(a)']] : []),
              ] as Array<[keyof typeof social.relationships, string]>).map(([contactId, name]) => (
                <div key={contactId} className={styles.historyRow}>
                  <div><strong>{name}</strong><span>{getRelationshipLabel(social.relationships[contactId])}</span></div>
                  <small>{social.relationships[contactId]}/100</small>
                </div>
              ))}
            </section>

            <section className={styles.historySection}>
              <div className={styles.sectionTitle}><Sparkles size={16} /><strong>Últimos momentos</strong></div>
              {social.history.length === 0 ? (
                <p className={styles.emptyHistory}>Sua história fora do escritório ainda está começando.</p>
              ) : (
                social.history.slice(0, 6).map((event) => (
                  <div key={event.id} className={styles.historyRow}>
                    <div><strong>{event.title}</strong><span>{event.contactName} • {event.completedDateKey || event.createdDateKey}</span></div>
                    <small>{event.status === 'COMPLETED' ? `Participou • R$ ${event.moneySpent || 0}` : 'Convite recusado'}</small>
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

      {selectedEvent && !selectedOption && (
        <div className={styles.backdrop}>
          <section className={styles.inviteDecision} role="dialog" aria-modal="true" aria-label="Escolher programa social">
            <header>
              <div className={styles.bigIcon}>{eventIcon(selectedEvent.kind)}</div>
              <span>{selectedEvent.contactName} • {selectedEvent.contactRole}</span>
              <h2>{selectedEvent.title}</h2>
              <p>Você pode aceitar ou voltar e recusar. Cada programa consome dinheiro e tempo, altera seus atributos sociais e pode afetar sua energia para compromissos profissionais.</p>
            </header>

            {selectedEvent.professionalRisk && (
              <div className={`mt-4 rounded-xl border p-4 text-xs leading-relaxed ${riskTone(selectedEvent.professionalRisk.level)}`}>
                <strong className="block text-[10px] uppercase tracking-[0.1em]">Antes de decidir</strong>
                <p className="mt-1">{selectedEvent.professionalRisk.message}</p>
              </div>
            )}

            <div className={styles.packageGrid}>
              {selectedEvent.options.map((option) => (
                <button type="button" key={option.id} disabled={player.money < option.cost} onClick={() => startEvent(option)}>
                  <WalletCards size={18} />
                  <div>
                    <strong>{option.label}</strong>
                    <p>{option.detail}</p>
                    <span>R$ {option.cost.toLocaleString('pt-BR')}</span>
                    <p>Social {option.socialGain >= 0 ? '+' : ''}{option.socialGain} • Capital {option.capitalGain >= 0 ? '+' : ''}{option.capitalGain} • Energia {option.energyDelta >= 0 ? '+' : ''}{option.energyDelta}</p>
                    {option.caseHoursCost > 0 && <p>Consome cerca de {option.caseHoursCost}h da sua janela de preparação do caso ativo.</p>}
                    {option.daysAdvance > 0 && <p>Calendário avança {option.daysAdvance} dia(s).</p>}
                  </div>
                </button>
              ))}
            </div>

            <div className={styles.inviteFooter}>
              <span>Saldo atual: <strong>R$ {player.money.toLocaleString('pt-BR')}</strong></span>
              <button type="button" onClick={() => { setSelectedEvent(null); setIsOpen(true); }}>Voltar sem aceitar</button>
            </div>
          </section>
        </div>
      )}

      {selectedEvent && selectedOption && sceneCopy && (
        <div className={styles.nightScene} role="dialog" aria-modal="true" aria-label={selectedEvent.title}>
          <div className={styles.lightOne} />
          <div className={styles.lightTwo} />
          <div className={styles.lightThree} />
          <div className={styles.lightFour} />
          <div className={styles.barNoise} />

          <section className={styles.nightContent}>
            <div className={styles.barSign}>{eventIcon(selectedEvent.kind)}</div>
            <span>{sceneCopy.eyebrow}</span>
            <h2>{sceneCopy.title}</h2>
            <p>{sceneCopy.description}</p>

            <div className={styles.nightReceipt}>
              <div><span>Programa</span><strong>{selectedOption.label}</strong></div>
              <div><span>Gasto</span><strong>R$ {selectedOption.cost.toLocaleString('pt-BR')}</strong></div>
              <div><span>Atributo social</span><strong>+{selectedOption.socialGain}</strong></div>
              <div><span>Capital social</span><strong>{selectedOption.capitalGain >= 0 ? '+' : ''}{selectedOption.capitalGain}</strong></div>
              <div><span>Energia</span><strong>{selectedOption.energyDelta >= 0 ? '+' : ''}{selectedOption.energyDelta}</strong></div>
              <div><span>Tempo do caso</span><strong>{selectedOption.caseHoursCost ? `-${selectedOption.caseHoursCost}h` : 'sem impacto'}</strong></div>
            </div>

            {usesBarAudio(selectedEvent.kind) && (
              <>
                <button type="button" className={styles.audioButton} onClick={toggleAudio}>
                  <Music2 size={17} /> {audioEnabled ? 'Desligar som ambiente' : 'Ligar som ambiente'}
                </button>
                {audioAvailable === false && (
                  <small className={styles.audioHint}>O áudio ambiente não pôde ser reproduzido. A cena continua normalmente com os efeitos visuais.</small>
                )}
              </>
            )}

            {selectedEvent.professionalRisk?.hasPlayableHearing && selectedOption.energyDelta < 0 && (
              <div className="mx-auto mt-4 max-w-xl rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-3 text-left text-xs leading-relaxed text-[#FCD34D]">
                <div className="flex items-start gap-2"><BatteryMedium size={17} className="mt-0.5 shrink-0" /><span>Você sabe que existe uma audiência neste processo. Esta escolha pode fazer você chegar cansado e com menos horas de preparação.</span></div>
              </div>
            )}

            <button type="button" className={styles.finishNight} onClick={finishEvent}>Encerrar compromisso e seguir a rotina</button>
          </section>
        </div>
      )}
    </>
  );
};
