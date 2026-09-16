export const PWA_INSTALL_AVAILABLE_EVENT = 'rota:pwa-install-available';
export const PWA_INSTALLED_EVENT = 'rota:pwa-installed';

let deferredInstallPrompt = null;

function dispatch(name, detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    dispatch(PWA_INSTALL_AVAILABLE_EVENT, { available: true });
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    dispatch(PWA_INSTALLED_EVENT, { installed: true });
  });
}

export function registerPwa() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !import.meta.env.PROD) {
    return;
  }

  window.addEventListener(
    'load',
    () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
        console.warn('[Rota PWA] Não foi possível registrar o service worker.', error);
      });
    },
    { once: true },
  );
}

export function isPwaStandalone() {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

export function isLikelyMobileDevice() {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const touchCompact =
    navigator.maxTouchPoints > 1 &&
    Math.min(window.screen.width, window.screen.height) <= 1024;

  return mobileUserAgent || touchCompact;
}

export function isIosDevice() {
  if (typeof window === 'undefined') return false;

  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isPortraitOrientation() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(orientation: portrait)').matches;
}

export function isInstallPromptAvailable() {
  return Boolean(deferredInstallPrompt);
}

export async function promptPwaInstall() {
  if (!deferredInstallPrompt) {
    return { outcome: 'unavailable' };
  }

  const promptEvent = deferredInstallPrompt;
  promptEvent.prompt();

  const choice = await promptEvent.userChoice;
  deferredInstallPrompt = null;

  return choice;
}

export async function requestLandscapeMode() {
  if (typeof window === 'undefined') return false;

  try {
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => undefined);
    }

    if (window.screen?.orientation?.lock) {
      await window.screen.orientation.lock('landscape');
      return true;
    }
  } catch {
    // Alguns navegadores, principalmente iOS, não permitem bloquear a orientação.
  }

  return false;
}
