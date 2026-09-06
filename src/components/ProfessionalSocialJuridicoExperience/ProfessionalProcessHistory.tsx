import React from 'react';
import { GAME_CASES } from '../../data/cases';
import type { PlayerProfile } from '../../types/game';
import { CaseMetadataBadges, ProcessStatusPanel } from '../CaseLifecycle/CaseLifecycle';
import styles from './ProfessionalProcessHistory.module.css';

interface ProfessionalProcessHistoryProps {
  player: PlayerProfile;
}

export const ProfessionalProcessHistory: React.FC<ProfessionalProcessHistoryProps> = ({ player }) => {
  const records = player.history.slice(0, 5);
  if (records.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <span>Histórico processual</span>
        <h4>Decisões anteriores e situação dos recursos</h4>
        <p>Uma decisão não encerra automaticamente o processo. O encerramento definitivo só ocorre quando houver trânsito em julgado.</p>
      </div>

      <div className={styles.list}>
        {records.map((record) => {
          const caseItem = GAME_CASES.find((item) => item.id === record.caseId) || null;
          if (!caseItem) return null;

          return (
            <article key={`${record.caseId}-${record.completedDate}`} className={styles.item}>
              <div className={styles.top}>
                <div>
                  <CaseMetadataBadges caseItem={caseItem} />
                  <strong>{record.caseTitle}</strong>
                </div>
                <span className={`${styles.result} ${record.success ? styles.win : styles.loss}`}>
                  {record.success ? 'Decisão favorável' : 'Decisão desfavorável'}
                </span>
              </div>
              <div className={styles.status}>
                <ProcessStatusPanel record={record} player={player} catalog={GAME_CASES} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
