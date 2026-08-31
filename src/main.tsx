import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './data/casesExpansion';
import App from './App.tsx';
import { SocialJuridicoExperience } from './components/SocialJuridicoExperience';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <SocialJuridicoExperience />
  </StrictMode>,
);
