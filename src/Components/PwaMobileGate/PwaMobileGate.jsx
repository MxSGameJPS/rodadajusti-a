import React, { useEffect, useMemo, useState } from 'react';
import { Download, MoreVertical, RotateCw, Share2, Smartphone } from 'lucide-react';
import styles from './PwaMobileGate.module.css';

const DISMISS_KEY = 'rota_pwa_install_dismissed_v1';

function detectMobile() {
  if (typeof window === 'undefined') return false;

  const mobileByUa = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
  const compactScreen = Math.min(window.innerWidth, window.innerHeight) < 820;

  return mobileByUa || Boolean(coarsePointer && compactScreen);
}

function detectStandalone() {
  if (typeof window === 'undefined') return false;

  const iosStandalone = Boolean(window.navigator.standalone);
  return window.matchMedia?.('(display-mode: standalone)').matches || iosStandalone;
}

function detectPortrait() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(orientation: portrait)').matches;
}

function isIos() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

async function tryLockLandscape() {
  try {
    if (screen.orientation?.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch {
    // Alguns navegadores, especialmente iOS, não permitem bloqueio programático.
  }
}

export function PwaMobileGate({ children }) {
  const [isMobile, setIsMobile] = useState(detectMobile);
  const [isStandalone, setIsStandalone] = useState(detectStandalone);
  const [isPortrait, setIsPortrait] = useState(detectPortrait);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(() => {
    try {
      return window.sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const ios = useMemo(() => (typeof navigator === 'undefined' ? false : isIos()), []);

  useEffect(() => {
    const syncDeviceState = () => {
      setIsMobile(detectMobile());
      setIsStandalone(detectStandalone());
      setIsPortrait(detectPortrait());
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleInstalled = () => {
      setIsStandalone(true);
      setInstallPrompt(null);
      setInstallDismissed(true);
      void tryLockLandscape();
    };

    window.addEventListener('resize', syncDeviceState);
    window.addEventListener('orientationchange', syncDeviceState);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    const orientationMedia = window.matchMedia?.('(orientation: portrait)');
    orientationMedia?.addEventListener?.('change', syncDeviceState);

    syncDeviceState();

    return () => {
      window.removeEventListener('resize', syncDeviceState);
      window.removeEventListener('orientationchange', syncDeviceState);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      orientationMedia?.removeEventListener?.('change', syncDeviceState);
    };
  }, []);

  useEffect(() => {
    if (isStandalone && !isPortrait) void tryLockLandscape();
  }, [isStandalone, isPortrait]);

  if (!isMobile) return children;

  const dismissInstall = async () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // sessão continua normalmente mesmo sem storage.
    }
    setInstallDismissed(true);
    await tryLockLandscape();
  };

  const requestInstall = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (result?.outcome === 'accepted') {
      setInstallDismissed(true);
      await tryLockLandscape();
    }
  };

  const showInstallGate = !isStandalone && !installDismissed;
  const showRotateGate = !showInstallGate && isPortrait;

  return (
    <>
      {children}

      {showInstallGate && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Instalar Rota da Justiça">
          <div className={styles.installCard}>
            <div className={styles.iconBadge}><Smartphone size={32} /></div>
            <span className={styles.eyebrow}>EXPERIÊNCIA MOBILE</span>
            <h1>Instale o Rota da Justiça</h1>
            <p>
              No celular, o jogo foi pensado para funcionar como aplicativo em tela cheia e na horizontal.
              Instale o PWA para ter a experiência correta.
            </p>

            {ios ? (
              <div className={styles.instructions}>
                <span><Share2 size={18} /> Toque em <strong>Compartilhar</strong>.</span>
                <span><Download size={18} /> Escolha <strong>Adicionar à Tela de Início</strong>.</span>
              </div>
            ) : installPrompt ? (
              <button type="button" className={styles.primaryButton} onClick={requestInstall}>
                <Download size={18} /> INSTALAR ROTA DA JUSTIÇA
              </button>
            ) : (
              <div className={styles.instructions}>
                <span><MoreVertical size={18} /> Abra o menu do navegador.</span>
                <span><Download size={18} /> Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</span>
              </div>
            )}

            <button type="button" className={styles.secondaryButton} onClick={dismissInstall}>
              Continuar no navegador
            </button>
            <small>Mesmo no navegador, o jogo exigirá o celular na horizontal.</small>
          </div>
        </div>
      )}

      {showRotateGate && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Gire seu celular">
          <div className={styles.rotateCard}>
            <div className={styles.rotatePhone}>
              <Smartphone size={52} />
              <RotateCw className={styles.rotateArrow} size={28} />
            </div>
            <span className={styles.eyebrow}>MODO PAISAGEM</span>
            <h1>Gire seu celular para jogar</h1>
            <p>
              O Rota da Justiça usa uma interface de jogo widescreen. Mantenha o aparelho na horizontal para continuar.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
