import React from 'react';
import type { LegalCase, PlayerProfile } from '../types/game';
import {
  isIndependentProfessional,
  isRamosEmploymentActive,
} from '../lib/professionalEmployment';
import { CareerMomentumCard } from './CareerMomentum/CareerMomentumCard';
import { IndependentProfessionalHub } from './IndependentProfessionalHub/IndependentProfessionalHub';
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
  let hub: React.ReactNode;

  if (isIndependentProfessional(props.player)) {
    hub = (
      <IndependentProfessionalHub
        player={props.player}
        onResumeActiveCase={props.onResumeActiveCase}
        onOpenCareerModal={props.onOpenCareerModal}
        onOpenAcademicModal={props.onOpenAcademicModal}
        onOpenConcursoModal={props.onOpenConcursoModal}
      />
    );
  } else if (isRamosEmploymentActive(props.player)) {
    hub = (
      <ProfessionalOfficeHub
        player={props.player}
        onResumeActiveCase={props.onResumeActiveCase}
        onOpenCareerModal={props.onOpenCareerModal}
        onOpenAcademicModal={props.onOpenAcademicModal}
        onOpenConcursoModal={props.onOpenConcursoModal}
        onOpenOfficeModal={props.onOpenOfficeModal}
      />
    );
  } else {
    hub = <LegacyOfficeHub {...props} />;
  }

  return (
    <>
      <CareerMomentumCard player={props.player} />
      {hub}
    </>
  );
};
