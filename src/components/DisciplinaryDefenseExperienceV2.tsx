import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Eye,
  Fingerprint,
  Gavel,
  Handshake,
  MessageCircleMore,
  Scale,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { PlayerProfile } from '../types/game';
import {
  ATTRIBUTE_CONFIG,
  getCharacterBand,
  loadProfessionalProfile,
  readCurrentPlayerSnapshot,
  type ProfessionalAttributeId,
  type ProfessionalRpgProfile,
} from '../lib/professionalRpg';
import {
  acknowledgeDisciplinaryDecision,
  beginDisciplinaryDefense,
  evaluateAndOpenDisciplinaryProceeding,
  getDefenseStrategies,
  isProfessionalPracticeBlocked,
  loadDisciplinaryState,
  saveDisciplinaryState,
  submitDisciplinaryDefense,
  waiveDisciplinaryDefense,
  type DefenseStrategyId,
  type ProfessionalDisciplinaryState,
} from '../lib/disciplinarySystem';
import { sound } from '../utils/sound';

const STRATEGY_ICONS: Record<ProfessionalAttributeId, React.ReactNode> = {
  LEGAL_KNOWLEDGE: <Gavel size={20} />,
  INVESTIGATION: <Fingerprint size={20} />,
  PERCEPTION: <Eye size={20} />,
  PERSUASION: <MessageCircleMore size={20} />,
  INFLUENCE: <Handshake size={20} />,
  SELF_CONTROL: <Brain size={20} />,
};

function severityLabel(level: number) {
  if (level >= 5) return 'CRÍTICA';
  if (level >= 4) return 'MUITO GRAVE';
  if (level >= 3) return 'GRAVE';
  if (level >= 2) return 'RELEVANTE';
  return 'INICIAL';
}

function statusLabel(state: ProfessionalDisciplinaryState) {
  switch (state.professionalStatus) {
    case 'UNDER_INVESTIGATION': return 'Sob investigação';
    case 'CENSURED': return 'Censurado pela OAB';
    case 'SUSPENDED': return 'Inscrição suspensa';
    case 'DISBARRED': return 'OAB cassada';
    case 'INCARCERATED': return 'Preso e sem OAB';
    default: return 'Regular';
  }
}

function canOpenAnotherProceeding(
  profile: ProfessionalRpgProfile,
  state: ProfessionalDisciplinaryState,
) {
  if (state.activeProceeding) return true;
  const last = state.proceedingHistory[0];
  if (!last) return true;

  const lastIncidentIds = new Set(last.incidentIds || []);
  const hasNewIncident = state.incidents.some((incident) => !lastIncidentIds.has(incident.id));
  const ethicsWorsened = profile.ethics <= last.ethicsSnapshot - 5;
  const characterWorsened = profile.character <= last.characterSnapshot - 5;

  return hasNewIncident || ethicsWorsened || characterWorsened;
}

export const DisciplinaryDefenseExperienceV2: React.FC = () => {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [profile, setProfile] = useState<ProfessionalRpgProfile | null>(null);
  const [disciplinary, setDisciplinary] = useState<ProfessionalDisciplinaryState | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const sync = () => {
      const currentPlayer = readCurrentPlayerSnapshot();
      if (!active || !currentPlayer?.oabRegistration) return;
      const currentProfile = loadProfessionalProfile(currentPlayer);
      if (!currentProfile) return;

      const currentState = loadDisciplinaryState(currentPlayer);
      const next = canOpenAnotherProceeding(currentProfile, currentState)
        ? evaluateAndOpenDisciplinaryProceeding(currentPlayer, currentProfile)
        : currentState;

      if (!active) return;
      setPlayer(currentPlayer);
      setProfile(currentProfile);
      setDisciplinary(next);

      if (next.activeProceeding?.stage === 'NOTICE' || next.activeProceeding?.stage === 'DEFENSE') {
        setIsOpen(true);
      }
    };

    sync();
    const timer = window.setInterval(sync, 1000);

    const handleState = (event: Event) => {
      const detail = (event as CustomEvent<ProfessionalDisciplinaryState>).detail;
      if (detail) setDisciplinary(detail);
    };
    const handleOpened = () => setIsOpen(true);

    window.addEventListener('rota:disciplinary-state-updated', handleState);
    window.addEventListener('rota:disciplinary-proceeding-opened', handleOpened);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('rota:disciplinary-state-updated', handleState);
      window.removeEventListener('rota:disciplinary-proceeding-opened', handleOpened);
    };
  }, []);

  const strategies = useMemo(() => getDefenseStrategies(), []);

  if (!player || !profile || !disciplinary) return null;

  const proceeding = disciplinary.activeProceeding;
  const blocked = isProfessionalPracticeBlocked(disciplinary.professionalStatus);

  const refreshProfile = () => {
    const refreshed = loadProfessionalProfile(player);
    if (refreshed) setProfile(refreshed);
  };

  const startDefense = () => {
    sound.playClick();
    setDisciplinary(beginDisciplinaryDefense(player, disciplinary));
  };

  const submitDefense = (strategyId: DefenseStrategyId) => {
    sound.playPaper();
    const next = submitDisciplinaryDefense(player, strategyId);
    setDisciplinary(next);
    refreshProfile();
  };

  const waiveDefense = () => {
    const confirmWaive = window.confirm(
      'Não apresentar defesa aumenta drasticamente o risco de suspensão ou perda da inscrição. Deseja realmente abrir mão da defesa?'
    );
    if (!confirmWaive) return;
    sound.playFailure();
    setDisciplinary(waiveDisciplinaryDefense(player));
  };

  const acknowledgeDecision = () => {
    const next = acknowledgeDisciplinaryDecision(player);
    setDisciplinary(next);
    setIsOpen(false);
  };

  const completeSuspension = () => {
    const next: ProfessionalDisciplinaryState = {
      ...disciplinary,
      professionalStatus: 'CENSURED',
      activeProceeding: null,
    };
    saveDisciplinaryState(player, next);
    setDisciplinary(next);
    setIsOpen(false);
  };

  return (
    <>
      {disciplinary.professionalStatus !== 'REGULAR' && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-5 right-4 z-[75] rounded-2xl border px-3 py-2.5 text-left shadow-2xl backdrop-blur-md sm:right-6 sm:px-4 ${
            blocked
              ? 'border-[#F87171]/50 bg-[#2A1014]/95 text-[#FCA5A5]'
              : 'border-[#FBBF24]/40 bg-[#211B0F]/95 text-[#FCD34D]'
          }`}
        >
          <span className="block text-[8px] font-black uppercase tracking-[0.18em] opacity-70">Situação profissional</span>
          <strong className="block text-xs">{statusLabel(disciplinary)}</strong>
        </button>
      )}

      {blocked && !isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#050506]/92 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-2xl border border-[#F87171]/40 bg-[#151012] p-6 text-center shadow-2xl">
            <AlertTriangle size={42} className="mx-auto text-[#F87171]" />
            <h2 className="mt-4 font-serif text-2xl font-black text-[#F5E5E7]">Exercício profissional bloqueado</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#C8A7AB]">
              {disciplinary.professionalStatus === 'SUSPENDED'
                ? 'A inscrição fictícia do personagem está suspensa. Ele não pode exercer normalmente a advocacia enquanto a sanção estiver ativa.'
                : disciplinary.professionalStatus === 'DISBARRED'
                  ? 'A inscrição fictícia do personagem foi cassada. A carreira de advocacia está interrompida.'
                  : 'O personagem está preso no universo do jogo e perdeu a inscrição profissional.'}
            </p>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="mt-5 rounded-xl border border-[#F87171]/40 bg-[#F87171]/10 px-5 py-3 text-xs font-black uppercase tracking-wide text-[#FCA5A5]"
            >
              Ver decisão
            </button>
          </div>
        </div>
      )}

      {isOpen && proceeding && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center overflow-y-auto bg-[#050506]/94 p-2 backdrop-blur-md sm:p-5">
          <div className="my-4 flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#4A3033] bg-[#111113] shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-[#3A2427] bg-[#181012] px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#F87171]/35 bg-[#F87171]/10 text-[#F87171]">
                  <Scale size={23} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#F87171]">Procedimento contra o advogado</span>
                  <h2 className="truncate font-serif text-lg font-black text-[#F2E9EA] sm:text-2xl">Investigação disciplinar e criminal</h2>
                </div>
              </div>
              {proceeding.stage === 'DECIDED' && !blocked && (
                <button
                  type="button"
                  onClick={acknowledgeDecision}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3A3032] text-[#999] hover:text-white"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {proceeding.stage === 'NOTICE' && (
                <div className="mx-auto max-w-3xl space-y-5">
                  <section className="rounded-2xl border border-[#F87171]/35 bg-[#F87171]/[0.07] p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 shrink-0 text-[#F87171]" size={26} />
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FCA5A5]">Atenção</div>
                        <h3 className="mt-1 font-serif text-xl font-black text-[#F5E7E9]">Você está sendo investigado</h3>
                        <p className="mt-3 text-sm leading-relaxed text-[#D2B5B9]">
                          O <strong>{proceeding.authority}</strong> instaurou investigação por possíveis irregularidades relacionadas à sua atuação profissional. Paralelamente, o <strong>{proceeding.barAuthority}</strong> abriu procedimento disciplinar contra a sua inscrição fictícia no jogo.
                        </p>
                      </div>
                    </div>
                  </section>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-[#303036] bg-[#171719] p-4">
                      <span className="text-[9px] uppercase text-[#777]">Gravidade da apuração</span>
                      <strong className="mt-1 block text-sm text-[#FCA5A5]">{severityLabel(proceeding.severity)}</strong>
                    </div>
                    <div className="rounded-xl border border-[#303036] bg-[#171719] p-4">
                      <span className="text-[9px] uppercase text-[#777]">Ética atual</span>
                      <strong className="mt-1 block text-sm text-[#E5E5E7]">{profile.ethics}/100</strong>
                    </div>
                    <div className="rounded-xl border border-[#303036] bg-[#171719] p-4">
                      <span className="text-[9px] uppercase text-[#777]">Índole</span>
                      <strong className="mt-1 block text-sm text-[#E5E5E7]">{getCharacterBand(profile.character)}</strong>
                    </div>
                  </div>

                  <section className="rounded-2xl border border-[#34343A] bg-[#151517] p-5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#AAA]">Fatos em apuração</h4>
                    <div className="mt-3 space-y-2">
                      {proceeding.allegedOffenses.map((offense) => (
                        <div key={offense} className="flex gap-2 rounded-lg border border-[#2D2D32] bg-[#101012] p-3 text-xs text-[#D0D0D4]">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F87171]" />
                          <span>{offense}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] leading-relaxed text-[#777]">
                      O risco real de exposição continua oculto. A abertura do procedimento não significa condenação automática e a defesa não garante absolvição.
                    </p>
                  </section>

                  <div className="rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/[0.06] p-5 text-center">
                    <h4 className="font-serif text-lg font-black text-[#EAD8AC]">Você deseja se defender?</h4>
                    <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-[#A99B79]">
                      A estratégia escolhida usará os atributos construídos durante a carreira. Gravidade, histórico, exposição e incerteza também influenciam o resultado.
                    </p>
                    <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={startDefense}
                        className="rounded-xl bg-[#C5A059] px-6 py-3 text-xs font-black uppercase tracking-wide text-[#09090A]"
                      >
                        Preparar minha defesa
                      </button>
                      <button
                        type="button"
                        onClick={waiveDefense}
                        className="rounded-xl border border-[#F87171]/35 bg-[#F87171]/5 px-6 py-3 text-xs font-bold text-[#FCA5A5]"
                      >
                        Não apresentar defesa
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {proceeding.stage === 'DEFENSE' && (
                <div className="mx-auto max-w-4xl">
                  <div className="text-center">
                    <ShieldCheck size={34} className="mx-auto text-[#60A5FA]" />
                    <h3 className="mt-3 font-serif text-2xl font-black text-[#E9EDF5]">Escolha sua linha de defesa</h3>
                    <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-[#9299A8]">
                      Você não verá uma porcentagem de sucesso. A ficha do personagem influencia o julgamento, mas nenhuma estratégia elimina o risco.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {(Object.entries(strategies) as [DefenseStrategyId, (typeof strategies)[DefenseStrategyId]][]).map(([id, strategy]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => submitDefense(id)}
                        className="rounded-2xl border border-[#303640] bg-[#15171B] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#60A5FA]/55 hover:bg-[#181C22]"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#60A5FA]/30 bg-[#60A5FA]/10 text-[#93C5FD]">
                          {STRATEGY_ICONS[strategy.primaryAttribute]}
                        </div>
                        <h4 className="mt-4 font-serif text-base font-black text-[#E8EBF0]">{strategy.title}</h4>
                        <p className="mt-2 text-[10px] leading-relaxed text-[#858C99]">{strategy.description}</p>
                        <div className="mt-4 space-y-1 rounded-xl border border-[#2A2D34] bg-[#101114] p-3 text-[9px]">
                          <div className="flex justify-between gap-2 text-[#A7AFBD]">
                            <span>{ATTRIBUTE_CONFIG[strategy.primaryAttribute].label}</span>
                            <strong>NV {profile.attributes[strategy.primaryAttribute].level}</strong>
                          </div>
                          <div className="flex justify-between gap-2 text-[#777F8B]">
                            <span>{ATTRIBUTE_CONFIG[strategy.secondaryAttribute].label}</span>
                            <strong>NV {profile.attributes[strategy.secondaryAttribute].level}</strong>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {proceeding.stage === 'DECIDED' && proceeding.decision && (
                <div className="mx-auto max-w-3xl text-center">
                  <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border ${
                    proceeding.decision.outcome === 'ARCHIVED'
                      ? 'border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399]'
                      : 'border-[#F87171]/35 bg-[#F87171]/10 text-[#F87171]'
                  }`}>
                    {proceeding.decision.outcome === 'ARCHIVED' ? <CheckCircle2 size={40} /> : <Scale size={38} />}
                  </div>
                  <div className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#888]">Decisão proferida</div>
                  <h3 className={`mt-2 font-serif text-3xl font-black ${
                    proceeding.decision.outcome === 'ARCHIVED' ? 'text-[#34D399]' : 'text-[#F87171]'
                  }`}>
                    {proceeding.decision.title}
                  </h3>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#AAA]">{proceeding.decision.description}</p>

                  {proceeding.defense && (
                    <div className="mt-6 rounded-2xl border border-[#303036] bg-[#151517] p-5 text-left">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#777]">Estratégia utilizada</span>
                      <strong className="mt-1 block text-sm text-[#E2E2E5]">{proceeding.defense.strategyTitle}</strong>
                      <p className="mt-2 text-[10px] leading-relaxed text-[#818188]">
                        O resultado considerou os atributos profissionais, gravidade da apuração, histórico, exposição oculta e incerteza. O jogo não revela o cálculo completo.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    {disciplinary.professionalStatus === 'SUSPENDED' && (
                      <button
                        type="button"
                        onClick={completeSuspension}
                        className="rounded-xl border border-[#C5A059]/40 bg-[#C5A059]/10 px-6 py-3 text-xs font-black uppercase tracking-wide text-[#E6C675]"
                      >
                        Cumprir período de suspensão
                      </button>
                    )}
                    {!blocked && (
                      <button
                        type="button"
                        onClick={acknowledgeDecision}
                        className="rounded-xl bg-[#242429] px-6 py-3 text-xs font-bold uppercase tracking-wide text-[#EEE]"
                      >
                        Voltar à carreira
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
