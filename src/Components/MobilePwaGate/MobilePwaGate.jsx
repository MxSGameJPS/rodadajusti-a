import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  RotateCcw,
  Scale,
  Share2,
  Smartphone,
} from 'lucide-react';
import {
  PWA_INSTALL_AVAILABLE_EVENT,
  PWA_INSTALLED_EVENT,
  isInstallPromptAvailable,
  isIosDevice,
  isLikelyMobileDevice,
  isPortraitOrientation,
  isPwaStandalone,
  promptPwaInstall,
  requestLandscapeMode,
} from '../../lib/pwa';
import styles from './MobilePwaGate.module.css';

const BROWSER_SESSION_KEY = 'rota_pwa_browser_session';

function readBrowserSessionChoice() {
  try {
    return window.sessionStorage.getItem(BROWSER_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function MobilePwaGate({ children }) {
  const [isMobile, setIsMobile] = useState(() => isLikelyMobileDevice());
  const [isStandalone, setIsStandalone] = useState(() => isPwaStandalone());
  const [isPortrait, setIsPortrait] = useState(() => isPortraitOrientation());
  const [installAvailable, setInstallAvailable] = useState(() => isInstallPromptAvailable());
  const [browserSessionAllowed, setBrowserSessionAllowed] = useState(() => readBrowserSessionChoice());
  const [installing, setInstalling] = useState(false);
  const [installedNow, setInstalledNow] = useState(false);

  const isIos = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    const orientationMedia = window.matchMedia('(orientation: portrait)');
    const standaloneMedia = window.matchMedia('(display-mode: standalone)');

    const refreshViewport = () => {
      setIsMobile(isLikelyMobileDevice());
      setIsPortrait(orientationMedia.matches);
      setIsStandalone(isPwaStandalone());
    };

    const handleInstallAvailable = () => setInstallAvailable(true);
    const handleInstalled = () => {
      setInstalledNow(true);
      setInstallAvailable(false);
    };

    orientationMedia.addEventListener?.('change', refreshViewport);
    standaloneMedia.addEventListener?.('change', refreshViewport);
    window.addEventListener('resize', refreshViewport);
    window.addEventListener(PWA_INSTALL_AVAILABLE_EVENT, handleInstallAvailable);
    window.addEventListener(PWA_INSTALLED_EVENT, handleInstalled);

    refreshViewport();

    return () => {
      orientationMedia.removeEventListener?.('change', refreshViewport);
      standaloneMedia.removeEventListener?.('change', refreshViewport);
      window.removeEventListener('resize', refreshViewport);
      window.removeEventListener(PWA_INSTALL_AVAILABLE_EVENT, handleInstallAvailable);
      window.removeEventListener(PWA_INSTALLED_EVENT, handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!isMobile || !isStandalone) return;

    void requestLandscapeMode();
  }, [isMobile, isStandalone]);

  const handleInstall = async () => {
    setInstalling(true);

    const result = await promptPwaInstall();

    if (result?.outcome === 'accepted') {
      setInstalledNow(true);
    } else if (result?.outcome === 'unavailable') {
      setInstallAvailable(false);
    }

    setInstalling(false);
  };

  const continueInBrowser = async () => {
    try {
      window.sessionStorage.setItem(BROWSER_SESSION_KEY, '1');
    } catch {
      // O jogo continua mesmo sem sessionStorage.
    }

    setBrowserSessionAllowed(true);
    await requestLandscapeMode();
  };

  const tryLandscape = async () => {
    await requestLandscapeMode();
    setIsPortrait(isPortraitOrientation());
  };

  if (!isMobile) {
    return children;
  }

  const shouldShowInstallGate = !isStandalone && !browserSessionAllowed;

  if (shouldShowInstallGate) {
    return (
      <div className={styles.installGate}>
        <div className={styles.ambient} aria-hidden="true" />

        <section className={styles.installCard}>
          <div className={styles.brandSeal}>
            <Scale size={36} />
          </div>

          <div className={styles.eyebrow}>ROTA DA JUSTIÇA • EXPERIÊNCIA MOBILE</div>
          <h1>Instale o jogo no seu celular</h1>
          <p className={styles.lead}>
            Para jogar em tela cheia e com a interface preparada para celular, instale o
            Rota da Justiça como aplicativo.
          </p>

          <div className={styles.benefits}>
            <div><CheckCircle2 size={18} /><span>Tela cheia, sem a barra do navegador</span></div>
            <div><CheckCircle2 size={18} /><span>Inicialização mais rápida e assets em cache</span></div>
            <div><CheckCircle2 size={18} /><span>Experiência otimizada para modo horizontal</span></div>
          </div>

          {installedNow ? (
            <div className={styles.installedMessage}>
              <CheckCircle2 size={22} />
              <div>
                <strong>Rota da Justiça instalado</strong>
                <span>Abra o jogo pelo novo ícone na sua tela inicial.</span>
              </div>
            </div>
          ) : isIos ? (
            <div className={styles.iosInstructions}>
              <div className={styles.instructionIcon}><Share2 size={22} /></div>
              <div>
                <strong>No iPhone/iPad</strong>
                <span>
                  Toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.
                </span>
              </div>
            </div>
          ) : installAvailable ? (
            <button
              type="button"
              className={styles.installButton}
              onClick={handleInstall}
              disabled={installing}
            >
              <Download size={19} />
              {installing ? 'PREPARANDO INSTALAÇÃO...' : 'INSTALAR ROTA DA JUSTIÇA'}
            </button>
          ) : (
            <div className={styles.browserInstructions}>
              <Smartphone size={22} />
              <div>
                <strong>Instalação pelo navegador</strong>
                <span>
                  Abra o menu do navegador e escolha <b>Instalar aplicativo</b> ou
                  <b> Adicionar à tela inicial</b>.
                </span>
              </div>
            </div>
          )}

          <button type="button" className={styles.continueButton} onClick={continueInBrowser}>
            CONTINUAR NO NAVEGADOR
            <ExternalLink size={15} />
          </button>

          <small>
            No computador e na distribuição Xbox PC, esta etapa não é exibida.
          </small>
        </section>
      </div>
    );
  }

  if (isPortrait) {
    return (
      <div className={styles.rotateGate}>
        <div className={styles.rotateVisual} aria-hidden="true">
          <Smartphone size={74} />
          <RotateCcw size={38} />
        </div>

        <div className={styles.eyebrow}>MODO DE JOGO</div>
        <h1>Gire seu celular</h1>
        <p>
          O Rota da Justiça foi projetado para jogar na horizontal. Vire o aparelho para
          continuar.
        </p>

        <button type="button" className={styles.rotateButton} onClick={tryLandscape}>
          <RotateCcw size={18} />
          TENTAR GIRAR AUTOMATICAMENTE
        </button>

        <small>
          Se a tela não girar, desative o bloqueio de rotação do seu aparelho.
        </small>
      </div>
    );
  }

  return children;
}
