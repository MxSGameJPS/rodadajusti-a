export function registerRotaPwa() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[Rota da Justiça] Falha ao registrar service worker:', error);
    });
  });
}
