import React, { useState } from 'react';
import { Briefcase, ExternalLink, FileText, Scale, ShieldCheck, Sparkles, User, X } from 'lucide-react';
import { sound } from '../utils/sound';

const HOME_URL = 'https://socialjuridico.com.br/?utm_source=rota-da-justica&utm_medium=game&utm_campaign=terminal_social_juridico';
const LAWYER_URL = 'https://socialjuridico.com.br/sou-advogado?utm_source=rota-da-justica&utm_medium=game&utm_campaign=terminal_social_juridico';

export const SocialJuridicoExperience: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openExternal = (url: string) => {
    sound.playClick();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <button
        type="button"
        aria-label="Abrir Terminal Social Jurídico"
        onClick={() => {
          sound.playClick();
          setIsOpen(true);
        }}
        className="fixed bottom-4 right-4 z-[70] max-w-[calc(100vw-2rem)] rounded-2xl border border-[#C5A059]/50 bg-[#111113]/95 px-4 py-3 text-left shadow-2xl backdrop-blur-md transition-all hover:border-[#C5A059] hover:bg-[#161618]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C5A059] text-[#0A0A0B]">
            <Scale size={20} />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#888888]">Uma experiência</span>
            <strong className="block truncate text-sm text-[#E0E0E0]">Social Jurídico</strong>
            <span className="block truncate text-[10px] text-[#C5A059]">Abrir terminal jurídico</span>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#0A0A0B]/90 p-4 backdrop-blur-md">
          <div className="my-6 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#C5A059]/30 bg-[#111113] text-[#E0E0E0] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2A2A2E] bg-[#161618] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C5A059]/40 bg-[#0A0A0B] text-[#C5A059]">
                  <Scale size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C5A059]">Rota da Justiça</span>
                  <h2 className="text-lg font-bold font-serif">Terminal Social Jurídico</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsOpen(false);
                }}
                className="rounded-lg border border-[#2A2A2E] bg-[#1A1A1D] p-2 text-[#888888] transition-colors hover:text-[#E0E0E0]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10 p-5">
                <div className="mb-2 flex items-center gap-2 text-[#C5A059]">
                  <Sparkles size={17} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em]">Da simulação para a vida profissional</span>
                </div>
                <p className="text-sm leading-relaxed text-[#D6D6D6]">
                  No Rota da Justiça você investiga casos fictícios, administra prazos e constrói sua carreira. O Social Jurídico faz parte desse universo como a ponte entre tecnologia, pessoas e profissionais do Direito.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#2A2A2E] bg-[#161618] p-4">
                  <Briefcase size={18} className="mb-2 text-[#C5A059]" />
                  <h3 className="text-xs font-bold">Radar Jurídico</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#999999]">A ideia de oportunidades e novos atendimentos que inspira o acervo de casos do jogo.</p>
                </div>
                <div className="rounded-xl border border-[#2A2A2E] bg-[#161618] p-4">
                  <FileText size={18} className="mb-2 text-[#60A5FA]" />
                  <h3 className="text-xs font-bold">Organização profissional</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#999999]">Clientes, documentos, histórico, tarefas e informações organizados em uma jornada jurídica digital.</p>
                </div>
                <div className="rounded-xl border border-[#2A2A2E] bg-[#161618] p-4">
                  <User size={18} className="mb-2 text-[#34D399]" />
                  <h3 className="text-xs font-bold">Carreira jurídica</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#999999]">O jogo apresenta a profissão; a plataforma existe para aproximar a experiência digital da advocacia real.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-[#2A2A2E] bg-[#0D0D0E] p-4 text-xs text-[#AAAAAA]">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#C5A059]" />
                <p className="leading-relaxed">
                  Os processos, clientes, provas e decisões apresentados no jogo são fictícios e possuem finalidade de entretenimento e aprendizado. O jogo não substitui orientação jurídica profissional.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-[#2A2A2E] bg-[#0D0D0E] p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => openExternal(HOME_URL)}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#2A2A2E] bg-[#1A1A1D] px-5 py-3 text-xs font-bold text-[#E0E0E0] transition-colors hover:border-[#C5A059]/50"
              >
                Conhecer o Social Jurídico <ExternalLink size={14} />
              </button>
              <button
                type="button"
                onClick={() => openExternal(LAWYER_URL)}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#0A0A0B] transition-colors hover:bg-[#D4B475]"
              >
                Sou advogado <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
