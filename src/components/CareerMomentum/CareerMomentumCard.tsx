import React from 'react';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  LockKeyhole,
  Sparkles,
  Target,
} from 'lucide-react';
import type { CaseHistoryRecord, CareerTierId, LegalCase, PlayerProfile } from '../../types/game';
import { getCareerMomentum, getVerdictCareerHook } from '../../lib/careerMomentum';
import styles from './CareerMomentumCard.module.css';

interface CareerMomentumCardProps {
  player: PlayerProfile;
  context?: 'HUB' | 'VERDICT';
  currentCase?: LegalCase | null;
  result?: CaseHistoryRecord | null;
  promotedToTier?: CareerTierId | null;
}

export const CareerMomentumCard: React.FC<CareerMomentumCardProps> = ({
  player,
  context = 'HUB',
  currentCase = null,
  result = null,
  promotedToTier = null,
}) => {
  const momentum = getCareerMomentum(player);
  const verdictHook = context === 'VERDICT' && currentCase && result
    ? getVerdictCareerHook(player, result, currentCase, promotedToTier)
    : null;
  const visibleUnlocks = momentum.unlocks.filter((item) => !item.hidden).slice(0, 3);
  const hiddenUnlocks = momentum.unlocks.filter((item) => item.hidden).slice(0, 2);

  return (
    <section className={`${styles.card} ${context === 'VERDICT' ? styles.verdictCard : ''}`} aria-label="Próxima conquista da carreira">
      <div className={styles.glow} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.headerIcon}>
          <Sparkles size={21} />
        </div>
        <div className={styles.headerCopy}>
          <span>{verdictHook?.title || momentum.eyebrow}</span>
          <h3>{momentum.nextTitle}</h3>
          <p>{verdictHook?.message || momentum.narrative}</p>
        </div>
        <div className={styles.progressBadge}>
          <strong>{momentum.progressPercent}%</strong>
          <span>trajetória</span>
        </div>
      </header>

      <div className={styles.progressBlock}>
        <div className={styles.progressMeta}>
          <div>
            <Target size={14} />
            <span>{momentum.progressLabel}</span>
          </div>
          <strong>{momentum.currentTitle}</strong>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${momentum.progressPercent}%` }} />
        </div>
      </div>

      {(verdictHook || momentum.npcQuote) && (
        <blockquote className={styles.quote}>
          <div className={styles.quoteIcon}><BriefcaseBusiness size={17} /></div>
          <div>
            <p>“{verdictHook?.npcQuote || momentum.npcQuote}”</p>
            <footer>{verdictHook?.npcName || momentum.npcName} <span>• {momentum.npcRole}</span></footer>
          </div>
        </blockquote>
      )}

      <div className={styles.contentGrid}>
        <div className={styles.requirements}>
          <div className={styles.sectionHeading}>
            <span>Sinais da sua evolução</span>
            <Eye size={15} />
          </div>
          {momentum.requirements.length === 0 ? (
            <div className={styles.emptyRequirement}>Você chegou a um ponto em que o próximo objetivo é construir legado, não apenas preencher requisitos.</div>
          ) : (
            momentum.requirements.slice(0, 4).map((requirement) => (
              <div key={requirement.id} className={styles.requirementRow}>
                {requirement.met
                  ? <CheckCircle2 size={14} className={styles.metIcon} />
                  : <span className={styles.pendingDot} />}
                <span>{requirement.label}</span>
                <strong>{requirement.current}</strong>
              </div>
            ))
          )}
        </div>

        <div className={styles.unlocks}>
          <div className={styles.sectionHeading}>
            <span>O que começa a aparecer no horizonte</span>
            <ArrowUpRight size={15} />
          </div>
          {visibleUnlocks.map((unlock) => (
            <article key={unlock.id} className={styles.unlockItem}>
              <div className={styles.unlockDot} />
              <div>
                <strong>{unlock.title}</strong>
                <p>{unlock.description}</p>
              </div>
            </article>
          ))}
          {hiddenUnlocks.map((unlock) => (
            <article key={unlock.id} className={styles.hiddenUnlock}>
              <LockKeyhole size={14} />
              <div>
                <strong>{unlock.title}</strong>
                <p>{unlock.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <footer className={styles.footer}>
        <LockKeyhole size={13} />
        <span>Algumas oportunidades continuam ocultas até a carreira atingir o momento certo.</span>
      </footer>
    </section>
  );
};
