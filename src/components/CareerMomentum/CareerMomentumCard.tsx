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
import { isIndependentProfessional } from '../../lib/professionalEmployment';
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
  const independent = isIndependentProfessional(player);
  const verdictHook = context === 'VERDICT' && currentCase && result
    ? getVerdictCareerHook(player, result, currentCase, promotedToTier)
    : null;

  const independentUnlocks = independent
    ? [
        {
          id: 'own-client-base',
          title: 'Carteira própria de clientes',
          description: 'Cada novo atendimento passa a fortalecer o seu nome, não o nome do antigo escritório.',
          hidden: false,
        },
        {
          id: 'independent-office',
          title: player.officeFinances.isOfficeOpen ? 'Consolidar seu escritório' : 'Escritório próprio já é possível',
          description: player.officeFinances.isOfficeOpen
            ? 'Transforme a estrutura que você abriu em uma operação capaz de atrair clientes melhores e crescer.'
            : 'Você pode abrir sua própria estrutura agora, mesmo sem grande reputação — assumindo o risco de começar pequeno.',
          hidden: false,
        },
        {
          id: 'bigger-independent-clients',
          title: 'Clientes de maior valor',
          description: 'Reputação, resultados e networking podem fazer casos mais relevantes chegarem diretamente até você.',
          hidden: true,
        },
        {
          id: 'team-expansion',
          title: 'Equipe e expansão',
          description: 'Uma carreira independente bem-sucedida pode deixar de ser individual e virar uma estrutura própria.',
          hidden: true,
        },
      ]
    : momentum.unlocks;

  const visibleUnlocks = independentUnlocks.filter((item) => !item.hidden).slice(0, 3);
  const hiddenUnlocks = independentUnlocks.filter((item) => item.hidden).slice(0, 2);
  const currentTitle = independent
    ? player.officeFinances.isOfficeOpen
      ? `Advogado independente • ${player.officeFinances.officeName}`
      : 'Advogado autônomo'
    : momentum.currentTitle;
  const nextTitle = independent
    ? player.officeFinances.isOfficeOpen
      ? 'Consolidar seu próprio escritório'
      : 'Construir uma carteira própria'
    : momentum.nextTitle;
  const narrative = independent
    ? context === 'VERDICT' && result
      ? 'Sem um escritório por trás, cada resultado passa a impactar diretamente o seu nome, sua reputação e a capacidade de conquistar o próximo cliente.'
      : 'O vínculo com o Ramos & Associados terminou. Sua progressão não parou: agora o desafio é transformar reputação, contatos e resultados em clientes que escolhem você.'
    : verdictHook?.message || momentum.narrative;

  const showNpcQuote = !independent && Boolean(verdictHook || momentum.npcQuote);

  return (
    <section className={`${styles.card} ${context === 'VERDICT' ? styles.verdictCard : ''}`} aria-label="Próxima conquista da carreira">
      <div className={styles.glow} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.headerIcon}>
          <Sparkles size={21} />
        </div>
        <div className={styles.headerCopy}>
          <span>{independent ? 'Seu próximo capítulo depende de você' : verdictHook?.title || momentum.eyebrow}</span>
          <h3>{nextTitle}</h3>
          <p>{narrative}</p>
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
            <span>{independent ? 'Resultados e reputação construindo sua autonomia' : momentum.progressLabel}</span>
          </div>
          <strong>{currentTitle}</strong>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${momentum.progressPercent}%` }} />
        </div>
      </div>

      {showNpcQuote && (
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
        <span>{independent ? 'Sua autonomia abre caminhos diferentes dos que existiam dentro do antigo escritório.' : 'Algumas oportunidades continuam ocultas até a carreira atingir o momento certo.'}</span>
      </footer>
    </section>
  );
};
