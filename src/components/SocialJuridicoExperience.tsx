import React from 'react';
import type { LegalCase, PlayerProfile, SocialJuridicoToolUse } from '../types/game';
import {
  isIndependentProfessional,
  isRamosEmploymentActive,
} from '../lib/professionalEmployment';
import { IndependentSocialJuridicoExperience } from './IndependentSocialJuridicoExperience/IndependentSocialJuridicoExperience';
import { SocialJuridicoExperience as LegacySocialJuridicoExperience } from './LegacySocialJuridicoExperience';
import { ProfessionalSocialJuridicoExperience } from './ProfessionalSocialJuridicoExperience/ProfessionalSocialJuridicoExperience';

interface SocialJuridicoExperienceProps {
  player: PlayerProfile;
  currentCase: LegalCase | null;
  onUseTool: (tool: SocialJuridicoToolUse) => void;
}

export const SocialJuridicoExperience: React.FC<SocialJuridicoExperienceProps> = (props) => {
  if (isIndependentProfessional(props.player)) {
    return <IndependentSocialJuridicoExperience {...props} />;
  }

  if (isRamosEmploymentActive(props.player)) {
    return <ProfessionalSocialJuridicoExperience {...props} />;
  }

  return <LegacySocialJuridicoExperience {...props} />;
};
