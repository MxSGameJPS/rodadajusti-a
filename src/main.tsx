import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthGate } from './components/AuthGate';
import { SocialJuridicoExperience } from './components/SocialJuridicoExperience';
import { hydrateCaseCatalog } from './lib/caseRepository';
import './index.css';

async function bootstrap() {
  await hydrateCaseCatalog();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthGate>
        <App />
        <SocialJuridicoExperience />
      </AuthGate>
    </StrictMode>,
  );
}

void bootstrap();
