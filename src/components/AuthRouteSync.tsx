import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

function navigate(path: string) {
  if (window.location.pathname === path) return;
  window.history.replaceState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function syncRoute(session: Session | null) {
  const path = window.location.pathname;

  // A raiz pertence sempre à intro cinematográfica, independentemente da sessão.
  if (path === '/') return;

  if (session) {
    if (path === '/login') {
      navigate('/jogo');
      return;
    }

    if (path !== '/jogo') {
      navigate('/jogo');
    }
    return;
  }

  if (path === '/jogo') {
    navigate('/login');
    return;
  }

  if (path !== '/login') {
    navigate('/login');
  }
}

export function AuthRouteSync() {
  useEffect(() => {
    if (!supabase) return;

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      syncRoute(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      syncRoute(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
