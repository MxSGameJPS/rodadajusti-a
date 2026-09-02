import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Gavel,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { LegalCase, PlayerProfile } from '../types/game';
import {
  evaluateAndOpenEthicalDilemma,
  getEthicalDilemmaDefinition,
  loadEthicalDilemmaState,
  resolveEthicalDilemmaChoice,
  type EthicalChoiceResolution,
  type EthicalDilemmaChoice,
  type EthicalDilemmaDefinition,
  type EthicalDilemmaState,
} from '../lib/ethicalDilemmas';
import {
  getCharacterBand,
  loadProfessionalProfile,
  readCurrentPlayerSnapshot,
  type ProfessionalRpgProfile,
} from '../lib/professionalRpg';
import { GAME_CASES } from '../data/cases';
import { sound } from '../utils/sound';

function toneLabel(choice: EthicalDilemmaChoice) {
  if (choice.tone === 'ethical') return 'Caminho ético';
  if (choice.tone === 'gray') return 'Zona cinzenta';
  return 'Alto risco';
}

function toneClasses(choice: EthicalDilemmaChoice) {
  if (choice.tone === 'ethical') {
    return 'border-[#34D399]/30 bg-[#34D399]/[0.05] hover:border-[#34D399]/60';
  }
  if (choice.tone === 'gray') {
    return 'border-[#FBBF24]/30 bg-[#FBBF24]/[0.05] hover:border-[#FBBF24]/60';
  }
  return 'border-[#F87171]/35 bg-[#F87171]/[0.06] hover:border-[#F87171]/70';
}

function toneText(choice: EthicalDilemmaChoice) {
  if (choice.tone === 'ethical') return 'text-[#6EE7B7]';
  if (choice.tone === 'gray') return 'text-[#FCD34D]';
  return 'text-[#FCA5A5]';
}

function findPending(
  player: PlayerProfile,
  state: EthicalDilemmaState,
): { event: EthicalDilemmaDefinition; caseData: LegalCase } | null {
  if (!state.pending) return null;
  const event = getEthicalDilemmaDefinition(state.pending.eventId);
  const caseData = GAME_CASES.find((item) => item.id === state.pending?.caseId) ?? null;
  return event && caseData ? { event, caseData } : null;
}

export const EthicalDilemmaExperience: React.FC = () => {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [profile, setProfile] = useState<ProfessionalRpgProfile | null>(null);
  const [state, setState] = useState<EthicalDilemmaState | null>(null);
  const [event, setEvent] = useState<EthicalDilemmaDefinition | null>(null);
  const [caseData, setCaseData] = useState<LegalCase | null>(null);
  const [resolution, setResolution] = useState<EthicalChoiceResolution | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const sync = () => {
      const currentPlayer = readCurrentPlayerSnapshot();
      if (!active || !currentPlayer?.oabRegistration) return;
      const currentProfile = loadProfessionalProfile(currentPlayer);
      if (!currentProfile) return;

      const nextState = evaluateAndOpenEthicalDilemma(currentPlayer);
      if (!active) return;

      setPlayer(currentPlayer);
      setProfile(currentProfile);
      setState(nextState);

      const pending = findPending(currentPlayer, nextState);
      if (pending) {
        setEvent(pending.event);
        setCaseData(pending.caseData);
        if (!resolution) setIsOpen(true);
      }
    };

    sync();
    const timer = window.setInterval(sync, 900);

    const handleOpened = () => {
      setResolution(null);
      sync();
      setIsOpen(true);
    };
    const handleUpdated = (evt: Event) => {
      const detail = (evt as CustomEvent<EthicalDilemmaState>).detail;
      if (detail) setState(detail);
    };

    window.addEventListener('rota:ethical-dilemma-opened', handleOpened);
    window.addEventListener('rota:ethical-dilemma-state-updated', handleUpdated);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('rota:ethical-dilemma-opened', handleOpened);
      window.removeEventListener('rota:ethical-dilemma-state-updated', handleUpdated);
    };
  }, [resolution]);

  const caseDecisionCount = useMemo(() => {
    if (!state || !caseData) return 0;
    return state.records.filter((record) => record.caseId === caseData.id).length;
  }, [state, caseData]);

  if (!player || !profile || !isOpen || (!event && !resolution)) return null;

  const choose = (choice: EthicalDilemmaChoice) => {
    sound.playPaper();
    const result = resolveEthicalDilemmaChoice(player, choice.id);
    if (!result) return;
    setResolution(result);
    setState(result.state);
    setProfile(result.profile);
    setEvent(result.event);
    setCaseData(GAME_CASES.find((item) => item.id === result.record.caseId) ?? caseData);
  };

  const continueGame = () => {
    sound.playClick();
    setResolution(null);
    setEvent(null);
    setCaseData(null);
    setIsOpen(false);
  };

  if (resolution) {
    const choice = resolution.choice;
    return (
      <div className="fixed inset-0 z-[135] flex items-center justify-center overflow-y-auto bg-[#050506]/95 p-3 backdrop-blur-md sm:p-6">
        <div className="my-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-[#34343A] bg-[#111113] shadow-2xl">
          <header className="border-b border-[#2C2C31] bg-[#151517] px-5 py-5 sm:px-7">
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                choice.tone === 'corrupt'
                  ? 'border-[#F87171]/35 bg-[#F87171]/10 text-[#F87171]'
                  : choice.tone === 'gray'
                    ? 'border-[#FBBF24]/35 bg-[#FBBF24]/10 text-[#FBBF24]'
                    : 'border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399]'
              }`}>
                {choice.tone === 'ethical' ? <ShieldCheck size={23} /> : <Scale size={23} />}
              </div>
              <div>
                <span className={`text-[9px] font-black uppercase tracking-[0.18em] ${toneText(choice)}`}>
                  Decisão registrada • {toneLabel(choice)}
                </span>
                <h2 className="mt-1 font-serif text-xl font-black text-[#F0EFF1] sm:text-2xl">{resolution.event.title}</h2>
              </div>
            </div>
          </header>

          <div className="space-y-5 p-5 sm:p-7">
            <section className={`rounded-2xl border p-5 ${toneClasses(choice)}`}>
              <h3 className="text-sm font-black text-[#ECECEF]">{choice.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#B8B8BE]">{resolution.resultText}</p>
            </section>

            <section className="rounded-2xl border border-[#303036] bg-[#151517] p-5">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-[#C5A059]" />
                <h3 className="font-serif text-base font-black text-[#E8E6E1]">Impacto na ficha</h3>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {choice.visibleSummary.map((item) => (
                  <div key={item} className="rounded-xl border border-[#2C2C31] bg-[#0E0E10] px-3 py-2.5 text-xs font-semibold text-[#C9C9CD]">
                    {item}
                  </div>
                ))}
                {resolution.complication && (
                  <div className="rounded-xl border border-[#F87171]/30 bg-[#F87171]/[0.07] px-3 py-2.5 text-xs font-bold text-[#FCA5A5]">
                    Complicação imediata: um rastro adicional foi criado
                  </div>
                )}
                {choice.incident && (
                  <div className="rounded-xl border border-[#F87171]/30 bg-[#F87171]/[0.07] px-3 py-2.5 text-xs font-bold text-[#FCA5A5]">
                    Infração registrada no histórico disciplinar oculto
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#303036] bg-[#151517] p-4">
                <span className="text-[9px] uppercase tracking-wider text-[#777]">Ética atual</span>
                <strong className="mt-1 block font-mono text-lg text-[#E6E6EA]">{profile.ethics}/100</strong>
              </div>
              <div className="rounded-xl border border-[#303036] bg-[#151517] p-4">
                <span className="text-[9px] uppercase tracking-wider text-[#777]">Índole</span>
                <strong className="mt-1 block text-sm text-[#E6E6EA]">{getCharacterBand(profile.character)}</strong>
              </div>
              <div className="rounded-xl border border-[#303036] bg-[#151517] p-4">
                <span className="text-[9px] uppercase tracking-wider text-[#777]">Exposição</span>
                <strong className="mt-1 block text-sm text-[#9A9AA1]">OCULTA</strong>
              </div>
            </section>

            <div className="rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/[0.05] p-4 text-[10px] leading-relaxed text-[#A99974]">
              Nenhuma dessas escolhas altera automaticamente o placar do processo. Provas, estratégia e desempenho do caso continuam sendo avaliados pelas regras normais do Rota da Justiça.
            </div>

            <button
              type="button"
              onClick={continueGame}
              className="w-full rounded-xl bg-[#C5A059] px-5 py-3.5 text-xs font-black uppercase tracking-[0.08em] text-[#080809] transition-transform hover:scale-[1.01]"
            >
              Continuar o caso
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!event || !caseData) return null;

  return (
    <div className="fixed inset-0 z-[135] flex items-center justify-center overflow-y-auto bg-[#050506]/95 p-3 backdrop-blur-md sm:p-6">
      <div className="my-4 w-full max-w-5xl overflow-hidden rounded-2xl border border-[#3A3431] bg-[#111113] shadow-2xl">
        <header className="border-b border-[#302C29] bg-[#171513] px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#C5A059]/35 bg-[#C5A059]/10 text-[#D7B96E]">
              <Gavel size={24} />
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#C5A059]">Dilema profissional • Decisão de carreira</span>
              <h2 className="mt-1 font-serif text-xl font-black text-[#F1EFEA] sm:text-2xl">{event.title}</h2>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-[#7D776D]">{event.kicker}</p>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-5 sm:p-7">
          <section className="rounded-2xl border border-[#34343A] bg-[#161618] p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-wider text-[#818189]">
              <span>{caseData.code}</span>
              <span>•</span>
              <span>{caseData.title}</span>
              <span>•</span>
              <span>Dilema {caseDecisionCount + 1} deste caso</span>
            </div>
            <p className="text-sm leading-7 text-[#D0CFD2]">{event.narrative}</p>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#FBBF24]/25 bg-[#FBBF24]/[0.05] p-3 text-[10px] leading-relaxed text-[#C7B98E]">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#FBBF24]" />
              <span>{event.warning}</span>
            </div>
          </section>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Scale size={17} className="text-[#C5A059]" />
              <h3 className="font-serif text-base font-black text-[#E9E7E2]">O que você faz?</h3>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {event.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => choose(choice)}
                  className={`flex min-h-[250px] flex-col rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-xl ${toneClasses(choice)}`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-[0.18em] ${toneText(choice)}`}>{toneLabel(choice)}</span>
                  <strong className="mt-2 text-sm font-black leading-snug text-[#ECECEF]">{choice.label}</strong>
                  <p className="mt-2 flex-1 text-[11px] leading-relaxed text-[#99999F]">{choice.description}</p>

                  <div className="mt-4 border-t border-white/5 pt-3">
                    <span className="block text-[8px] font-black uppercase tracking-wider text-[#68686E]">Efeitos conhecidos</span>
                    <div className="mt-2 space-y-1.5">
                      {choice.visibleSummary.map((summary) => (
                        <span key={summary} className="block text-[9px] font-semibold text-[#B5B5BA]">• {summary}</span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-[#2D2D32] bg-[#0E0E10] p-4 text-[10px] leading-relaxed text-[#74747A]">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#60A5FA]" />
            <p>
              A decisão fica salva imediatamente. Fechar o navegador não apaga um dilema pendente. Índole e risco de exposição não exibem o valor numérico completo, e uma escolha ilegal pode não produzir qualquer vantagem prática.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
