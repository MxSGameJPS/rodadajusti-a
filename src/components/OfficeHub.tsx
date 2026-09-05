import React from 'react';
import type { LegalCase, PlayerProfile } from '../types/game';
import { isProfessionalEmploymentActive } from '../lib/professionalEmployment';
import { OfficeHub as LegacyOfficeHub } from './LegacyOfficeHub';
import { ProfessionalOfficeHub } from './ProfessionalOfficeHub/ProfessionalOfficeHub';

interface OfficeHubProps {
  player: PlayerProfile;
  onSelectCaseToView: (c: LegalCase) => void;
  onResumeActiveCase: () => void;
  onOpenCareerModal: () => void;
  onOpenAcademicModal: () => void;
  onOpenConcursoModal: () => void;
  onOpenOfficeModal: () => void;
  onOpenOabExam: () => void;
}

export const OfficeHub: React.FC<OfficeHubProps> = (props) => {
  if (isProfessionalEmploymentActive(props.player)) {
    return (
      <ProfessionalOfficeHub
        player={props.player}
        onResumeActiveCase={props.onResumeActiveCase}
        onOpenCareerModal={props.onOpenCareerModal}
        onOpenAcademicModal={props.onOpenAcademicModal}
        onOpenConcursoModal={props.onOpenConcursoModal}
        onOpenOfficeModal={props.onOpenOfficeModal}
      />
    );
  }

  return <LegacyOfficeHub {...props} />;
};
