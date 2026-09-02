import React, { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sound } from '../utils/sound';

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
      className="fixed bottom-4 right-4 z-[110] flex items-center gap-2 rounded-xl border border-[#F87171]/30 bg-[#111113]/95 px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#FCA5A5] shadow-2xl backdrop-blur-md transition-all hover:border-[#F87171]/60 hover:bg-[#221517] hover:text-white disabled:cursor-wait disabled:opacity-70 sm:bottom-5 sm:right-5"
    >
      {signingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
      <span>{signingOut ? 'Saindo...' : 'Sair da conta'}</span>
    </button>
  );
}
