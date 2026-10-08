import React, { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { emitPlayerSaveExternalUpdated } from '../lib/playerSaveEvents';

const WORKING_SAVE_KEY = 'rota_da_justica_save_v1';
// O navegador conserva apenas um espelho transitório para compatibilidade com
// os módulos legados. A fonte de verdade após autenticação é game_saves.
const ACTIVE_ACCOUNT_KEY = 'rota_da_justica_active_account_v1';

async function activateSessionStorage(session: Session | null) {
  const userId = session?.user?.id;
  if (!userId) {
    window.localStorage.removeItem(WORKING_SAVE_KEY);
    window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    emitPlayerSaveExternalUpdated();
    return;
  }

  // Nunca carregar progresso de outra conta ou de um cache de navegador.
  window.localStorage.removeItem(WORKING_SAVE_KEY);
  const { data, error } = await supabase!
    .from('game_saves')
    .select('game_state,last_saved_at')
    .eq('user_id', userId)
    .eq('slot', 1)
    .order('last_saved_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data?.game_state && typeof data.game_state === 'object') {
    window.localStorage.setItem(WORKING_SAVE_KEY, JSON.stringify(data.game_state));
  }
  window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, userId);
  emitPlayerSaveExternalUpdated();
}
type AccountSaveBoundaryProps = {
  children: ReactNode;
};

export function AccountSaveBoundary({ children }: AccountSaveBoundaryProps) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let active = true;
    let generation = 0;
    let lastUserId: string | null | undefined = undefined;
    const synchronize = async (session: Session | null) => {
      const nextUserId = session?.user?.id || null;
      if (nextUserId === lastUserId) return;
      lastUserId = nextUserId;
      const current = ++generation;
      setReady(false);
      setLoadError('');
      try {
        await activateSessionStorage(session);
        if (active && current === generation) setReady(true);
      } catch (error) {
        if (active && current === generation) setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar sua carreira.');
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      void synchronize(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || !['SIGNED_IN', 'SIGNED_OUT', 'INITIAL_SESSION', 'USER_UPDATED'].includes(event)) return;
      void synchronize(session);
    });

    return () => {
      active = false;
      generation++;
      subscription.unsubscribe();
    };
  }, []);

  if (loadError) return <main role="alert" style={{padding: 32, background: '#07090D', color: '#F4F2EC', minHeight: '100vh'}}><h1>Não foi possível carregar sua carreira</h1><p>O progresso foi preservado no servidor. Verifique sua conexão antes de tentar novamente.</p><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></main>;
  if (!ready) return null;
  return <>{children}</>;
}
