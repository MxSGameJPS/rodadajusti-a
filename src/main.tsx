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
import { PostOabEmploymentExperience } from './components/PostOabEmploymentExperience/PostOabEmploymentExperience';
import { ProfessionalDemoRoute } from './components/ProfessionalDemoRoute/ProfessionalDemoRoute';
import { ProfessionalLifeExperience } from './components/ProfessionalLifeExperience/ProfessionalLifeExperience';
import { ProfessionalPhone } from './components/ProfessionalPhone/ProfessionalPhone';
import { ProfessionalProfileEmploymentGate } from './components/ProfessionalProfileEmploymentGate';
import { ProfessionalTreatmentGate } from './components/ProfessionalTreatmentGate';
import { hydrateCaseCatalog } from './lib/caseRepository';
import './index.css';

function isProfessionalDemoRoute() {
  return window.location.pathname === '/demo/advogado' || window.location.pathname === '/demo/contratacao';
}

async function bootstrap() {
  await hydrateCaseCatalog();

  const root = createRoot(document.getElementById('root')!);

  if (isProfessionalDemoRoute()) {
    root.render(
      <StrictMode>
        <ProfessionalDemoRoute />
      </StrictMode>,
    );
    return;
  }

  root.render(
    <StrictMode>
      <AccountSaveBoundary>
        <AuthRouteSync />
        <CinematicIntroGate>
          <AuthGate>
            <CareerIntroGate>
              <App />
              <ProfessionalTreatmentGate />
              <PostOabEmploymentExperience />
              <ProfessionalPhone />
              <ProfessionalLifeExperience />
              <ProfessionalProfileEmploymentGate />
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
