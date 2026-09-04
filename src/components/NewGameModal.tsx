import React, { useEffect, useRef, useState } from 'react';
import { Award, ArrowRight, Briefcase, CheckCircle2, Scale } from 'lucide-react';
import { sound } from '../utils/sound';
import { supabase } from '../lib/supabase';
import { getSuggestedPlayerName } from '../lib/authProfile';
import { CelebrationBurst } from './CelebrationBurst/CelebrationBurst';
import { OfficeWelcomeDialog } from './OfficeWelcomeDialog';

interface NewGameModalProps {
  isOpen: boolean;
  onStartNewGame: (name: string) => void;
}

type InitialFocus = 'civil' | 'consumidor' | 'empresarial';

const OFFICE_WELCOME_PENDING_KEY = 'rota_office_welcome_pending_v1';

const FOCUS_OPTIONS: Array<{
  id: InitialFocus;
  title: string;
  description: string;
}> = [
  {
    id: 'civil',
    title: 'Direito Civil',
    description: 'Contratos, posse, propriedade e reparação de danos.',
  },
  {
    id: 'consumidor',
    title: 'Consumidor',
    description: 'Relações de consumo, cobranças indevidas e bancário.',
  },
  {
    id: 'empresarial',
    title: 'Empresarial',
    description: 'Sociedades, marcas, contratos e atividade empresarial.',
  },
];

function readPendingWelcomeName() {
  try {
    const raw = localStorage.getItem(OFFICE_WELCOME_PENDING_KEY);
    if (!raw) return '';

    const parsed = JSON.parse(raw) as { playerName?: string };
    return typeof parsed.playerName === 'string' ? parsed.playerName.trim() : '';
  } catch {
    return '';
  }
}

export const NewGameModal: React.FC<NewGameModalProps> = ({ isOpen, onStartNewGame }) => {
  const pendingWelcomeName = readPendingWelcomeName();
  const [playerName, setPlayerName] = useState(pendingWelcomeName || 'Novo Personagem');
  const [didHydrateAuthName, setDidHydrateAuthName] = useState(!supabase || Boolean(pendingWelcomeName));
  const [selectedFocus, setSelectedFocus] = useState<InitialFocus>('civil');
  const [isAcceptingOffer, setIsAcceptingOffer] = useState(false);
  const [isOfficeWelcomeOpen, setIsOfficeWelcomeOpen] = useState(Boolean(pendingWelcomeName));
  const startTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen || didHydrateAuthName || isOfficeWelcomeOpen || !supabase) return;

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;

      const suggestedName = getSuggestedPlayerName(data.user);
      if (suggestedName) setPlayerName(suggestedName);
      setDidHydrateAuthName(true);
    });

    return () => {
      active = false;
    };
  }, [didHydrateAuthName, isOfficeWelcomeOpen, isOpen]);

  useEffect(
    () => () => {
      if (startTimerRef.current !== null) window.clearTimeout(startTimerRef.current);
    },
    [],
  );

  if (!isOpen) return null;

  const normalizedPlayerName = playerName.trim() || 'Novo Personagem';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isAcceptingOffer) return;

    sound.playVictory();
    setIsAcceptingOffer(true);
    startTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(
          OFFICE_WELCOME_PENDING_KEY,
          JSON.stringify({ playerName: normalizedPlayerName }),
        );
      } catch {
        // O onboarding continua funcionando mesmo sem persistência local.
      }

      setIsAcceptingOffer(false);
      setIsOfficeWelcomeOpen(true);
    }, 1900);
  };

  const handleWelcomeComplete = () => {
    try {
      localStorage.removeItem(OFFICE_WELCOME_PENDING_KEY);
    } catch {
      // ignore
    }

    setIsOfficeWelcomeOpen(false);
    onStartNewGame(normalizedPlayerName);
  };

  if (isOfficeWelcomeOpen) {
    return (
      <OfficeWelcomeDialog
        isOpen
        playerName={normalizedPlayerName}
        onComplete={handleWelcomeComplete}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#050506]/92 px-3 py-5 backdrop-blur-md sm:px-6 sm:py-8">
      {isAcceptingOffer && <CelebrationBurst intensity="strong" />}

      <div className="mx-auto flex min-h-full w-full max-w-4xl items-center justify-center">
        <div className="relative w-full overflow-hidden rounded-[4px] border border-[#B79A63]/35 bg-[#EEE7DB] shadow-[0_35px_120px_rgba(0,0,0,.7)]">
          {isAcceptingOffer && (
            <div
              className="absolute inset-0 z-[90] flex items-center justify-center bg-[#08090B]/92 p-6 backdrop-blur-md"
              role="status"
              aria-live="polite"
            >
              <div className="w-full max-w-md rounded-2xl border border-[#C5A059]/40 bg-[#111214] px-6 py-8 text-center shadow-2xl shadow-black/50">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#C5A059]/50 bg-[#C5A059]/10 text-[#D1AE62]">
                  <Award size={34} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C5A059]">
                  Oportunidade aceita
                </span>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-[#F5F0E7] sm:text-3xl">
                  Você foi contratado(a)!
                </h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#B8B8BD]">
                  Bem-vindo(a) ao Ramos & Associados. Sua trajetória começa agora como Estagiário(a) Jurídico(a).
                </p>
                <div className="mt-5 rounded-xl border border-[#34D399]/25 bg-[#34D399]/[0.07] px-4 py-3 text-xs font-semibold text-[#8BE7C3]">
                  Seu primeiro dia de trabalho está prestes a começar.
                </div>
              </div>
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            aria-hidden="true"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 10%, rgba(129,98,45,.17), transparent 34%), repeating-linear-gradient(0deg, rgba(78,62,38,.025) 0, rgba(78,62,38,.025) 1px, transparent 1px, transparent 4px)',
            }}
          />

          <form onSubmit={handleSubmit} className="relative">
            <header className="border-b border-[#A8874D]/35 px-5 pb-5 pt-6 sm:px-9 sm:pb-6 sm:pt-8 md:px-12">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#9C783C]/45 bg-[#E5D7BE] text-[#80602D] shadow-inner">
                    <Scale size={29} strokeWidth={1.45} />
                  </div>
                  <div>
                    <span className="block font-serif text-xl font-semibold tracking-[0.02em] text-[#25211C] sm:text-2xl">
                      Ramos & Associados
                    </span>
                    <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.28em] text-[#806B49]">
                      Advocacia • Consultoria • Contencioso
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.3em] text-[#947849]">
                    Documento profissional
                  </span>
                  <span className="mt-1 block font-serif text-sm font-semibold text-[#3D352A]">
                    Proposta de Estágio Jurídico
                  </span>
                </div>
              </div>

              <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-[#A77F3E] to-transparent" />
            </header>

            <main className="px-5 py-7 sm:px-9 sm:py-9 md:px-12 md:py-10">
              <div className="mx-auto max-w-3xl">
                <div className="mb-7 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#8C6E3B]">
                    Proposta de contratação
                  </span>
                  <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.02em] text-[#211E1A] sm:text-4xl">
                    Início da sua trajetória profissional
                  </h1>
                </div>

                <div className="space-y-4 font-serif text-[15px] leading-7 text-[#40382E] sm:text-base">
                  <p>Prezado(a) acadêmico(a),</p>
                  <p>
                    Após nossa conversa, gostaríamos de convidá-lo(a) para iniciar sua trajetória profissional no
                    <strong className="font-semibold text-[#211E1A]"> Ramos & Associados Advocacia</strong>, na função de
                    <strong className="font-semibold text-[#211E1A]"> Estagiário(a) Jurídico(a)</strong>.
                  </p>
                  <p>
                    Durante o estágio, você participará da análise de documentos, atendimento a clientes, investigação de fatos,
                    preparação de casos e acompanhamento da rotina jurídica do escritório. Esperamos de você curiosidade, ética,
                    atenção aos detalhes e disposição para aprender.
                  </p>
                  <p>
                    Sua carreira será construída pelas decisões tomadas a partir daqui. Resultados, relacionamentos profissionais e
                    a forma como você conduz cada caso influenciarão diretamente o seu futuro.
                  </p>
                </div>

                <div className="mt-8 flex justify-end">
                  <div className="min-w-[240px] border-t border-[#77613D]/35 pt-3 text-right">
                    <div className="font-serif text-lg italic text-[#4B3D2A]">Dr. Roberto Ramos</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#897555]">Sócio Fundador</div>
                  </div>
                </div>

                <section className="mt-9 border-y border-[#9D845A]/30 py-6">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-[#5D4829]">
                      <Briefcase size={16} />
                      <h2 className="text-[11px] font-bold uppercase tracking-[0.2em]">
                        Qual área mais desperta seu interesse neste momento?
                      </h2>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#796C59]">
                      Esta escolha representa apenas seu interesse inicial e não impede sua atuação em outras áreas ao longo da carreira.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {FOCUS_OPTIONS.map((focus) => {
                      const selected = selectedFocus === focus.id;
                      return (
                        <button
                          key={focus.id}
                          type="button"
                          disabled={isAcceptingOffer}
                          onClick={() => {
                            sound.playClick();
                            setSelectedFocus(focus.id);
                          }}
                          className={`group rounded-lg border p-4 text-left transition-all disabled:cursor-default disabled:opacity-60 ${
                            selected
                              ? 'border-[#9C7638] bg-[#E8D7B8] shadow-[inset_0_0_0_1px_rgba(156,118,56,.18)]'
                              : 'border-[#B8A98F]/55 bg-[#F5F0E7]/55 hover:border-[#9F865E] hover:bg-[#F8F3EB]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className={`font-serif text-sm font-semibold ${selected ? 'text-[#4B3518]' : 'text-[#3A342C]'}`}>
                              {focus.title}
                            </span>
                            {selected && <CheckCircle2 size={15} className="shrink-0 text-[#946C2E]" />}
                          </div>
                          <p className="mt-2 text-[11px] leading-4 text-[#746956]">{focus.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="mt-6 grid grid-cols-1 overflow-hidden rounded-lg border border-[#A99779]/45 bg-[#E7DED0]/65 text-center sm:grid-cols-3">
                  <div className="px-4 py-4">
                    <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-[#8C7A5F]">Cargo</span>
                    <span className="mt-1 block font-serif text-sm font-semibold text-[#43341F]">Estagiário Jurídico</span>
                  </div>
                  <div className="border-y border-[#A99779]/35 px-4 py-4 sm:border-x sm:border-y-0">
                    <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-[#8C7A5F]">Bolsa mensal</span>
                    <span className="mt-1 block font-mono text-sm font-bold text-[#276C50]">R$ 1.200,00</span>
                  </div>
                  <div className="px-4 py-4">
                    <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-[#8C7A5F]">Vínculo</span>
                    <span className="mt-1 block font-serif text-sm font-semibold text-[#43341F]">Ramos & Associados</span>
                  </div>
                </section>

                <div className="mt-7 text-center">
                  <p className="mx-auto max-w-xl text-[11px] leading-5 text-[#7A6D5B]">
                    Ao aceitar, você confirma o início da carreira como estagiário(a). Seus dados completos de personagem serão tratados
                    separadamente no perfil da carreira.
                  </p>

                  <button
                    type="submit"
                    disabled={isAcceptingOffer || !didHydrateAuthName}
                    className="mx-auto mt-4 flex w-full max-w-md items-center justify-center gap-2 rounded-lg bg-[#27221B] px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-[#E8CF9A] shadow-[0_16px_40px_rgba(57,43,23,.22)] transition-all hover:bg-[#1F1A14] hover:text-[#F2DCA9] disabled:cursor-wait disabled:opacity-65 active:scale-[.99]"
                  >
                    <span>{isAcceptingOffer ? 'Oportunidade aceita' : 'Aceitar oportunidade'}</span>
                    {isAcceptingOffer ? <Award size={17} /> : <ArrowRight size={17} />}
                  </button>
                </div>
              </div>
            </main>

            <footer className="border-t border-[#9D845A]/30 bg-[#E3D8C7]/55 px-5 py-4 sm:px-9 md:px-12">
              <div className="flex flex-col gap-2 text-[9px] uppercase tracking-[0.18em] text-[#8B7A60] sm:flex-row sm:items-center sm:justify-between">
                <span>Ramos & Associados Advocacia</span>
                <span>Rota da Justiça • Documento de ingresso profissional</span>
              </div>
            </footer>
          </form>
        </div>
      </div>
    </div>
  );
};
