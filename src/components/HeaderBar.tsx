import React from 'react';
import { PlayerProfile, CareerTier } from '../types/game';
import { CAREER_TIERS } from '../data/careers';
import {
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  GraduationCap,
  Landmark,
  Building,
  ChevronRight,
  Laptop,
} from 'lucide-react';
import { sound } from '../utils/sound';
import { usePlayerDisplayName } from '../lib/playerTreatment';
import { SessionLogoutButton } from './SessionLogoutButton';

const OPEN_SOCIAL_JURIDICO_EVENT = 'rota:open-social-juridico';
const SOCIAL_JURIDICO_TIERS = new Set([
  'ADVOGADO_CONTRATADO',
  'ADVOGADO_SENIOR',
  'SOCIO_ESCRITORIO',
  'DONO_ESCRITORIO',
]);

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
  const canUseSocialJuridico = SOCIAL_JURIDICO_TIERS.has(player.careerTier);
  const displayName = usePlayerDisplayName(player, 'Estagiário');

  const tierKeys = Object.keys(CAREER_TIERS) as (keyof typeof CAREER_TIERS)[];
  const currentTierIndex = tierKeys.indexOf(player.careerTier);
  const nextTier = currentTierIndex < tierKeys.length - 1 ? CAREER_TIERS[tierKeys[currentTierIndex + 1]] : null;
  const xpProgressPercent = nextTier ? Math.min(100, Math.round((player.xp / nextTier.minXp) * 100)) : 100;

  const openSocialJuridico = () => {
    sound.playClick();
    window.dispatchEvent(new CustomEvent(OPEN_SOCIAL_JURIDICO_EVENT));
  };

  return (
    <header className="sticky top-0 z-30 w-full select-none border-b border-[#2A2A2E] bg-[#161618] text-[#E0E0E0] shadow-xl">
      <div className="flex items-center justify-between gap-2 border-b border-[#222226] bg-[#0D0D0E] px-2 py-1.5 font-mono text-[10px] text-[#888888] sm:px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#34D399]" />
          <span className="hidden truncate tracking-wider text-[#A0A0A0] md:inline">
            SISTEMA ELETRÔNICO DA JUSTIÇA (PJe • BRASIL)
          </span>
          <span className="truncate tracking-wider text-[#A0A0A0] md:hidden">PJe • BRASIL</span>
          <span className="hidden text-[#444] xl:inline">•</span>
          <span className="hidden font-medium text-[#C5A059] xl:inline">RAMOS & ASSOCIADOS</span>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            onClick={() => {
              sound.playClick();
              onToggleSound();
            }}
            title={player.soundEnabled ? 'Desativar sons' : 'Ativar sons'}
            aria-label={player.soundEnabled ? 'Desativar sons' : 'Ativar sons'}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-[#888] transition-colors hover:bg-[#1A1A1D] hover:text-[#E0E0E0]"
          >
            {player.soundEnabled ? <Volume2 size={13} className="text-[#C5A059]" /> : <VolumeX size={13} className="text-[#666]" />}
            <span className="hidden text-[9px] uppercase tracking-wider md:inline">
              {player.soundEnabled ? 'Áudio ON' : 'Mudo'}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setIsMobileFrame(!isMobileFrame);
            }}
            title="Alternar entre modo Android Celular e Tela Cheia"
            aria-label="Alternar modo de visualização"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-[#888] transition-colors hover:bg-[#1A1A1D] hover:text-[#E0E0E0]"
          >
            {isMobileFrame ? <Monitor size={13} className="text-[#60A5FA]" /> : <Smartphone size={13} className="text-[#C5A059]" />}
            <span className="hidden text-[9px] uppercase tracking-wider lg:inline">
              {isMobileFrame ? 'Expandir' : 'Modo Celular'}
            </span>
          </button>

          {canUseSocialJuridico && (
            <button
              type="button"
              onClick={openSocialJuridico}
              title="Abrir Notebook Social Jurídico"
              aria-label="Abrir Notebook Social Jurídico"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#C5A059]/25 bg-[#C5A059]/10 px-2 text-[#C5A059] transition-colors hover:border-[#C5A059]/50 hover:bg-[#C5A059]/15 sm:px-2.5"
            >
              <Laptop size={14} />
              <span className="hidden text-[9px] font-bold uppercase tracking-[0.08em] md:inline">Notebook SJ</span>
            </button>
          )}

          <SessionLogoutButton />
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#C5A059] shadow-md">
            <span className="text-lg font-black tracking-tighter text-[#0A0A0B]">RJ</span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059]">Rota da Justiça</span>
              <span className="rounded border border-[#C5A059]/30 bg-[#C5A059]/10 px-1.5 py-0.5 font-mono text-[9px] text-[#C5A059]">
                {currentTier.title}
              </span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onOpenCareerModal();
              }}
              className="group flex min-w-0 items-center gap-1 text-left text-sm font-semibold text-[#E0E0E0] transition-colors hover:text-[#C5A059]"
            >
              <span className="truncate">{displayName}</span>
              <span className="hidden text-xs font-normal text-[#888888] sm:inline">
                • {player.academicDegree === 'GRADUANDO' ? 'Bacharelando' : player.academicDegree}
              </span>
              <ChevronRight size={13} className="shrink-0 text-[#888888] transition-transform group-hover:translate-x-0.5 group-hover:text-[#C5A059]" />
            </button>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:gap-4 lg:gap-6">
          <div className="flex min-w-[96px] flex-1 flex-col items-start sm:min-w-0 sm:flex-none sm:items-end">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[#888888] sm:text-[10px]">Experiência</span>
              <span className="font-mono text-xs font-bold text-[#E0E0E0]">{player.xp} XP</span>
            </div>
            <div className="mt-1 h-1.5 w-full min-w-[90px] overflow-hidden rounded-full bg-[#2A2A2E] sm:w-32">
              <div
                className="h-full rounded-full bg-[#C5A059] transition-all duration-500"
                style={{ width: `${Math.max(8, xpProgressPercent)}%` }}
              />
            </div>
          </div>

          <div className="text-center px-1 sm:px-2">
            <span className="block text-[9px] font-semibold uppercase tracking-wider text-[#888888] sm:text-[10px]">Reputação</span>
            <span className="font-mono text-sm font-bold text-[#60A5FA]">{player.reputation} / 100</span>
          </div>

          <div className="text-center px-1 sm:px-2">
            <span className="block text-[9px] font-semibold uppercase tracking-wider text-[#888888] sm:text-[10px]">Patrimônio</span>
            <span className="font-mono text-sm font-bold text-[#34D399]">
              R$ {player.money.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="hidden border-l border-[#2A2A2E] pl-4 text-center md:block lg:pl-6">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888]">Data Forense</span>
            <span className="font-mono text-sm font-bold text-[#E0E0E0]">
              {String(player.gameCurrentDay).padStart(2, '0')}/{String(player.gameCurrentMonth).padStart(2, '0')}/{player.gameCurrentYear}
            </span>
          </div>

          <div className="hidden items-center gap-2 border-l border-[#2A2A2E] pl-4 xl:flex">
            <button
              onClick={() => {
                sound.playClick();
                onOpenAcademicModal();
              }}
              title="Carreira Acadêmica (Pós, Mestrado, Doutorado)"
              className="flex items-center gap-1 rounded border border-[#2A2A2E] bg-[#1A1A1D] px-2.5 py-1.5 text-xs font-medium text-[#C5A059] transition-all hover:border-[#C5A059]/40 hover:bg-[#2A2A2E]"
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
              className="flex items-center gap-1 rounded border border-[#2A2A2E] bg-[#1A1A1D] px-2.5 py-1.5 text-xs font-medium text-[#F87171] transition-all hover:border-[#F87171]/40 hover:bg-[#2A2A2E]"
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
                className="flex items-center gap-1 rounded border border-[#2A2A2E] bg-[#1A1A1D] px-2.5 py-1.5 text-xs font-medium text-[#60A5FA] transition-all hover:border-[#60A5FA]/40 hover:bg-[#2A2A2E]"
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
