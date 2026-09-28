import React, { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { emitPlayerSaveExternalUpdated } from '../lib/playerSaveEvents';

const WORKING_SAVE_KEY = 'rota_da_justica_save_v1';
const ACCOUNT_SAVE_PREFIX = 'rota_da_justica_save_v2:';
const ACTIVE_ACCOUNT_KEY = 'rota_da_justica_active_account_v1';

function accountSaveKey(userId: string) {
  return `${ACCOUNT_SAVE_PREFIX}${userId}`;
}

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // O jogo continua utilizável mesmo se o navegador bloquear persistência local.
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // noop
  }
}

async function activateSessionStorage(session: Session | null) {
  const nextUserId = session?.user?.id || null;
  const previousUserId = read(ACTIVE_ACCOUNT_KEY);
  const workingSave = read(WORKING_SAVE_KEY);

  if (previousUserId && previousUserId !== nextUserId && workingSave) {
    write(accountSaveKey(previousUserId), workingSave);
  }

  if (!nextUserId) {
    if (previousUserId) {
      remove(WORKING_SAVE_KEY);
      remove(ACTIVE_ACCOUNT_KEY);
    }
    return;
  }

  let cloudSave: string | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from('game_saves')
      .select('game_state,last_saved_at')
      .eq('user_id', nextUserId)
      .eq('slot', 1)
      .order('last_saved_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data?.game_state && typeof data.game_state === 'object') {
      cloudSave = JSON.stringify(data.game_state);
    }
  }

  const scopedSave = read(accountSaveKey(nextUserId));
  const fallback = previousUserId === nextUserId ? workingSave || scopedSave : scopedSave || (!previousUserId ? workingSave : null);
  const selected = cloudSave || fallback;

  if (selected) {
    write(WORKING_SAVE_KEY, selected);
    write(accountSaveKey(nextUserId), selected);
  } else {
    remove(WORKING_SAVE_KEY);
  }

  write(ACTIVE_ACCOUNT_KEY, nextUserId);
  emitPlayerSaveExternalUpdated();
}
type AccountSaveBoundaryProps = {
  children: ReactNode;
};

export function AccountSaveBoundary({ children }: AccountSaveBoundaryProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      void activateSessionStorage(data.session).finally(() => { if (active) setReady(true); });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      void activateSessionStorage(session).finally(() => { if (active) setReady(true); });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
