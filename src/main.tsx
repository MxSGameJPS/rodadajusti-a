import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthGate } from './components/AuthGate';
import { AuthRouteSync } from './components/AuthRouteSync';
import { CinematicIntroGate } from './components/CinematicIntroGate/CinematicIntroGate';
import { hydrateCaseCatalog } from './lib/caseRepository';
import './index.css';

async function bootstrap() {
  await hydrateCaseCatalog();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthRouteSync />
      <CinematicIntroGate>
        <AuthGate>
          <App />
        </AuthGate>
      </CinematicIntroGate>
    </StrictMode>,
  );
}

void bootstrap();
