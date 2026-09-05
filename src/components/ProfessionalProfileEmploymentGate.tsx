import React, { useEffect, useState } from 'react';
import { isProfessionalEmploymentActive } from '../lib/professionalEmployment';
import { readCurrentPlayerSnapshot } from '../lib/professionalRpg';
import { ProfessionalProfileExperience } from './ProfessionalProfileExperience';

export const ProfessionalProfileEmploymentGate: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    let active = true;

    const sync = () => {
      const player = readCurrentPlayerSnapshot();
      if (active) setIsEnabled(Boolean(player && isProfessionalEmploymentActive(player)));
    };

    sync();
    const timer = window.setInterval(sync, 900);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return isEnabled ? <ProfessionalProfileExperience /> : null;
};
