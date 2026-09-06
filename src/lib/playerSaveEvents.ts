export const PLAYER_SAVE_EXTERNAL_UPDATED_EVENT = 'rota:player-save-external-updated';

export function emitPlayerSaveExternalUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PLAYER_SAVE_EXTERNAL_UPDATED_EVENT));
}
