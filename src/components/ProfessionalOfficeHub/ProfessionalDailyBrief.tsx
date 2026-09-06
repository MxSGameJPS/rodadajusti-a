import React, { useMemo } from 'react';
import { AlertTriangle, CalendarDays, Clock3, FolderKanban, MessageCircle, Sparkles } from 'lucide-react';
import { buildProfessionalAgenda, type ProfessionalAgendaAction } from '../../lib/professionalLife';
import { OPEN_SOCIAL_LIFE_EVENT, getGameWeekdayLabel } from '../../lib/socialLife';
import type { PlayerProfile } from '../../types/game';
import { sound } from '../../utils/sound';
import styles from './ProfessionalDailyBrief.module.css';

const OPEN_SOCIAL_JURIDICO_EVENT = 'rota:open-social-juridico';
const OPEN_PHONE_EVENT = 'rota:open-professional-phone';

interface ProfessionalDailyBriefProps {
  player: PlayerProfile;
  onResumeActiveCase: () => void;
}

function actionLabel(action: ProfessionalAgendaAction) {
  if (action === 'CRM') return 'Abrir CRM';
  if (action === 'PHONE') return 'Abrir celular';
  if (action === 'SOCIAL') return 'Responder';
  return 'Continuar caso';
}

export const ProfessionalDailyBrief: React.FC<ProfessionalDailyBriefProps> = ({ player, onResumeActiveCase }) => {
  const items = useMemo(() => buildProfessionalAgenda(player), [
    player.activeCase?.caseId,
    player.activeCase?.hoursSpent,
    player.careerTier,
    player.gameCurrentDay,
    player.gameCurrentMonth,
    player.gameCurrentYear,
    player.history,
  ]);
  const urgentCount = items.filter((item) => item.urgent).length;
  const date = `${String(player.gameCurrentDay).padStart(2, '0')}/${String(player.gameCurrentMonth).padStart(2, '0')}/${player.gameCurrentYear}`;

  const execute = (action: ProfessionalAgendaAction) => {
    sound.playClick();
    if (action === 'CASE') {
      onResumeActiveCase();
      return;
    }
    if (action === 'CRM') {
      window.dispatchEvent(new CustomEvent(OPEN_SOCIAL_JURIDICO_EVENT));
      return;
    }
    if (action === 'SOCIAL') {
      window.dispatchEvent(new CustomEvent(OPEN_SOCIAL_LIFE_EVENT));
      return;
    }
    window.dispatchEvent(new CustomEvent(OPEN_PHONE_EVENT));
  };

  return (
    <section className={styles.brief} aria-label="Agenda integrada do expediente">
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.icon}><CalendarDays size={20} /></div>
          <div>
            <span>Vida profissional persistente</span>
            <h3>Agenda do dia</h3>
            <p>{getGameWeekdayLabel(player)} • {date}</p>
          </div>
        </div>
        <div className={urgentCount > 0 ? styles.urgentBadge : styles.calmBadge}>
          {urgentCount > 0 ? <AlertTriangle size={14} /> : <Sparkles size={14} />}
          <strong>{urgentCount > 0 ? `${urgentCount} prioridade(s)` : 'Sem urgências'}</strong>
        </div>
      </header>

      <div className={styles.list}>
        {items.map((item) => (
          <article key={item.id} className={`${styles.item} ${styles[item.tone]}`}>
            <div className={styles.itemIcon}>
              {item.action === 'PHONE' ? <MessageCircle size={17} /> : item.action === 'SOCIAL' ? <Sparkles size={17} /> : item.action === 'CRM' ? <FolderKanban size={17} /> : <Clock3 size={17} />}
            </div>
            <div className={styles.itemCopy}>
              <div className={styles.itemTop}>
                <strong>{item.title}</strong>
                {item.urgent && <span>Prioridade</span>}
              </div>
              <p>{item.description}</p>
              <small>{item.meta}</small>
            </div>
            <button type="button" onClick={() => execute(item.action)}>{actionLabel(item.action)}</button>
          </article>
        ))}
      </div>

      <footer className={styles.footer}>
        <span>CRM, recursos, prazos, celular e vida social passam a disputar o mesmo tempo do personagem.</span>
      </footer>
    </section>
  );
};
