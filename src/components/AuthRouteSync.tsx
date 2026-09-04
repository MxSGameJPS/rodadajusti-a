import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const PLAYER_SAVE_KEY = 'rota_da_justica_save_v1';

function navigate(path: string) {
  if (window.location.pathname === path) return;
  window.history.replaceState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function hasStartedCareer() {
  try {
    const raw = window.localStorage.getItem(PLAYER_SAVE_KEY);
    if (!raw) return false;

    const saved = JSON.parse(raw) as { name?: unknown };
    return typeof saved.name === 'string' && saved.name.trim().length > 0;
  } catch {
    return false;
  }
}

function syncRoute(session: Session | null) {
  const path = window.location.pathname;

  // A raiz pertence sempre à intro cinematográfica, independentemente da sessão.
  if (path === '/') return;

  if (session) {
    const careerStarted = hasStartedCareer();

    if (path === '/login') {
      navigate(careerStarted ? '/jogo' : '/inicio-carreira');
      return;
    }

    if (path === '/inicio-carreira') {
      if (careerStarted) navigate('/jogo');
      return;
    }

    if (path === '/jogo') return;

    navigate(careerStarted ? '/jogo' : '/inicio-carreira');
    return;
  }

  if (path === '/jogo' || path === '/inicio-carreira') {
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
