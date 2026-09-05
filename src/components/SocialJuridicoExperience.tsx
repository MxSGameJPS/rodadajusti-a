import React from 'react';
import type { LegalCase, PlayerProfile, SocialJuridicoToolUse } from '../types/game';
import { isProfessionalEmploymentActive } from '../lib/professionalEmployment';
import { SocialJuridicoExperience as LegacySocialJuridicoExperience } from './LegacySocialJuridicoExperience';
import { ProfessionalSocialJuridicoExperience } from './ProfessionalSocialJuridicoExperience/ProfessionalSocialJuridicoExperience';

interface SocialJuridicoExperienceProps {
  player: PlayerProfile;
  currentCase: LegalCase | null;
  onUseTool: (tool: SocialJuridicoToolUse) => void;
}

export const SocialJuridicoExperience: React.FC<SocialJuridicoExperienceProps> = (props) => {
  if (isProfessionalEmploymentActive(props.player)) {
    return <ProfessionalSocialJuridicoExperience {...props} />;
  }

  return <LegacySocialJuridicoExperience {...props} />;
};
