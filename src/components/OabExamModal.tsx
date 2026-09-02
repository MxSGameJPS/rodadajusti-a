import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Coins,
  Loader2,
  Pause,
  Play,
  Save,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  PlayerProfile,
  ProfessionalExam,
  ProfessionalExamResult,
} from '../types/game';
import {
  DEFAULT_OAB_EXAM_SLUG,
  loadProfessionalExam,
  submitProfessionalExam,
  type ProfessionalExamMode,
} from '../lib/examRepository';
import { sound } from '../utils/sound';

interface OabExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onComplete: (result: ProfessionalExamResult, exam: ProfessionalExam) => void;
}

type Phase = 'loading' | 'intro' | 'exam' | 'submitting' | 'result' | 'error';

type OabExamResult = ProfessionalExamResult & {
  examMode?: ProfessionalExamMode;
  durationLimitSeconds?: number;
  rewardAmount?: number;
  rewardCurrency?: string;
  rewardSymbol?: string;
  rewardGranted?: boolean;
};

interface SavedAttempt {
  version: 2;
  examSlug: string;
  mode: ProfessionalExamMode;
  answers: Record<string, string>;
  currentIndex: number;
  elapsedSeconds: number;
  savedAt: string;
}

const MODE_CONFIG: Record<ProfessionalExamMode, {
  title: string;
  subtitle: string;
  questionCount: number;
  durationSeconds: number;
  passingScore: number;
  rewardAmount: number;
}> = {
  full: {
    title: 'Simulado Completo',
    subtitle: 'A experiência mais próxima da prova completa dentro do jogo.',
    questionCount: 80,
    durationSeconds: 3 * 60 * 60,
    passingScore: 50,
    rewardAmount: 10000,
  },
  quick: {
    title: 'Modo Rápido',
    subtitle: 'Para avançar na carreira sem interromper o ritmo da campanha.',
    questionCount: 20,
    durationSeconds: 75 * 60,
    passingScore: 12,
    rewardAmount: 2000,
  },
};

function formatDuration(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatReward(value: number) {
  return `JR$ ${value.toLocaleString('pt-BR')}`;
}

function attemptStorageKey(player: PlayerProfile) {
  const identity = player.cloudCareerId || player.name.trim().toLowerCase().replace(/\s+/g, '-') || 'local';
  return `rota_oab_exam_draft_v2:${identity}`;
}

function readSavedAttempt(key: string): SavedAttempt | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedAttempt>;
    if (
      parsed.version !== 2 ||
      parsed.examSlug !== DEFAULT_OAB_EXAM_SLUG ||
      (parsed.mode !== 'full' && parsed.mode !== 'quick') ||
      !parsed.answers ||
      typeof parsed.answers !== 'object'
    ) return null;
    return parsed as SavedAttempt;
  } catch {
    return null;
  }
}

export const OabExamModal: React.FC<OabExamModalProps> = ({
  isOpen,
  onClose,
  player,
  onComplete,
}) => {
  const storageKey = useMemo(() => attemptStorageKey(player), [player.cloudCareerId, player.name]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [exam, setExam] = useState<ProfessionalExam | null>(null);
  const [mode, setMode] = useState<ProfessionalExamMode | null>(null);
  const [hasSavedAttempt, setHasSavedAttempt] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [result, setResult] = useState<OabExamResult | null>(null);

  const activeQuestions = useMemo(() => {
    if (!exam || !mode) return [];
    if (mode === 'full') return exam.questions;
    return exam.questions
      .filter((question) => (question.number - 1) % 4 === 0)
      .slice(0, MODE_CONFIG.quick.questionCount);
  }, [exam, mode]);

  const config = mode ? MODE_CONFIG[mode] : null;
  const answeredCount = useMemo(
    () => activeQuestions.filter((question) => Boolean(answers[question.id])).length,
    [activeQuestions, answers],
  );
  const currentQuestion = activeQuestions[currentIndex] || null;
  const totalSeconds = config?.durationSeconds || 0;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const timeExpired = Boolean(config && elapsedSeconds >= config.durationSeconds);

  const answeredByArea = useMemo(() => {
    const map = new Map<string, { total: number; answered: number }>();
    activeQuestions.forEach((question) => {
      const row = map.get(question.area) || { total: 0, answered: 0 };
      row.total += 1;
      if (answers[question.id]) row.answered += 1;
      map.set(question.area, row);
    });
    return [...map.entries()];
  }, [activeQuestions, answers]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setPhase('loading');
    setError('');
    setResult(null);

    loadProfessionalExam(DEFAULT_OAB_EXAM_SLUG)
      .then((loaded) => {
        if (!active) return;
        if (loaded.questions.length < 80) {
          throw new Error('O simulado da OAB precisa ter 80 questões publicadas para oferecer os dois modos.');
        }

        setExam(loaded);
        const saved = readSavedAttempt(storageKey);
        if (saved) {
          const savedConfig = MODE_CONFIG[saved.mode];
          setMode(saved.mode);
          setAnswers(saved.answers);
          setCurrentIndex(Math.max(0, Math.min(savedConfig.questionCount - 1, saved.currentIndex || 0)));
          setElapsedSeconds(Math.max(0, Math.min(savedConfig.durationSeconds, saved.elapsedSeconds || 0)));
          setIsPaused(true);
          setHasSavedAttempt(true);
        } else {
          setMode(null);
          setAnswers({});
          setCurrentIndex(0);
          setElapsedSeconds(0);
          setIsPaused(false);
          setHasSavedAttempt(false);
        }
        setPhase('intro');
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o exame.');
        setPhase('error');
      });

    return () => {
      active = false;
    };
  }, [isOpen, storageKey]);

  useEffect(() => {
    if (phase !== 'exam' || isPaused || !config || timeExpired) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => Math.min(config.durationSeconds, prev + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, isPaused, config, timeExpired]);

  useEffect(() => {
    if (phase !== 'exam' || !exam || !mode) return;
    const payload: SavedAttempt = {
      version: 2,
      examSlug: exam.slug,
      mode,
      answers,
      currentIndex,
      elapsedSeconds,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setHasSavedAttempt(true);
    } catch {
      // O salvamento local é uma camada de resiliência e não deve interromper a prova.
    }
  }, [phase, exam, mode, answers, currentIndex, elapsedSeconds, storageKey]);

  useEffect(() => {
    if (phase !== 'exam') return;
    const autoPause = () => {
      if (document.hidden) setIsPaused(true);
    };
    document.addEventListener('visibilitychange', autoPause);
    return () => document.removeEventListener('visibilitychange', autoPause);
  }, [phase]);

  if (!isOpen) return null;

  const clearSavedAttempt = () => {
    try { localStorage.removeItem(storageKey); } catch {}
    setHasSavedAttempt(false);
  };

  const requestClose = () => {
    if (phase === 'exam') {
      const wasPaused = isPaused;
      setIsPaused(true);
      const shouldClose = window.confirm(
        'Seu progresso está salvo automaticamente. Deseja sair e continuar esta prova mais tarde?'
      );
      if (!shouldClose) {
        setIsPaused(wasPaused);
        return;
      }
    }
    onClose();
  };

  const startMode = (nextMode: ProfessionalExamMode) => {
    if (hasSavedAttempt && mode && mode !== nextMode) {
      const replace = window.confirm(
        `Você já possui uma tentativa de ${MODE_CONFIG[mode].title} salva. Iniciar outro formato apagará essa tentativa. Deseja continuar?`
      );
      if (!replace) return;
    }

    clearSavedAttempt();
    sound.playPaper();
    setMode(nextMode);
    setAnswers({});
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setError('');
    setResult(null);
    setIsPaused(false);
    setPhase('exam');
  };

  const resumeSavedAttempt = () => {
    if (!mode) return;
    sound.playPaper();
    setError('');
    setIsPaused(false);
    setPhase('exam');
  };

  const chooseAnswer = (questionId: string, optionId: string) => {
    if (isPaused || timeExpired) return;
    sound.playClick();
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const submitExam = async (force = false) => {
    if (!exam || !mode || !config || phase === 'submitting') return;

    if (!force && answeredCount < config.questionCount) {
      const unanswered = config.questionCount - answeredCount;
      const proceed = window.confirm(
        `Ainda existem ${unanswered} questão(ões) sem resposta. Elas serão consideradas erradas. Deseja finalizar mesmo assim?`
      );
      if (!proceed) return;
    }

    setIsPaused(true);
    setPhase('submitting');
    setError('');

    try {
      const corrected = await submitProfessionalExam({
        slug: exam.slug,
        answers,
        durationSeconds: elapsedSeconds,
        careerId: player.cloudCareerId || null,
        mode,
      }) as OabExamResult;
      clearSavedAttempt();
      setResult(corrected);
      setPhase('result');
      if (corrected.passed) sound.playVictory();
      else sound.playFailure();
      onComplete(corrected, exam);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao corrigir o exame.');
      setIsPaused(false);
      setPhase('exam');
    }
  };

  const retryExam = () => {
    clearSavedAttempt();
    setMode(null);
    setAnswers({});
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setResult(null);
    setError('');
    setIsPaused(false);
    setPhase('intro');
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5">
      <div className="relative w-full max-w-6xl max-h-[96vh] bg-[#101012] border border-[#34343A] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <header className="px-4 sm:px-6 py-4 border-b border-[#2A2A2E] flex items-center justify-between gap-3 bg-[#141416]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center shrink-0">
              <Scale size={23} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#C5A059] font-bold font-mono">
                Marco profissional obrigatório
              </div>
              <h2 className="text-base sm:text-xl font-bold font-serif text-[#F0EEE8] truncate">
                Exame da Ordem
              </h2>
            </div>
          </div>
          <button
            onClick={requestClose}
            className="w-10 h-10 rounded-xl border border-[#2A2A2E] hover:border-[#F87171]/50 hover:text-[#F87171] flex items-center justify-center text-[#999] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </header>

        {phase === 'loading' && (
          <div className="min-h-[500px] flex flex-col items-center justify-center gap-4 text-center p-8">
            <Loader2 size={34} className="text-[#C5A059] animate-spin" />
            <div>
              <h3 className="font-bold text-lg text-[#E8E8EA]">Carregando prova publicada...</h3>
              <p className="text-sm text-[#999] mt-1">Consultando o catálogo oficial do Rota no Supabase.</p>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="min-h-[500px] flex flex-col items-center justify-center gap-4 text-center p-8">
            <AlertTriangle size={36} className="text-[#F87171]" />
            <div className="max-w-xl">
              <h3 className="font-bold text-lg text-[#E8E8EA]">Exame indisponível</h3>
              <p className="text-sm text-[#FCA5A5] mt-2">{error}</p>
            </div>
          </div>
        )}

        {phase === 'intro' && exam && (
          <div className="overflow-y-auto p-4 sm:p-7">
            <div className="max-w-5xl mx-auto space-y-5">
              <section className="rounded-2xl border border-[#C5A059]/35 bg-[#C5A059]/[0.07] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <BookOpenCheck className="text-[#C5A059] shrink-0 mt-0.5" size={24} />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#C5A059] font-mono">
                      Escolha como viver este marco da carreira
                    </div>
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#F1EFE9] mt-1">
                      Qual simulado você quer realizar?
                    </h3>
                    <p className="text-sm text-[#D6C59C] mt-3 leading-relaxed">
                      Os dois formatos permitem avançar para Advogado Contratado. O completo exige mais dedicação e oferece uma recompensa muito maior em Jures Reais.
                    </p>
                  </div>
                </div>
              </section>

              {hasSavedAttempt && mode && (
                <section className="rounded-2xl border border-[#34D399]/35 bg-[#34D399]/[0.07] p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Save className="text-[#34D399] shrink-0 mt-0.5" size={22} />
                      <div>
                        <h4 className="font-bold text-[#D7FFF0]">Tentativa salva encontrada</h4>
                        <p className="text-xs text-[#9ED8C3] mt-1">
                          {MODE_CONFIG[mode].title} • {answeredCount}/{MODE_CONFIG[mode].questionCount} respondidas • tempo usado {formatDuration(elapsedSeconds)}
                        </p>
                        <p className="text-[11px] text-[#78AA98] mt-1">
                          Se o navegador fechar ou o computador desligar, você volta exatamente deste ponto.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resumeSavedAttempt}
                      className="px-5 py-3 rounded-xl bg-[#34D399] hover:bg-[#5BE3B2] text-[#07120E] text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      <Play size={15} />
                      Continuar tentativa
                    </button>
                  </div>
                </section>
              )}

              <div className="grid lg:grid-cols-2 gap-4">
                {(['full', 'quick'] as ProfessionalExamMode[]).map((examMode) => {
                  const item = MODE_CONFIG[examMode];
                  const isSavedMode = hasSavedAttempt && mode === examMode;
                  return (
                    <section
                      key={examMode}
                      className={`rounded-2xl border p-5 sm:p-6 ${
                        examMode === 'full'
                          ? 'border-[#C5A059]/40 bg-gradient-to-br from-[#C5A059]/10 to-[#151517]'
                          : 'border-[#60A5FA]/35 bg-gradient-to-br from-[#60A5FA]/10 to-[#151517]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className={`text-[9px] font-black uppercase tracking-[0.18em] ${examMode === 'full' ? 'text-[#C5A059]' : 'text-[#60A5FA]'}`}>
                            {examMode === 'full' ? 'Desafio máximo' : 'Ritmo de campanha'}
                          </span>
                          <h4 className="text-xl font-serif font-black text-[#F1EFE9] mt-1">{item.title}</h4>
                          <p className="text-xs text-[#999] mt-2 leading-relaxed">{item.subtitle}</p>
                        </div>
                        {isSavedMode && (
                          <span className="rounded-full bg-[#34D399]/10 border border-[#34D399]/30 px-2 py-1 text-[9px] font-black uppercase text-[#34D399]">
                            Em andamento
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-5">
                        <div className="rounded-xl border border-[#2C2C31] bg-[#101012] p-3">
                          <span className="text-[9px] uppercase text-[#777] font-mono">Questões</span>
                          <strong className="block text-lg text-[#EEE] mt-1">{item.questionCount}</strong>
                        </div>
                        <div className="rounded-xl border border-[#2C2C31] bg-[#101012] p-3">
                          <span className="text-[9px] uppercase text-[#777] font-mono">Tempo máximo</span>
                          <strong className="block text-lg text-[#93C5FD] mt-1">{formatDuration(item.durationSeconds)}</strong>
                        </div>
                        <div className="rounded-xl border border-[#2C2C31] bg-[#101012] p-3">
                          <span className="text-[9px] uppercase text-[#777] font-mono">Aprovação</span>
                          <strong className="block text-lg text-[#34D399] mt-1">{item.passingScore} acertos</strong>
                        </div>
                        <div className="rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/[0.07] p-3">
                          <span className="text-[9px] uppercase text-[#A8905C] font-mono">Recompensa</span>
                          <strong className="block text-lg text-[#F2DCA9] mt-1">{formatReward(item.rewardAmount)}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => isSavedMode ? resumeSavedAttempt() : startMode(examMode)}
                        className={`w-full mt-5 px-5 py-3.5 rounded-xl font-black uppercase tracking-wide text-xs flex items-center justify-center gap-2 cursor-pointer ${
                          examMode === 'full'
                            ? 'bg-[#C5A059] hover:bg-[#D4B475] text-[#09090A]'
                            : 'bg-[#60A5FA] hover:bg-[#7CB5FF] text-[#07111F]'
                        }`}
                      >
                        {isSavedMode ? <Play size={16} /> : <Scale size={16} />}
                        {isSavedMode ? 'Continuar este simulado' : `Escolher ${item.title}`}
                      </button>
                    </section>
                  );
                })}
              </div>

              <section className="rounded-xl border border-[#60A5FA]/25 bg-[#60A5FA]/[0.05] p-4">
                <div className="flex gap-3 items-start">
                  <ShieldCheck size={20} className="text-[#60A5FA] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-[#DCE9FF]">Progresso protegido</h4>
                    <p className="text-xs sm:text-sm text-[#AFC5E8] mt-1 leading-relaxed">
                      Suas respostas, questão atual e tempo utilizado são salvos automaticamente. Ao sair, fechar o navegador ou desligar o computador, a prova poderá ser retomada sem perder o progresso. Durante uma pausa, o relógio para e nenhuma resposta ou navegação fica disponível.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {phase === 'exam' && exam && mode && config && currentQuestion && (
          <div className="relative flex-1 min-h-0 flex flex-col lg:flex-row">
            <aside className="lg:w-[285px] border-b lg:border-b-0 lg:border-r border-[#2A2A2E] bg-[#0D0D0F] p-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg border border-[#2A2A2E] p-2.5">
                  <span className="block text-[9px] uppercase font-mono text-[#777]">Respondidas</span>
                  <strong className="text-sm text-[#34D399]">{answeredCount}/{config.questionCount}</strong>
                </div>
                <div className="rounded-lg border border-[#2A2A2E] p-2.5">
                  <span className="block text-[9px] uppercase font-mono text-[#777]">Tempo restante</span>
                  <strong className={`text-sm ${remainingSeconds <= 600 ? 'text-[#F87171]' : 'text-[#60A5FA]'}`}>
                    {formatDuration(remainingSeconds)}
                  </strong>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setIsPaused(true);
                }}
                className="w-full mb-4 px-3 py-2.5 rounded-lg border border-[#C5A059]/35 bg-[#C5A059]/[0.07] text-[#C5A059] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-[#C5A059]/10"
              >
                <Pause size={15} />
                Pausar prova
              </button>

              <div className="grid grid-cols-8 lg:grid-cols-5 gap-1.5">
                {activeQuestions.map((question, index) => {
                  const selected = index === currentIndex;
                  const answered = Boolean(answers[question.id]);
                  return (
                    <button
                      key={question.id}
                      onClick={() => setCurrentIndex(index)}
                      className={`aspect-square rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#C5A059] text-[#09090A] border-[#C5A059]'
                          : answered
                          ? 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/35'
                          : 'bg-[#151517] text-[#888] border-[#2A2A2E] hover:border-[#C5A059]/40'
                      }`}
                    >
                      {question.number}
                    </button>
                  );
                })}
              </div>

              <div className="hidden lg:block mt-5 pt-4 border-t border-[#2A2A2E]">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#777] mb-2">Áreas</h4>
                <div className="space-y-1.5">
                  {answeredByArea.map(([area, row]) => (
                    <div key={area} className="text-[10px] text-[#8D8D93] flex items-start justify-between gap-2">
                      <span>{area}</span>
                      <span className="font-mono shrink-0">{row.answered}/{row.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <section className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
              {error && (
                <div className="mb-4 p-3 rounded-lg border border-[#F87171]/35 bg-[#F87171]/10 text-[#FCA5A5] text-xs">
                  {error}
                </div>
              )}

              <div className="max-w-3xl mx-auto">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="px-2.5 py-1 rounded-md bg-[#C5A059]/10 border border-[#C5A059]/25 text-[#C5A059] text-[10px] font-black font-mono">
                    QUESTÃO {currentQuestion.number}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#60A5FA]/10 border border-[#60A5FA]/20 text-[#93C5FD] text-[10px] font-semibold">
                    {currentQuestion.area}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#242429] text-[#AAA] text-[10px] font-semibold">
                    {config.title}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-[#777]">
                    <Clock3 size={12} />
                    {formatDuration(elapsedSeconds)} usados
                  </span>
                </div>

                <p className="text-sm sm:text-base leading-7 text-[#ECECEF] whitespace-pre-line">
                  {currentQuestion.prompt}
                </p>

                <div className="mt-6 space-y-3">
                  {currentQuestion.options.map((option) => {
                    const selected = answers[currentQuestion.id] === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => chooseAnswer(currentQuestion.id, option.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex gap-3 ${
                          selected
                            ? 'border-[#C5A059] bg-[#C5A059]/10 ring-1 ring-[#C5A059]/30'
                            : 'border-[#303036] bg-[#151517] hover:border-[#C5A059]/45 hover:bg-[#19191C]'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-lg border flex items-center justify-center font-black shrink-0 ${
                          selected
                            ? 'bg-[#C5A059] border-[#C5A059] text-[#09090A]'
                            : 'bg-[#0D0D0F] border-[#33333A] text-[#AAA]'
                        }`}>
                          {option.id}
                        </span>
                        <span className="text-xs sm:text-sm leading-6 text-[#D7D7DB] pt-1">{option.text}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3 mt-7 pt-5 border-t border-[#2A2A2E]">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    className="px-4 py-2.5 rounded-lg border border-[#303036] text-xs font-bold text-[#BBB] disabled:opacity-30 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowLeft size={15} />
                    Anterior
                  </button>

                  {currentIndex < activeQuestions.length - 1 ? (
                    <button
                      onClick={() => setCurrentIndex((prev) => Math.min(activeQuestions.length - 1, prev + 1))}
                      className="px-4 py-2.5 rounded-lg bg-[#242429] hover:bg-[#303036] text-xs font-bold text-[#E5E5E7] flex items-center gap-2 cursor-pointer"
                    >
                      Próxima
                      <ArrowRight size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => void submitExam()}
                      className="px-5 py-2.5 rounded-lg bg-[#34D399] hover:bg-[#5BE3B2] text-[#07120E] text-xs font-black uppercase tracking-wide flex items-center gap-2 cursor-pointer"
                    >
                      <Send size={15} />
                      Finalizar prova
                    </button>
                  )}
                </div>

                {currentIndex !== activeQuestions.length - 1 && (
                  <div className="mt-5 text-center">
                    <button
                      onClick={() => void submitExam()}
                      className="text-[11px] text-[#888] hover:text-[#C5A059] underline underline-offset-4 cursor-pointer"
                    >
                      Finalizar e corrigir agora
                    </button>
                  </div>
                )}
              </div>
            </section>

            {(isPaused || timeExpired) && (
              <div className="absolute inset-0 z-30 bg-[#08080A]/95 backdrop-blur-md flex items-center justify-center p-5">
                <div className="w-full max-w-lg rounded-2xl border border-[#C5A059]/35 bg-[#121214] p-6 sm:p-8 text-center shadow-2xl">
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border ${timeExpired ? 'border-[#F87171]/40 bg-[#F87171]/10 text-[#F87171]' : 'border-[#C5A059]/40 bg-[#C5A059]/10 text-[#C5A059]'}`}>
                    {timeExpired ? <Clock3 size={30} /> : <Pause size={30} />}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-[#F2F0EA] mt-4">
                    {timeExpired ? 'Tempo encerrado' : 'Prova pausada'}
                  </h3>
                  <p className="text-sm text-[#AAA] mt-2 leading-relaxed">
                    {timeExpired
                      ? `O limite de ${formatDuration(config.durationSeconds)} foi atingido. Nenhuma resposta pode mais ser alterada.`
                      : 'O cronômetro está parado. Enquanto a prova estiver pausada, questões, alternativas e navegação ficam bloqueadas.'}
                  </p>
                  <div className="mt-4 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3 text-xs text-[#999]">
                    <Save size={14} className="inline mr-1.5 text-[#34D399]" />
                    Progresso salvo automaticamente • {answeredCount}/{config.questionCount} respondidas
                  </div>
                  {timeExpired ? (
                    <button
                      onClick={() => void submitExam(true)}
                      className="w-full mt-5 px-5 py-3.5 rounded-xl bg-[#34D399] hover:bg-[#5BE3B2] text-[#07120E] font-black uppercase tracking-wide text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send size={16} />
                      Finalizar e corrigir
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        sound.playClick();
                        setIsPaused(false);
                      }}
                      className="w-full mt-5 px-5 py-3.5 rounded-xl bg-[#C5A059] hover:bg-[#D4B475] text-[#09090A] font-black uppercase tracking-wide text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play size={16} />
                      Retomar prova
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {phase === 'submitting' && (
          <div className="min-h-[500px] flex flex-col items-center justify-center gap-4 text-center p-8">
            <Loader2 size={38} className="text-[#34D399] animate-spin" />
            <div>
              <h3 className="font-bold text-lg text-[#E8E8EA]">Corrigindo sua prova...</h3>
              <p className="text-sm text-[#999] mt-1">
                O gabarito fica protegido no Supabase. A pontuação e a recompensa são calculadas no servidor.
              </p>
            </div>
          </div>
        )}

        {phase === 'result' && exam && result && mode && (
          <div className="overflow-y-auto p-5 sm:p-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center border ${
                result.passed
                  ? 'bg-[#34D399]/10 border-[#34D399]/35 text-[#34D399]'
                  : 'bg-[#F87171]/10 border-[#F87171]/35 text-[#F87171]'
              }`}>
                {result.passed ? <Award size={40} /> : <AlertTriangle size={38} />}
              </div>

              <div className="mt-5 text-[10px] uppercase tracking-[0.2em] font-bold font-mono text-[#888]">
                {MODE_CONFIG[mode].title} • correção automática concluída
              </div>
              <h3 className={`text-3xl sm:text-4xl font-serif font-black mt-2 ${
                result.passed ? 'text-[#34D399]' : 'text-[#F87171]'
              }`}>
                {result.passed ? 'APROVADO' : 'REPROVADO'}
              </h3>
              <p className="text-sm text-[#AAA] mt-2">
                {result.score} acertos de {result.totalQuestions} • mínimo de {result.passingScore}
              </p>

              {result.passed && (
                <div className="mt-5 rounded-2xl border border-[#C5A059]/40 bg-gradient-to-r from-[#C5A059]/10 via-[#181611] to-[#C5A059]/10 p-5">
                  <div className="flex items-center justify-center gap-2 text-[#C5A059]">
                    <Coins size={21} />
                    <span className="text-[10px] uppercase tracking-[0.18em] font-black">Recompensa da aprovação</span>
                  </div>
                  <div className="text-3xl font-black font-mono text-[#F3E6C8] mt-2">
                    {formatReward(result.rewardAmount || MODE_CONFIG[mode].rewardAmount)}
                  </div>
                  <p className="text-xs text-[#A99770] mt-2">
                    Jures Reais creditados na carteira do personagem na primeira aprovação desta etapa profissional.
                  </p>
                </div>
              )}

              <div className="mt-6 p-5 rounded-2xl border border-[#2E2E34] bg-[#151517] text-left">
                <div className="flex items-start gap-3">
                  {result.passed ? (
                    <CheckCircle2 className="text-[#34D399] shrink-0 mt-0.5" size={23} />
                  ) : (
                    <BookOpenCheck className="text-[#60A5FA] shrink-0 mt-0.5" size={23} />
                  )}
                  <div>
                    <h4 className="font-bold text-[#ECECEF]">
                      {result.passed
                        ? 'Carreira de Advogado Contratado desbloqueada'
                        : 'Você permanece como Estagiário Sênior'}
                    </h4>
                    <p className="text-xs sm:text-sm text-[#A5A5AA] mt-1 leading-relaxed">
                      {result.passed
                        ? 'A aprovação conclui o requisito profissional da progressão. O personagem agora pode atuar como advogado dentro do universo do jogo.'
                        : 'Nenhum XP ou progresso de casos é perdido. Você pode escolher novamente entre o simulado completo e o modo rápido em uma nova tentativa.'}
                    </p>
                  </div>
                </div>
              </div>

              {result.passed && result.registrationCode && (
                <div className="mt-4 p-5 rounded-2xl border border-[#C5A059]/35 bg-[#C5A059]/[0.07]">
                  <span className="text-[9px] uppercase tracking-[0.18em] text-[#C5A059] font-black font-mono">
                    Inscrição profissional do personagem • fictícia
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-[#F3E6C8] mt-2">
                    {result.registrationCode}
                  </div>
                  <p className="text-[11px] text-[#A99770] mt-2">
                    Registro exclusivo do Rota da Justiça. Não corresponde a número real de inscrição na OAB.
                  </p>
                </div>
              )}

              <div className="mt-5 p-4 rounded-xl border border-[#60A5FA]/20 bg-[#60A5FA]/[0.05] text-xs text-[#AFC5E8]">
                <Sparkles size={14} className="inline mr-1" />
                Este é um simulado dentro do Rota da Justiça e não substitui o Exame de Ordem oficial.
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                {!result.passed && (
                  <button
                    onClick={retryExam}
                    className="px-6 py-3 rounded-xl border border-[#C5A059]/40 text-[#C5A059] font-bold text-xs uppercase tracking-wide cursor-pointer hover:bg-[#C5A059]/10"
                  >
                    Escolher nova tentativa
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl bg-[#242429] hover:bg-[#303036] text-[#EEE] font-bold text-xs uppercase tracking-wide cursor-pointer"
                >
                  Voltar ao escritório
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
