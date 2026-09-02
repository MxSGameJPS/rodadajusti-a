import React, { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sound } from '../utils/sound';

function goToLogin() {
  window.history.replaceState({}, '', '/login');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function SessionLogoutButton() {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;

    sound.playClick();
    const confirmed = window.confirm('Deseja sair da sua conta e voltar para a tela de login?');
    if (!confirmed) return;

    if (!supabase) {
      window.alert('O Supabase não está configurado neste ambiente.');
      return;
    }

    setSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      goToLogin();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível encerrar a sessão.';
      window.alert(message);
      setSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      title="Sair da conta"
      aria-label="Sair da conta"
      className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#F87171]/25 bg-[#1A1113] px-2 text-[#FCA5A5] transition-colors hover:border-[#F87171]/55 hover:bg-[#261417] hover:text-white disabled:cursor-wait disabled:opacity-60 sm:px-2.5"
    >
      {signingOut ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
      <span className="hidden text-[9px] font-bold uppercase tracking-[0.08em] lg:inline">
        {signingOut ? 'Saindo...' : 'Sair'}
      </span>
    </button>
  );
}
