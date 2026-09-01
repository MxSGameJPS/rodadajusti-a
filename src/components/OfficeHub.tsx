import React from 'react';
import { PlayerProfile, LegalCase } from '../types/game';
import { GAME_CASES } from '../data/cases';
import { CAREER_TIERS } from '../data/careers';
import { getAvailableCasesForCareer } from '../lib/caseRules';
import {
  Briefcase,
  Scale,
  Award,
  GraduationCap,
  Landmark,
  Building,
  ArrowRight,
  Clock,
  History,
  BookOpenCheck,
  ShieldCheck,
} from 'lucide-react';
import { sound } from '../utils/sound';

interface OfficeHubProps {
  player: PlayerProfile;
  onSelectCaseToView: (c: LegalCase) => void;
  onResumeActiveCase: () => void;
  onOpenCareerModal: () => void;
  onOpenAcademicModal: () => void;
  onOpenConcursoModal: () => void;
  onOpenOfficeModal: () => void;
  onOpenOabExam: () => void;
}

export const OfficeHub: React.FC<OfficeHubProps> = ({
  player,
  onSelectCaseToView,
  onResumeActiveCase,
  onOpenCareerModal,
  onOpenAcademicModal,
  onOpenConcursoModal,
  onOpenOfficeModal,
  onOpenOabExam,
}) => {
  const currentTier = CAREER_TIERS[player.careerTier] || CAREER_TIERS.ESTAGIARIO;
  const needsOabExam =
    player.careerTier === 'ESTAGIARIO_SENIOR' &&
    player.casesSolved >= 4 &&
    !player.oabRegistration;

  const unlockedCases = getAvailableCasesForCareer(GAME_CASES, player.careerTier);
  const availableCases = unlockedCases.filter((caseItem) => {
    const isCompleted = player.history.some(
      (historyItem) => historyItem.caseId === caseItem.id && historyItem.success
    );
    const isActive = player.activeCase?.caseId === caseItem.id;
    return !isCompleted || isActive;
  });

  return (
    <div className="w-full space-y-6">
      <div className="p-6 bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#1A1A1D] border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059] shrink-0 shadow-inner">
            <Scale size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/25 uppercase tracking-wider">
                Gabinete Jurídico • Ramos & Associados
              </span>
              <span className="text-xs text-[#888888] font-mono">
                {String(player.gameCurrentDay).padStart(2, '0')}/{String(player.gameCurrentMonth).padStart(2, '0')}/{player.gameCurrentYear}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-[#E0E0E0] mt-1.5 tracking-tight">
              Olá, {player.name || 'Doutor'}!
            </h2>
            <p className="text-xs sm:text-sm text-[#AAAAAA] mt-1 max-w-xl leading-relaxed">
              Você está atuando como <strong className="text-[#C5A059] font-semibold">{currentTier.title}</strong>.
              {player.careerTier === 'ESTAGIARIO' && ' Conclua 2 casos com êxito para alcançar a promoção a Estagiário Sênior.'}
              {player.careerTier === 'ESTAGIARIO_SENIOR' && player.casesSolved < 4 &&
                ' Conclua 4 casos com êxito para liberar o Exame da Ordem.'}
              {needsOabExam &&
                ' Seus requisitos práticos foram atingidos. Agora a aprovação no Exame da Ordem é obrigatória para se tornar Advogado Contratado.'}
              {player.careerTier !== 'ESTAGIARIO' && player.careerTier !== 'ESTAGIARIO_SENIOR' &&
                ' Continue acumulando experiência jurídica para avançar na carreira.'}
            </p>
          </div>
        </div>

        {player.activeCase ? (
          <button
            onClick={() => {
              sound.playPaper();
              onResumeActiveCase();
            }}
            className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-[#C5A059] hover:bg-[#D4B475] text-[#0A0A0B] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#C5A059]/20 transition-all cursor-pointer transform active:scale-98 shrink-0 tracking-wide uppercase"
          >
            <Clock size={16} />
            <span>Continuar Caso em Andamento</span>
            <ArrowRight size={16} />
          </button>
        ) : null}
      </div>

      {needsOabExam && (
        <section className="rounded-2xl border border-[#C5A059]/45 bg-gradient-to-br from-[#C5A059]/[0.10] to-[#111113] p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl border border-[#C5A059]/35 bg-[#0D0D0F] text-[#C5A059] flex items-center justify-center shrink-0">
                <BookOpenCheck size={27} />
              </div>
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="px-2 py-1 rounded-md bg-[#C5A059]/10 border border-[#C5A059]/25 text-[#C5A059] text-[9px] font-black uppercase tracking-wider font-mono">
                    Requisito de carreira
                  </span>
                  <span className="px-2 py-1 rounded-md bg-[#60A5FA]/10 border border-[#60A5FA]/25 text-[#93C5FD] text-[9px] font-black uppercase tracking-wider font-mono">
                    Simulado real • 46º EOU • 2026
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-serif font-black text-[#F1EFE9]">
                  Exame da Ordem desbloqueado
                </h3>
                <p className="text-xs sm:text-sm text-[#C9C2B1] mt-2 max-w-2xl leading-relaxed">
                  Você atingiu os requisitos práticos de Estagiário Sênior. Para avançar, realizará um
                  <strong className="text-[#F2DCA9]"> simulado baseado no 46º Exame de Ordem Unificado real, aplicado em 2026</strong>,
                  com 80 questões e correção automática.
                </p>
                <p className="text-[11px] text-[#8F8B81] mt-2 max-w-2xl">
                  A aprovação e a inscrição emitida existem somente dentro do personagem do Rota da Justiça e não equivalem a credencial profissional real.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                sound.playPaper();
                onOpenOabExam();
              }}
              className="w-full lg:w-auto px-6 py-3.5 rounded-xl bg-[#C5A059] hover:bg-[#D6B66F] text-[#09090A] font-black uppercase tracking-wide text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-lg shadow-[#C5A059]/15"
            >
              <Scale size={17} />
              Realizar Exame da Ordem
            </button>
          </div>
        </section>
      )}

      {player.oabRegistration && (
        <section className="rounded-xl border border-[#34D399]/25 bg-[#34D399]/[0.05] p-4 flex items-start gap-3">
          <ShieldCheck size={20} className="text-[#34D399] shrink-0 mt-0.5" />
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#34D399] font-black font-mono">
              Inscrição profissional do personagem • fictícia
            </div>
            <div className="font-mono font-black text-[#D5FFF0] mt-1">{player.oabRegistration.code}</div>
            <p className="text-[10px] text-[#83B5A3] mt-1">
              Emitida após aprovação no simulado do {player.oabRegistration.examTitle}. Não corresponde a inscrição real perante a OAB.
            </p>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => {
            sound.playClick();
            onOpenCareerModal();
          }}
          className="p-4 bg-[#161618] hover:bg-[#1A1A1D] border border-[#2A2A2E] hover:border-[#C5A059]/50 rounded-xl text-left transition-all cursor-pointer shadow-md group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#1A1A1D] border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059] mb-2 group-hover:scale-105 transition-transform">
            <Award size={18} />
          </div>
          <span className="text-[10px] text-[#888888] uppercase tracking-wider font-mono block">Progressão</span>
          <h4 className="font-bold text-xs sm:text-sm text-[#E0E0E0] group-hover:text-[#C5A059] transition-colors">
            Plano de Carreira
          </h4>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onOpenAcademicModal();
          }}
          className="p-4 bg-[#161618] hover:bg-[#1A1A1D] border border-[#2A2A2E] hover:border-[#60A5FA]/50 rounded-xl text-left transition-all cursor-pointer shadow-md group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#1A1A1D] border border-[#60A5FA]/30 flex items-center justify-center text-[#60A5FA] mb-2 group-hover:scale-105 transition-transform">
            <GraduationCap size={18} />
          </div>
          <span className="text-[10px] text-[#888888] uppercase tracking-wider font-mono block">Titulação</span>
          <h4 className="font-bold text-xs sm:text-sm text-[#E0E0E0] group-hover:text-[#60A5FA] transition-colors">
            Carreira Acadêmica
          </h4>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onOpenConcursoModal();
          }}
          className="p-4 bg-[#161618] hover:bg-[#1A1A1D] border border-[#2A2A2E] hover:border-[#F87171]/50 rounded-xl text-left transition-all cursor-pointer shadow-md group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#1A1A1D] border border-[#F87171]/30 flex items-center justify-center text-[#F87171] mb-2 group-hover:scale-105 transition-transform">
            <Landmark size={18} />
          </div>
          <span className="text-[10px] text-[#888888] uppercase tracking-wider font-mono block">Setor Público</span>
          <h4 className="font-bold text-xs sm:text-sm text-[#E0E0E0] group-hover:text-[#F87171] transition-colors">
            Magistratura
          </h4>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onOpenOfficeModal();
          }}
          className="p-4 bg-[#161618] hover:bg-[#1A1A1D] border border-[#2A2A2E] hover:border-[#34D399]/50 rounded-xl text-left transition-all cursor-pointer shadow-md group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#1A1A1D] border border-[#34D399]/30 flex items-center justify-center text-[#34D399] mb-2 group-hover:scale-105 transition-transform">
            <Building size={18} />
          </div>
          <span className="text-[10px] text-[#888888] uppercase tracking-wider font-mono block">Empreender</span>
          <h4 className="font-bold text-xs sm:text-sm text-[#E0E0E0] group-hover:text-[#34D399] transition-colors">
            Meu Escritório
          </h4>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-[#C5A059]" />
            <h3 className="text-base sm:text-lg font-bold font-serif text-[#E0E0E0]">
              Casos Jurídicos Disponíveis para Atendimento
            </h3>
          </div>
          <span className="text-xs text-[#888888] font-mono text-right">
            {availableCases.length} disponíveis • {GAME_CASES.length} no acervo
          </span>
        </div>

        {availableCases.length === 0 ? (
          <div className="p-5 rounded-xl border border-[#2A2A2E] bg-[#111113] text-sm text-[#AAAAAA]">
            {needsOabExam
              ? 'Você concluiu os atendimentos disponíveis como Estagiário Sênior. A próxima etapa profissional exige aprovação no Exame da Ordem.'
              : 'Não há novos casos liberados para o seu nível neste momento. Consulte o histórico ou avance na carreira para desbloquear novos atendimentos.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableCases.map((c) => {
              const isActive = player.activeCase?.caseId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    sound.playPaper();
                    onSelectCaseToView(c);
                  }}
                  className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'bg-[#1A1A1D] border-[#C5A059] ring-1 ring-[#C5A059]/50 shadow-xl'
                      : 'bg-[#161618] hover:bg-[#1A1A1D] border-[#2A2A2E] hover:border-[#C5A059]/50 shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0A0A0B] text-[#C5A059] border border-[#2A2A2E]">
                        {c.code}
                      </span>
                      {isActive ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C5A059] text-[#0A0A0B] font-bold uppercase tracking-wider">
                          Em Diligência
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#1A1A1D] text-[#888888] border border-[#2A2A2E]">
                          {c.difficulty}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm sm:text-base text-[#E0E0E0] mt-2.5 line-clamp-2 leading-snug">
                      {c.title}
                    </h4>
                    <span className="text-[11px] text-[#C5A059] font-mono block mt-1">
                      {c.area}
                    </span>

                    <p className="text-xs text-[#AAAAAA] mt-2 line-clamp-3 leading-relaxed">
                      {c.client.summary}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#2A2A2E] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-mono text-[#34D399] font-bold">
                      <span>R$ {c.honorariosReward.toLocaleString('pt-BR')}</span>
                      <span className="text-[#444]">•</span>
                      <span className="text-[#60A5FA] font-semibold">+{c.xpReward} XP</span>
                    </div>

                    <span className="text-[#C5A059] font-semibold flex items-center gap-1 text-[11px] tracking-wide">
                      Ver Dossiê →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {player.history.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[#888888]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#888888]">
              Histórico de Sentenças Julgadas:
            </h3>
          </div>

          <div className="space-y-2">
            {player.history.map((record, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-[#111113] rounded-xl border border-[#2A2A2E] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                        record.success
                          ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30'
                          : 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30'
                      }`}
                    >
                      {record.verdict}
                    </span>
                    <h5 className="font-bold text-[#E0E0E0]">{record.caseTitle}</h5>
                  </div>
                  <p className="text-[11px] text-[#888888] italic mt-0.5">"{record.judgeFeedback}"</p>
                </div>

                <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                  <span className="text-[#34D399] font-bold">+R$ {record.earnedMoney.toLocaleString('pt-BR')}</span>
                  <span className="text-[#60A5FA] font-bold">+{record.earnedXp} XP</span>
                  <span className="text-[#888888]">{record.completedDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
