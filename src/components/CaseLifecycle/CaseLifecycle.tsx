import React from 'react';
import { AlertTriangle, CheckCircle2, Flame, Gavel, Landmark, Scale } from 'lucide-react';
import type { CaseHistoryRecord, LegalCase, PlayerProfile } from '../../types/game';
import {
  getCaseRepercussionLevel,
  getRepercussionLabel,
  getShortStageLabel,
} from '../../lib/caseMetadata';
import { getProcessStatusInfo } from '../../lib/processLifecycle';
import styles from './CaseLifecycle.module.css';

interface CaseMetadataBadgesProps {
  caseItem: LegalCase;
}

interface ProcessStatusPanelProps {
  record: CaseHistoryRecord;
  player: PlayerProfile;
  catalog: LegalCase[];
}

function repercussionClass(level: ReturnType<typeof getCaseRepercussionLevel>) {
  if (level === 'NACIONAL') return styles.national;
  if (level === 'GRANDE_REPERCUSSAO') return styles.major;
  if (level === 'RELEVANTE') return styles.relevant;
  return '';
}

export const CaseMetadataBadges: React.FC<CaseMetadataBadgesProps> = ({ caseItem }) => {
  const level = getCaseRepercussionLevel(caseItem);
  return (
    <div className={styles.badges}>
      <span className={`${styles.badge} ${styles.stage}`}><Landmark size={11} /> {getShortStageLabel(caseItem)}</span>
      {level !== 'COMUM' && (
        <span className={`${styles.badge} ${repercussionClass(level)}`}><Flame size={11} /> {getRepercussionLabel(caseItem)}</span>
      )}
    </div>
  );
};

export const ProcessStatusPanel: React.FC<ProcessStatusPanelProps> = ({ record, player, catalog }) => {
  const info = getProcessStatusInfo(record, player, catalog);
  const Icon = info.status === 'TRANSITO_EM_JULGADO'
    ? CheckCircle2
    : info.status === 'PRAZO_RECURSAL_ABERTO'
      ? AlertTriangle
      : info.status === 'RECURSO_PARTE_CONTRARIA' || info.status === 'RECURSO_EM_TRAMITACAO'
        ? Gavel
        : Scale;

  return (
    <div className={`${styles.panel} ${styles[info.tone]}`}>
      <div className={styles.panelHeader}>
        <Icon size={17} />
        <div>
          <span>Status do processo</span>
          <strong>{info.label}</strong>
        </div>
      </div>
      <p className={styles.description}>{info.description}</p>
      {(info.appealTypeLabel || info.appealDeadlineLabel) && (
        <div className={styles.meta}>
          {info.appealTypeLabel && <span>Medida: <strong>{info.appealTypeLabel}</strong></span>}
          {info.appealDeadlineLabel && <span>Prazo até: <strong>{info.appealDeadlineLabel}</strong></span>}
        </div>
      )}
    </div>
  );
};
