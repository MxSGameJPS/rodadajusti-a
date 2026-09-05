import React from 'react';
import { Award, BriefcaseBusiness, CheckCircle2, Scale, ShieldCheck, X } from 'lucide-react';
import { CelebrationBurst } from './CelebrationBurst/CelebrationBurst';
import { sound } from '../utils/sound';

interface InternPromotionCeremonyModalProps {
  isOpen: boolean;
  playerName: string;
  onClose: () => void;
}

export const InternPromotionCeremonyModal: React.FC<InternPromotionCeremonyModalProps> = ({
  isOpen,
  playerName,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#070708]/92 p-4 backdrop-blur-lg">
      <CelebrationBurst intensity="strong" />
      <div className="relative my-6 w-full max-w-3xl overflow-hidden rounded-2xl border border-[#C5A059]/35 bg-[#111113] shadow-2xl">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute right-4 top-4 z-10 rounded-lg border border-[#2A2A2E] bg-[#17171A] p-2 text-[#86868D] hover:text-[#E8E4DA]"
        >
          <X size={17} />
        </button>

        <div className="grid md:grid-cols-[0.78fr_1.22fr]">
          <div className="relative min-h-[300px] border-b border-[#2A2A2E] bg-gradient-to-b from-[#1A1712] to-[#0C0C0E] p-6 md:border-b-0 md:border-r">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top, rgba(197,160,89,0.35), transparent 60%)' }} />
            <div className="relative flex h-full flex-col items-center justify-end text-center">
              <div className="mb-4 overflow-hidden rounded-2xl border border-[#C5A059]/35 bg-[#17171A] shadow-xl">
                <img
                  src="/personagens/dr-roberto-ramos.png"
                  alt="Dr. Roberto Ramos"
                  className="h-52 w-44 object-cover object-top"
                />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C5A059]">Sócio supervisor</span>
              <strong className="mt-1 font-serif text-lg text-[#F1EFE9]">Dr. Roberto Ramos</strong>
              <span className="mt-1 text-[10px] text-[#77777F]">Ramos & Associados</span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-[#C5A059]">
              <Award size={20} />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Promoção formal</span>
            </div>

            <h2 className="mt-3 font-serif text-2xl font-black leading-tight text-[#F1EFE9] sm:text-3xl">
              Estagiário Sênior
            </h2>

            <div className="mt-5 space-y-3 text-sm leading-relaxed text-[#C9C4B8]">
              <p>
                “{playerName}, eu acompanhei sua evolução de perto. Você já não precisa ser tratado como alguém que apenas executa tarefas. Você demonstrou capacidade para assumir responsabilidade maior dentro do escritório.”
              </p>
              <p>
                “A partir de agora, você será cobrado por algo diferente: <strong className="text-[#E6CF97]">consistência</strong>. Quero ver análise antes da pressa, prova antes da conclusão e responsabilidade antes do protocolo.”
              </p>
              <p>
                “Você ainda está em formação, mas conquistou minha confiança para atuar como <strong className="text-[#E6CF97]">Estagiário Sênior</strong>. Faça jus a ela.”
              </p>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-[#2A2A2E] bg-[#0B0B0D] p-3">
                <BriefcaseBusiness size={16} className="text-[#C5A059]" />
                <strong className="mt-2 block text-[11px] text-[#E0DCD3]">Mais autonomia</strong>
                <span className="mt-1 block text-[10px] leading-relaxed text-[#77777F]">Casos e tarefas de maior responsabilidade.</span>
              </div>
              <div className="rounded-xl border border-[#2A2A2E] bg-[#0B0B0D] p-3">
                <Scale size={16} className="text-[#C5A059]" />
                <strong className="mt-2 block text-[11px] text-[#E0DCD3]">Peças mais complexas</strong>
                <span className="mt-1 block text-[10px] leading-relaxed text-[#77777F]">Mais liberdade na preparação processual.</span>
              </div>
              <div className="rounded-xl border border-[#2A2A2E] bg-[#0B0B0D] p-3">
                <ShieldCheck size={16} className="text-[#C5A059]" />
                <strong className="mt-2 block text-[11px] text-[#E0DCD3]">Rumo à OAB</strong>
                <span className="mt-1 block text-[10px] leading-relaxed text-[#77777F]">A preparação para o Exame da Ordem entra na rotina.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playVictory();
                onClose();
              }}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-5 py-3 font-bold uppercase tracking-wider text-[#0A0A0B] hover:bg-[#D4B475]"
            >
              <CheckCircle2 size={16} />
              Assumir novas responsabilidades
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
