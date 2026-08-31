import React from 'react';
import { PlayerProfile, CareerTier } from '../types/game';
import { CAREER_TIERS } from '../data/careers';
import { 
  Award, 
  Coins, 
  Sparkles, 
  Scale, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Monitor, 
  GraduationCap, 
  Landmark,
  Building,
  ChevronRight
} from 'lucide-react';
import { sound } from '../utils/sound';

interface HeaderBarProps {
  player: PlayerProfile;
  isMobileFrame: boolean;
  setIsMobileFrame: (val: boolean) => void;
  onOpenCareerModal: () => void;
  onOpenAcademicModal: () => void;
  onOpenConcursoModal: () => void;
  onOpenOfficeModal: () => void;
  onToggleSound: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  player,
  isMobileFrame,
  setIsMobileFrame,
  onOpenCareerModal,
  onOpenAcademicModal,
  onOpenConcursoModal,
  onOpenOfficeModal,
  onToggleSound,
}) => {
  const currentTier: CareerTier = CAREER_TIERS[player.careerTier] || CAREER_TIERS.ESTAGIARIO;
  
  // Calculate next tier requirements
  const tierKeys = Object.keys(CAREER_TIERS) as (keyof typeof CAREER_TIERS)[];
  const currentTierIndex = tierKeys.indexOf(player.careerTier);
  const nextTier = currentTierIndex < tierKeys.length - 1 ? CAREER_TIERS[tierKeys[currentTierIndex + 1]] : null;
  const xpProgressPercent = nextTier ? Math.min(100, Math.round((player.xp / nextTier.minXp) * 100)) : 100;

  return (
    <header className="w-full bg-[#161618] border-b border-[#2A2A2E] text-[#E0E0E0] sticky top-0 z-30 shadow-xl select-none">
      {/* Top Electronic Judicial System Bar */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-1.5 bg-[#0D0D0E] border-b border-[#222226] text-[10px] text-[#888888] font-mono">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#34D399] animate-pulse"></span>
          <span className="tracking-wider text-[#A0A0A0]">SISTEMA ELETRÔNICO DA JUSTIÇA (PJe • BRASIL)</span>
          <span className="hidden sm:inline text-[#444]">•</span>
          <span className="hidden sm:inline text-[#C5A059] font-medium">RAMOS & ASSOCIADOS</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              sound.playClick();
              onToggleSound();
            }}
            title={player.soundEnabled ? "Desativar Sons" : "Ativar Sons"}
            className="p-1 rounded hover:bg-[#1A1A1D] text-[#888] hover:text-[#E0E0E0] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {player.soundEnabled ? <Volume2 size={12} className="text-[#C5A059]" /> : <VolumeX size={12} className="text-[#666]" />}
            <span className="text-[10px] uppercase tracking-wider">{player.soundEnabled ? "Áudio ON" : "Mudo"}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setIsMobileFrame(!isMobileFrame);
            }}
            title="Alternar entre modo Android Celular e Tela Cheia"
            className="p-1 rounded hover:bg-[#1A1A1D] text-[#888] hover:text-[#E0E0E0] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isMobileFrame ? <Monitor size={12} className="text-[#60A5FA]" /> : <Smartphone size={12} className="text-[#C5A059]" />}
            <span className="text-[10px] uppercase tracking-wider">{isMobileFrame ? "Expandir" : "Modo Celular"}</span>
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Player Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C5A059] rounded-md flex items-center justify-center shadow-md">
            <span className="text-[#0A0A0B] font-black text-lg tracking-tighter">RJ</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold">
                Rota da Justiça
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#C5A059]/10 text-[#C5A059] font-mono border border-[#C5A059]/30">
                {currentTier.title}
              </span>
            </div>
            
            <button
              onClick={() => {
                sound.playClick();
                onOpenCareerModal();
              }}
              className="flex items-center gap-1 text-sm font-semibold text-[#E0E0E0] hover:text-[#C5A059] transition-colors text-left cursor-pointer group"
            >
              <span>{player.name || "Dr. Estagiário"}</span>
              <span className="text-xs text-[#888888] font-normal">
                • {player.academicDegree === 'GRADUANDO' ? 'Bacharelando' : player.academicDegree}
              </span>
              <ChevronRight size={13} className="text-[#888888] group-hover:text-[#C5A059] transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* Resources & Metric Dashboard */}
        <div className="flex items-center flex-wrap gap-4 sm:gap-6">
          {/* Experiência XP Bar */}
          <div className="flex flex-col items-start sm:items-end">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase text-[#888888] tracking-wider font-semibold">Experiência</span>
              <span className="text-xs font-mono font-bold text-[#E0E0E0]">{player.xp} XP</span>
            </div>
            <div className="w-24 sm:w-32 h-1.5 bg-[#2A2A2E] rounded-full mt-1 overflow-hidden">
              <div 
                className="bg-[#C5A059] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(8, xpProgressPercent)}%` }}
              ></div>
            </div>
          </div>

          {/* Reputação */}
          <div className="text-center px-2">
            <span className="block text-[10px] uppercase text-[#888888] tracking-wider font-semibold">Reputação</span>
            <span className="text-sm font-bold text-[#60A5FA] font-mono">{player.reputation} / 100</span>
          </div>

          {/* Patrimônio / Dinheiro */}
          <div className="text-center px-2">
            <span className="block text-[10px] uppercase text-[#888888] tracking-wider font-semibold">Patrimônio</span>
            <span className="text-sm font-bold text-[#34D399] font-mono">
              R$ {player.money.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Calendário Forense */}
          <div className="text-center border-l border-[#2A2A2E] pl-4 sm:pl-6">
            <span className="block text-[10px] uppercase text-[#888888] tracking-wider font-semibold">Data Forense</span>
            <span className="text-sm font-bold text-[#E0E0E0] font-mono">
              {String(player.gameCurrentDay).padStart(2, '0')}/{String(player.gameCurrentMonth).padStart(2, '0')}/{player.gameCurrentYear}
            </span>
          </div>

          {/* Quick Hub Modals Navigation */}
          <div className="hidden xl:flex items-center gap-2 border-l border-[#2A2A2E] pl-4">
            <button
              onClick={() => {
                sound.playClick();
                onOpenAcademicModal();
              }}
              title="Carreira Acadêmica (Pós, Mestrado, Doutorado)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#1A1A1D] hover:bg-[#2A2A2E] text-[#C5A059] border border-[#2A2A2E] hover:border-[#C5A059]/40 text-xs font-medium transition-all cursor-pointer"
            >
              <GraduationCap size={13} />
              <span>Titulação</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onOpenConcursoModal();
              }}
              title="Concurso da Magistratura"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#1A1A1D] hover:bg-[#2A2A2E] text-[#F87171] border border-[#2A2A2E] hover:border-[#F87171]/40 text-xs font-medium transition-all cursor-pointer"
            >
              <Landmark size={13} />
              <span>Magistratura</span>
            </button>

            {player.careerTier === 'ADVOGADO_SENIOR' || player.careerTier === 'SOCIO_ESCRITORIO' || player.careerTier === 'DONO_ESCRITORIO' ? (
              <button
                onClick={() => {
                  sound.playClick();
                  onOpenOfficeModal();
                }}
                title="Gestão do Escritório"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#1A1A1D] hover:bg-[#2A2A2E] text-[#60A5FA] border border-[#2A2A2E] hover:border-[#60A5FA]/40 text-xs font-medium transition-all cursor-pointer"
              >
                <Building size={13} />
                <span>Escritório</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
