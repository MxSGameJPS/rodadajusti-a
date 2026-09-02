import React, { useMemo } from 'react';
import styles from './CelebrationBurst.module.css';

interface CelebrationBurstProps {
  intensity?: 'normal' | 'strong';
}

const COLOR_CLASSES = [styles.gold, styles.green, styles.blue, styles.ivory, styles.orange];

export const CelebrationBurst: React.FC<CelebrationBurstProps> = ({ intensity = 'normal' }) => {
  const pieces = useMemo(() => {
    const count = intensity === 'strong' ? 72 : 48;

    return Array.from({ length: count }, (_, index) => ({
      id: index,
      left: (index * 37 + 11) % 100,
      delay: ((index * 17) % 24) / 20,
      duration: 2.4 + ((index * 13) % 18) / 10,
      drift: ((index * 29) % 180) - 90,
      spin: 360 + ((index * 41) % 720),
      size: 6 + ((index * 7) % 7),
      colorClass: COLOR_CLASSES[index % COLOR_CLASSES.length],
    }));
  }, [intensity]);

  return (
    <div className={styles.layer} aria-hidden="true">
      <div className={`${styles.glow} ${intensity === 'strong' ? styles.glowStrong : ''}`} />
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={`${styles.piece} ${piece.colorClass}`}
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${Math.max(4, piece.size * 0.55)}px`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            '--drift': `${piece.drift}px`,
            '--spin': `${piece.spin}deg`,
          } as React.CSSProperties & { '--drift': string; '--spin': string }}
        />
      ))}
    </div>
  );
};
