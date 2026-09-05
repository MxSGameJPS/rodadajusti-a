import React, { useEffect, useState } from 'react';
import { BadgeCheck, UserRound } from 'lucide-react';
import type { PlayerProfile } from '../types/game';
import { readCurrentPlayerSnapshot } from '../lib/professionalRpg';
import {
  readPlayerGender,
  savePlayerGender,
  stripProfessionalHonorific,
  type PlayerGender,
} from '../lib/playerTreatment';
import { sound } from '../utils/sound';

export const ProfessionalTreatmentGate: React.FC = () => {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [gender, setGender] = useState<PlayerGender | null>(null);

  useEffect(() => {
    let active = true;

    const sync = () => {
      const currentPlayer = readCurrentPlayerSnapshot();
      if (!active) return;
      setPlayer(currentPlayer);
      setGender(readPlayerGender(currentPlayer));
    };

    sync();
    const timer = window.setInterval(sync, 700);
    window.addEventListener('rota:player-treatment-updated', sync);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('rota:player-treatment-updated', sync);
    };
  }, []);

  if (!player?.oabRegistration || gender) return null;

  const baseName = stripProfessionalHonorific(player.name || '') || 'Jogador';

  const chooseGender = (nextGender: PlayerGender) => {
    sound.playClick();
    savePlayerGender(player, nextGender);
    setGender(nextGender);
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center overflow-y-auto bg-[#050506]/95 p-4 backdrop-blur-lg">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#C5A059]/40 bg-[#111113] text-[#EAE7E0] shadow-2xl shadow-black/70">
        <header className="border-b border-[#2A2A2E] bg-[#161618] px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#34D399]/35 bg-[#34D399]/10 text-[#6EE7B7]">
              <BadgeCheck size={25} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#34D399]">Registro profissional ativo</span>
              <h2 className="mt-1 font-serif text-xl font-black text-[#F1EFE9] sm:text-2xl">Seu tratamento profissional mudou</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#A7A7AC]">
                Após a aprovação no Exame da Ordem, o jogo passa a tratar seu personagem com o título profissional correspondente ao gênero.
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-4 p-5 sm:p-7">
          <div className="rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/[0.06] p-4">
            <div className="flex items-center gap-2 text-[#D6BB7D]">
              <UserRound size={17} />
              <span className="text-[10px] font-black uppercase tracking-[0.14em]">Gênero do personagem</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#9C988F]">
              Esta escolha define somente a forma como o personagem será chamado profissionalmente dentro do jogo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => chooseGender('MASCULINO')}
              className="rounded-xl border border-[#3A3A40] bg-[#18181B] p-5 text-left transition-all hover:border-[#60A5FA]/55 hover:bg-[#60A5FA]/[0.07]"
            >
              <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#8D94A6]">Masculino</span>
              <strong className="mt-1 block font-serif text-lg text-[#F0F0F2]">Dr. {baseName}</strong>
              <span className="mt-2 block text-[10px] text-[#777B85]">Tratamento usado após a OAB: Dr.</span>
            </button>

            <button
              type="button"
              onClick={() => chooseGender('FEMININO')}
              className="rounded-xl border border-[#3A3A40] bg-[#18181B] p-5 text-left transition-all hover:border-[#C084FC]/55 hover:bg-[#C084FC]/[0.07]"
            >
              <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#8D94A6]">Feminino</span>
              <strong className="mt-1 block font-serif text-lg text-[#F0F0F2]">Dra. {baseName}</strong>
              <span className="mt-2 block text-[10px] text-[#777B85]">Tratamento usado após a OAB: Dra.</span>
            </button>
          </div>

          <p className="text-center text-[9px] leading-relaxed text-[#666A73]">
            O título será aplicado em cabeçalhos, perfil, carreira, resultados, notebook profissional e demais referências ao jogador.
          </p>
        </div>
      </div>
    </div>
  );
};
