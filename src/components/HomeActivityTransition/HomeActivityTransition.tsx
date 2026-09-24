import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bath,
  BedDouble,
  BookOpenCheck,
  Coffee,
  FastForward,
  Moon,
  Sparkles,
  Sun,
  Utensils,
} from 'lucide-react';
import styles from './HomeActivityTransition.module.css';

export type HomeActivityKind =
  | 'SLEEP'
  | 'SHOWER'
  | 'MEAL'
  | 'STUDY_HOME'
  | 'STUDY_UNIVERSITY';

interface HomeActivityTransitionProps {
  kind: HomeActivityKind;
  mealLabel?: string;
  onComplete: () => void;
}

const CONFIG: Record<HomeActivityKind, {
  eyebrow: string;
  title: string;
  detail: string;
  durationMs: number;
  simulatedTime: string;
}> = {
  SLEEP: {
    eyebrow: 'Quarto',
    title: 'Descansando',
    detail: 'A noite passa enquanto sua energia é recuperada.',
    durationMs: 3600,
    simulatedTime: '+8h',
  },
  SHOWER: {
    eyebrow: 'Banheiro',
    title: 'Tomando banho',
    detail: 'Higiene em dia antes de continuar a rotina.',
    durationMs: 2800,
    simulatedTime: '+30min',
  },
  MEAL: {
    eyebrow: 'Cozinha',
    title: 'Preparando a refeição',
    detail: 'Uma unidade da despensa será consumida.',
    durationMs: 3000,
    simulatedTime: '+45min',
  },
  STUDY_HOME: {
    eyebrow: 'Área de estudos',
    title: 'Estudando em casa',
    detail: 'Leitura, revisão e preparação acadêmica.',
    durationMs: 3200,
    simulatedTime: '+2h',
  },
  STUDY_UNIVERSITY: {
    eyebrow: 'Faculdade',
    title: 'Em aula e na biblioteca',
    detail: 'A rotina acadêmica avança antes do retorno para casa.',
    durationMs: 3600,
    simulatedTime: '+3h',
  },
};

function ActivityIcon({ kind }: { kind: HomeActivityKind }) {
  if (kind === 'SLEEP') return <BedDouble size={56} />;
  if (kind === 'SHOWER') return <Bath size={56} />;
  if (kind === 'MEAL') return <Utensils size={56} />;
  return <BookOpenCheck size={56} />;
}

export const HomeActivityTransition: React.FC<HomeActivityTransitionProps> = ({
  kind,
  mealLabel,
  onComplete,
}) => {
  const config = CONFIG[kind];
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);

  const displayTitle = useMemo(() => {
    if (kind !== 'MEAL' || !mealLabel) return config.title;
    return mealLabel;
  }, [config.title, kind, mealLabel]);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setProgress(1);
    onComplete();
  };

  useEffect(() => {
    completedRef.current = false;
    setProgress(0);

    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const next = Math.min(1, (now - startedAt) / config.durationMs);
      setProgress(next);
      if (next >= 1) {
        window.setTimeout(finish, 220);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  return (
    <section className={styles.scene}>
      <div className={`${styles.ambient} ${styles['ambient' + kind]}`} aria-hidden="true">
        {kind === 'SLEEP' && (
          <>
            <Moon className={styles.moon} />
            <Sun className={styles.sun} />
            <span className={styles.starOne}>✦</span>
            <span className={styles.starTwo}>✦</span>
            <span className={styles.starThree}>✦</span>
          </>
        )}

        {kind === 'SHOWER' && (
          <>
            <span className={styles.steamOne} />
            <span className={styles.steamTwo} />
            <span className={styles.steamThree} />
          </>
        )}

        {kind === 'MEAL' && (
          <>
            <Coffee className={styles.mealAccentOne} />
            <Sparkles className={styles.mealAccentTwo} />
          </>
        )}

        {(kind === 'STUDY_HOME' || kind === 'STUDY_UNIVERSITY') && (
          <>
            <span className={styles.pageOne}>§</span>
            <span className={styles.pageTwo}>Art.</span>
            <span className={styles.pageThree}>CF</span>
          </>
        )}
      </div>

      <div className={styles.content}>
        <span className={styles.eyebrow}>{config.eyebrow}</span>

        <div className={styles.iconShell}>
          <ActivityIcon kind={kind} />
        </div>

        <h2>{displayTitle}</h2>
        <p>{config.detail}</p>

        <div className={styles.timeBadge}>
          <span>Tempo da rotina</span>
          <strong>{config.simulatedTime}</strong>
        </div>

        <div className={styles.progressTrack}>
          <i style={{ width: Math.round(progress * 100) + '%' }} />
        </div>
        <small>{Math.round(progress * 100)}% concluído</small>

        <button type="button" onClick={finish} className={styles.skip}>
          <FastForward size={15} />
          Pular animação
        </button>
      </div>
    </section>
  );
};
