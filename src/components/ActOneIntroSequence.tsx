import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, FileSignature, Scale } from 'lucide-react';
import { sound } from '../utils/sound';

interface ActOneIntroSequenceProps {
  isOpen: boolean;
  playerName: string;
  city: string;
  onComplete: () => void;
}

type IntroScene = {
  kicker: string;
  title: string;
  text: string;
  detail: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

export const ActOneIntroSequence: React.FC<ActOneIntroSequenceProps> = ({
  isOpen,
  playerName,
  city,
  onComplete,
}) => {
  const [index, setIndex] = useState(0);
  const scenes = useMemo<IntroScene[]>(() => [
    {
      kicker: 'Rota da Justiça',
      title: 'Toda carreira começa antes do primeiro processo.',
      text: `${playerName || 'Seu personagem'} ainda é estudante de Direito. A OAB, os grandes casos e o próprio escritório pertencem ao futuro. Hoje, o desafio é muito menor — e talvez mais difícil: conquistar espaço.`,
      detail: 'Você tem contas, faculdade, rotina pessoal e uma oportunidade de estágio para transformar em carreira.',
      icon: Scale,
    },
    {
      kicker: 'Ato 1 • Formação',
      title: 'Uma oportunidade no Ramos & Associados',
      text: `Em ${city || 'sua cidade'}, o Ramos & Associados abriu uma vaga de estágio jurídico. Depois de uma conversa inicial, o escritório decidiu apresentar uma proposta formal.`,
      detail: 'Não é uma promoção automática. Técnica, ética, diligência, prazos e confiança serão observados desde o primeiro dia.',
      icon: Building2,
    },
    {
      kicker: 'Seu primeiro vínculo profissional',
      title: 'O contrato é apenas a porta de entrada.',
      text: 'Você começará sob supervisão do Dr. Roberto Ramos e terá Mariana Duarte como uma das primeiras referências da rotina do escritório.',
      detail: 'As relações construídas aqui guardarão memória das suas entregas, erros, conflitos e conquistas.',
      icon: BriefcaseBusiness,
    },
    {
      kicker: 'Documento de ingresso',
      title: 'A proposta está pronta para sua assinatura.',
      text: 'Revise seus dados, escolha seu interesse jurídico inicial e confirme sua residência de jogo. Depois, decida se aceita o estágio.',
      detail: 'A partir da assinatura, o tempo do jogo começa a contar e suas decisões passam a formar seu histórico profissional.',
      icon: FileSignature,
    },
  ], [city, playerName]);

  useEffect(() => {
    if (isOpen) setIndex(0);
  }, [isOpen]);

  if (!isOpen) return null;
  const scene = scenes[index];
  const Icon = scene.icon;
  const last = index === scenes.length - 1;

  const advance = () => {
    sound.playClick();
    if (last) {
      onComplete();
      return;
    }
    setIndex((value) => value + 1);
  };

  return (
    <div className="fixed inset-0 z-[145] flex items-center justify-center overflow-hidden bg-[#050506] p-4 text-[#EEE9DF]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(197,160,89,.14),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(92,107,126,.10),transparent_28%),linear-gradient(145deg,#111113_0%,#070708_52%,#030304_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C5A059]/80 to-transparent" />

      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-[#C5A059]/25 bg-[#0D0D0F]/94 shadow-2xl shadow-black/70">
        <div className="grid min-h-[560px] lg:grid-cols-[.82fr_1.18fr]">
          <div className="relative flex min-h-[250px] items-center justify-center overflow-hidden border-b border-[#29282A] bg-[#111012] p-8 lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="absolute h-72 w-72 rounded-full border border-[#C5A059]/10" />
            <div className="absolute h-52 w-52 rounded-full border border-[#C5A059]/15" />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-[#C5A059]/35 bg-[#C5A059]/10 text-[#D6B66F] shadow-[0_0_80px_rgba(197,160,89,.10)]">
              <Icon size={52} />
            </div>
            <div className="absolute bottom-7 left-7 right-7">
              <span className="text-[9px] font-black uppercase tracking-[.24em] text-[#C5A059]">Capítulo {index + 1} de {scenes.length}</span>
              <div className="mt-3 flex gap-1.5">
                {scenes.map((_, itemIndex) => (
                  <span key={itemIndex} className={`h-1.5 rounded-full transition-all ${itemIndex === index ? 'w-10 bg-[#C5A059]' : itemIndex < index ? 'w-5 bg-[#76623C]' : 'w-5 bg-[#2D2D31]'}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-12">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[.28em] text-[#C5A059]">{scene.kicker}</span>
              <h1 className="mt-4 max-w-2xl font-serif text-3xl font-black leading-tight text-[#F2EEE5] sm:text-4xl">{scene.title}</h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#C9C4BA]">{scene.text}</p>
              <div className="mt-6 rounded-2xl border border-[#2B2B30] bg-[#111114] p-4 text-sm leading-6 text-[#98948C]">
                {scene.detail}
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 border-t border-[#29292E] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[10px] uppercase tracking-[.16em] text-[#68686F]">Ato 1 — Formação</span>
              <button type="button" onClick={advance} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-6 text-xs font-black uppercase tracking-[.12em] text-[#0D0D0F] transition hover:bg-[#D7B66C] active:scale-[.98]">
                {last ? <><CheckCircle2 size={17} /> Ver proposta</> : <>Continuar <ArrowRight size={17} /></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
