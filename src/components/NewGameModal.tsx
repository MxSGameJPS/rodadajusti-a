import React, { useEffect, useMemo, useState } from 'react';
import { Scale, Briefcase, Award, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/sound';
import { supabase } from '../lib/supabase';
import { getSuggestedPlayerName } from '../lib/authProfile';

interface NewGameModalProps {
  isOpen: boolean;
  onStartNewGame: (name: string) => void;
}

export const NewGameModal: React.FC<NewGameModalProps> = ({ isOpen, onStartNewGame }) => {
  const [playerName, setPlayerName] = useState('Gabriel Silva');
  const [authSuggestedName, setAuthSuggestedName] = useState('');
  const [didHydrateAuthName, setDidHydrateAuthName] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<'civil' | 'trabalho' | 'empresarial'>('civil');

  useEffect(() => {
    if (!isOpen || didHydrateAuthName || !supabase) return;

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;

      const suggestedName = getSuggestedPlayerName(data.user);
      if (suggestedName) {
        setAuthSuggestedName(suggestedName);
        setPlayerName((currentName) =>
          currentName === 'Gabriel Silva' ? suggestedName : currentName,
        );
      }

      setDidHydrateAuthName(true);
    });

    return () => {
      active = false;
    };
  }, [didHydrateAuthName, isOpen]);

  const nameSuggestions = useMemo(() => {
    const defaults = ['Gabriel Silva', 'Beatriz Santos', 'Matheus Oliveira', 'Larissa Mendes', 'Rodrigo Ramos'];
    return authSuggestedName
      ? [authSuggestedName, ...defaults.filter((name) => name !== authSuggestedName)]
      : defaults;
  }, [authSuggestedName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    sound.playGavel();
    onStartNewGame(playerName.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-8">
        {/* Decorative Header Banner */}
        <div className="bg-[#111113] px-6 py-6 border-b border-[#2A2A2E] text-center relative">
          <div className="inline-flex p-3 rounded-xl bg-[#1A1A1D] border border-[#C5A059]/40 text-[#C5A059] mb-3 shadow-inner">
            <Scale size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif tracking-wider font-bold text-[#E0E0E0]">
            ROTA DA JUSTIÇA
          </h1>
          <p className="text-xs sm:text-sm text-[#888888] font-sans mt-1">
            Investigação, Estratégia Processual e Simulação de Carreira Jurídica
          </p>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-[#0A0A0B]">
          {/* Welcome Letter from Dr. Roberto Ramos */}
          <div className="p-4 bg-[#161618] rounded-xl border border-[#2A2A2E] space-y-2 text-xs sm:text-sm text-[#CCCCCC] leading-relaxed font-sans">
            <div className="flex items-center gap-2 text-[#C5A059] font-semibold font-serif text-sm">
              <Briefcase size={16} />
              <span>Carta de Boas-Vindas — Ramos & Associados Advocacia</span>
            </div>
            <p>
              Prezado(a) acadêmico(a), seja muito bem-vindo(a) ao nosso time! Aqui no escritório, valorizamos a investigação diligente, a ética e o domínio técnico das leis e dos prazos processuais.
            </p>
            <p className="text-[#888888] text-xs italic">
              "A Justiça não se faz apenas com palavras bonitas, mas com fatos comprovados, documentos autênticos e estratégia processual irrepreensível."
              <br />
              <strong className="text-[#E0E0E0]">— Dr. Roberto Ramos, Sócio Fundador</strong>
            </p>
          </div>

          {/* Player Name Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold tracking-wider uppercase text-[#888888]">
              Nome do(a) Estagiário(a) / Jogador(a):
            </label>
            <div className="relative">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={32}
                required
                placeholder="Ex: Gabriel Silva"
                className="w-full bg-[#161618] border border-[#2A2A2E] rounded-xl px-4 py-3 text-[#E0E0E0] font-semibold focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] text-sm transition-all placeholder-[#555]"
              />
            </div>
            {authSuggestedName && (
              <div className="flex items-center gap-2 rounded-lg border border-[#C5A059]/20 bg-[#C5A059]/[0.06] px-3 py-2 text-[11px] leading-relaxed text-[#B9A16A]">
                <ShieldCheck size={14} className="shrink-0 text-[#C5A059]" />
                <span>
                  Preenchemos com o nome da sua conta. Você pode manter ou escolher outro nome para o personagem.
                </span>
              </div>
            )}
            {/* Suggestions Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-[#888888]">Sugestões:</span>
              {nameSuggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setPlayerName(sug);
                  }}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    sug === authSuggestedName
                      ? 'bg-[#C5A059]/10 border-[#C5A059]/35 text-[#D8BC76] hover:bg-[#C5A059]/15'
                      : 'bg-[#161618] hover:bg-[#1A1A1D] text-[#CCCCCC] border-[#2A2A2E]'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Initial Focus Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold tracking-wider uppercase text-[#888888]">
              Área de Interesse Principal Inicial:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedFocus('civil');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedFocus === 'civil'
                    ? 'bg-[#1A1A1D] border-[#C5A059] text-[#E0E0E0] ring-1 ring-[#C5A059]/40 shadow-sm'
                    : 'bg-[#161618] border-[#2A2A2E] text-[#888888] hover:border-[#3A3A42]'
                }`}
              >
                <div className="font-bold flex items-center justify-between mb-1">
                  <span>Direito Civil</span>
                  {selectedFocus === 'civil' && <CheckCircle2 size={14} className="text-[#C5A059]" />}
                </div>
                <p className="text-[11px] text-[#888888]">Contratos, posse, propriedade e reparação de danos.</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedFocus('trabalho');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedFocus === 'trabalho'
                    ? 'bg-[#1A1A1D] border-[#C5A059] text-[#E0E0E0] ring-1 ring-[#C5A059]/40 shadow-sm'
                    : 'bg-[#161618] border-[#2A2A2E] text-[#888888] hover:border-[#3A3A42]'
                }`}
              >
                <div className="font-bold flex items-center justify-between mb-1">
                  <span>Consumidor</span>
                  {selectedFocus === 'trabalho' && <CheckCircle2 size={14} className="text-[#C5A059]" />}
                </div>
                <p className="text-[11px] text-[#888888]">Relações de consumo, cobranças indevidas e bancário.</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedFocus('empresarial');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedFocus === 'empresarial'
                    ? 'bg-[#1A1A1D] border-[#C5A059] text-[#E0E0E0] ring-1 ring-[#C5A059]/40 shadow-sm'
                    : 'bg-[#161618] border-[#2A2A2E] text-[#888888] hover:border-[#3A3A42]'
                }`}
              >
                <div className="font-bold flex items-center justify-between mb-1">
                  <span>Empresarial</span>
                  {selectedFocus === 'empresarial' && <CheckCircle2 size={14} className="text-[#C5A059]" />}
                </div>
                <p className="text-[11px] text-[#888888]">Startups, sociedades, marcas e contratos comerciais.</p>
              </button>
            </div>
          </div>

          {/* Initial Resources Display */}
          <div className="p-3 bg-[#161618] rounded-xl border border-[#2A2A2E] flex items-center justify-around text-center text-xs">
            <div>
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block">Nível Inicial</span>
              <span className="font-bold text-[#C5A059]">Estagiário</span>
            </div>
            <div className="border-l border-[#2A2A2E] pl-3">
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block">Bolsa-Estágio</span>
              <span className="font-bold text-[#34D399] font-mono">R$ 1.200,00</span>
            </div>
            <div className="border-l border-[#2A2A2E] pl-3">
              <span className="text-[10px] text-[#888888] uppercase tracking-wider block">Reputação</span>
              <span className="font-bold text-[#60A5FA]">10% Inicial</span>
            </div>
          </div>

          {/* Start Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-xl bg-[#C5A059] hover:bg-[#D4B475] text-[#0A0A0B] font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#C5A059]/20 transition-all cursor-pointer transform active:scale-98"
          >
            <span>Iniciar Carreira Jurídica</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
