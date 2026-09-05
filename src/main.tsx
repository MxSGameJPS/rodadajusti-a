import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AccountSaveBoundary } from './components/AccountSaveBoundary';
import { AuthGate } from './components/AuthGate';
import { AuthRouteSync } from './components/AuthRouteSync';
import { CareerIntroGate } from './components/CareerIntroGate/CareerIntroGate';
import { CinematicIntroGate } from './components/CinematicIntroGate/CinematicIntroGate';
import { DisciplinaryDefenseExperienceV2 } from './components/DisciplinaryDefenseExperienceV2';
import { EthicalDilemmaExperience } from './components/EthicalDilemmaExperience';
import { MisconductConsequenceExperience } from './components/MisconductConsequenceExperience';
import { ProfessionalProfileExperience } from './components/ProfessionalProfileExperience';
import { hydrateCaseCatalog } from './lib/caseRepository';
import './index.css';

async function bootstrap() {
  await hydrateCaseCatalog();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AccountSaveBoundary>
        <AuthRouteSync />
        <CinematicIntroGate>
          <AuthGate>
            <CareerIntroGate>
              <App />
              <ProfessionalProfileExperience />
              <EthicalDilemmaExperience />
              <MisconductConsequenceExperience />
              <DisciplinaryDefenseExperienceV2 />
            </CareerIntroGate>
          </AuthGate>
        </CinematicIntroGate>
      </AccountSaveBoundary>
    </StrictMode>,
  );
}

void bootstrap();
