import React, { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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

function activateSessionStorage(session: Session | null) {
  const nextUserId = session?.user?.id || null;
  const previousUserId = read(ACTIVE_ACCOUNT_KEY);
  const workingSave = read(WORKING_SAVE_KEY);

  // Se o navegador estava associado a outra conta, guarda primeiro o progresso dela.
  if (previousUserId && previousUserId !== nextUserId && workingSave) {
    write(accountSaveKey(previousUserId), workingSave);
  }

  if (!nextUserId) {
    remove(WORKING_SAVE_KEY);
    remove(ACTIVE_ACCOUNT_KEY);
    return;
  }

  const scopedSave = read(accountSaveKey(nextUserId));

  if (previousUserId === nextUserId) {
    // Mesmo usuário: o save de trabalho é a cópia mais recente durante a sessão.
    if (workingSave) {
      write(accountSaveKey(nextUserId), workingSave);
    } else if (scopedSave) {
      write(WORKING_SAVE_KEY, scopedSave);
    }
    write(ACTIVE_ACCOUNT_KEY, nextUserId);
    return;
  }

  if (scopedSave) {
    // Conta que já jogou neste navegador: restaura somente o progresso dela.
    write(WORKING_SAVE_KEY, scopedSave);
  } else if (!previousUserId && workingSave) {
    // Migração única do save legado existente antes da separação por conta.
    write(accountSaveKey(nextUserId), workingSave);
  } else {
    // Conta nova neste navegador começa com uma carreira limpa.
    remove(WORKING_SAVE_KEY);
  }

  write(ACTIVE_ACCOUNT_KEY, nextUserId);
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
      activateSessionStorage(data.session);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      activateSessionStorage(session);
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
