export type PwaInstallChoice = {
  outcome: 'accepted' | 'dismissed';
  platform?: string;
};

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<PwaInstallChoice>;
}

const PROMPT_AVAILABLE_EVENT = 'rota:pwa-install-prompt-available';

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

function emitPromptAvailable() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PROMPT_AVAILABLE_EVENT));
}

function captureInstallPrompt(event: Event) {
  const promptEvent = event as BeforeInstallPromptEvent;
  promptEvent.preventDefault();
  deferredInstallPrompt = promptEvent;
  emitPromptAvailable();
}

function clearCapturedPrompt() {
  deferredInstallPrompt = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', captureInstallPrompt);
  window.addEventListener('appinstalled', clearCapturedPrompt);
}

export function getDeferredInstallPrompt() {
  return deferredInstallPrompt;
}

export function clearDeferredInstallPrompt() {
  clearCapturedPrompt();
}

export function subscribeToInstallPrompt(listener: (prompt: BeforeInstallPromptEvent | null) => void) {
  if (typeof window === 'undefined') return () => undefined;

  const handleAvailable = () => listener(deferredInstallPrompt);
  window.addEventListener(PROMPT_AVAILABLE_EVENT, handleAvailable);

  listener(deferredInstallPrompt);

  return () => {
    window.removeEventListener(PROMPT_AVAILABLE_EVENT, handleAvailable);
  };
}
