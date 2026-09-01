import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Loader2,
  Scale,
  Send,
  ShieldCheck,
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
} from '../lib/examRepository';
import { sound } from '../utils/sound';

interface OabExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onComplete: (result: ProfessionalExamResult, exam: ProfessionalExam) => void;
}

type Phase = 'loading' | 'intro' | 'exam' | 'submitting' | 'result' | 'error';

function formatDuration(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const OabExamModal: React.FC<OabExamModalProps> = ({
  isOpen,
  onClose,
  player,
  onComplete,
}) => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [exam, setExam] = useState<ProfessionalExam | null>(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<ProfessionalExamResult | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setPhase('loading');
    setError('');
    setAnswers({});
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setResult(null);
    startedAtRef.current = null;

    loadProfessionalExam(DEFAULT_OAB_EXAM_SLUG)
      .then((loaded) => {
        if (!active) return;
        setExam(loaded);
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
  }, [isOpen]);

  useEffect(() => {
    if (phase !== 'exam' || !startedAtRef.current) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const answeredCount = Object.keys(answers).length;
  const currentQuestion = exam?.questions[currentIndex] || null;
  const totalSeconds = (exam?.durationMinutes || 300) * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

  const answeredByArea = useMemo(() => {
    if (!exam) return [];
    const map = new Map<string, { total: number; answered: number }>();
    exam.questions.forEach((question) => {
      const row = map.get(question.area) || { total: 0, answered: 0 };
      row.total += 1;
      if (answers[question.id]) row.answered += 1;
      map.set(question.area, row);
    });
    return [...map.entries()];
  }, [exam, answers]);

  if (!isOpen) return null;

  const requestClose = () => {
    if (phase === 'exam' && answeredCount > 0) {
      const shouldClose = window.confirm(
        'Sair agora encerrará esta tentativa local e as respostas ainda não enviadas serão perdidas. Deseja sair?'
      );
      if (!shouldClose) return;
    }
    onClose();
  };

  const startExam = () => {
    sound.playPaper();
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    setPhase('exam');
  };

  const chooseAnswer = (questionId: string, optionId: string) => {
    sound.playClick();
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const submitExam = async () => {
    if (!exam || phase === 'submitting') return;

    if (answeredCount < exam.questionCount) {
      const unanswered = exam.questionCount - answeredCount;
      const proceed = window.confirm(
        `Ainda existem ${unanswered} questão(ões) sem resposta. Elas serão consideradas erradas. Deseja finalizar mesmo assim?`
      );
      if (!proceed) return;
    }

    setPhase('submitting');
    setError('');

    try {
      const corrected = await submitProfessionalExam({
        slug: exam.slug,
        answers,
        durationSeconds: elapsedSeconds,
        careerId: player.cloudCareerId || null,
      });
      setResult(corrected);
      setPhase('result');
      if (corrected.passed) sound.playVictory();
      else sound.playFailure();
      onComplete(corrected, exam);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao corrigir o exame.');
      setPhase('exam');
    }
  };

  const retryExam = () => {
    setAnswers({});
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setResult(null);
    startedAtRef.current = Date.now();
    setPhase('exam');
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5">
      <div className="w-full max-w-6xl max-h-[96vh] bg-[#101012] border border-[#34343A] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
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
              <p className="text-xs text-[#888] mt-3">
                Confirme se as migrations do módulo de exames e o seed do 46º Exame foram aplicados no Supabase.
              </p>
            </div>
          </div>
        )}

        {phase === 'intro' && exam && (
          <div className="overflow-y-auto p-4 sm:p-7">
            <div className="max-w-4xl mx-auto space-y-5">
              <section className="rounded-2xl border border-[#C5A059]/35 bg-[#C5A059]/[0.07] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <BookOpenCheck className="text-[#C5A059] shrink-0 mt-0.5" size={24} />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#C5A059] font-mono">
                      Simulado de prova real • 2026
                    </div>
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#F1EFE9] mt-1">
                      {exam.title}
                    </h3>
                    <p className="text-sm text-[#D6C59C] mt-3 leading-relaxed">
                      {exam.simulationNotice}
                    </p>
                  </div>
                </div>
              </section>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#171719] border border-[#2B2B30]">
                  <span className="text-[10px] text-[#888] uppercase font-mono">Questões</span>
                  <strong className="block text-2xl text-[#F0EEE8] mt-1">{exam.questionCount}</strong>
                </div>
                <div className="p-4 rounded-xl bg-[#171719] border border-[#2B2B30]">
                  <span className="text-[10px] text-[#888] uppercase font-mono">Aprovação no jogo</span>
                  <strong className="block text-2xl text-[#34D399] mt-1">{exam.passingScore} acertos</strong>
                </div>
                <div className="p-4 rounded-xl bg-[#171719] border border-[#2B2B30]">
                  <span className="text-[10px] text-[#888] uppercase font-mono">Tempo da prova real</span>
                  <strong className="block text-2xl text-[#60A5FA] mt-1">{exam.durationMinutes / 60} horas</strong>
                </div>
              </div>

              <section className="rounded-xl border border-[#60A5FA]/25 bg-[#60A5FA]/[0.06] p-4">
                <div className="flex gap-3 items-start">
                  <ShieldCheck size={20} className="text-[#60A5FA] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-[#DCE9FF]">Importante</h4>
                    <p className="text-xs sm:text-sm text-[#AFC5E8] mt-1 leading-relaxed">
                      {exam.disclaimer}
                    </p>
                  </div>
                </div>
              </section>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs text-[#888]">
                  Ao iniciar, você pode navegar livremente entre as questões e finalizar quando desejar.
                </div>
                <button
                  onClick={startExam}
                  className="px-6 py-3.5 rounded-xl bg-[#C5A059] hover:bg-[#D4B475] text-[#09090A] font-black uppercase tracking-wide text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Scale size={17} />
                  Iniciar simulado
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'exam' && exam && currentQuestion && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            <aside className="lg:w-[270px] border-b lg:border-b-0 lg:border-r border-[#2A2A2E] bg-[#0D0D0F] p-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-lg border border-[#2A2A2E] p-2.5">
                  <span className="block text-[9px] uppercase font-mono text-[#777]">Respondidas</span>
                  <strong className="text-sm text-[#34D399]">{answeredCount}/{exam.questionCount}</strong>
                </div>
                <div className="rounded-lg border border-[#2A2A2E] p-2.5">
                  <span className="block text-[9px] uppercase font-mono text-[#777]">Tempo restante</span>
                  <strong className="text-sm text-[#60A5FA]">{formatDuration(remainingSeconds)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-8 lg:grid-cols-5 gap-1.5">
                {exam.questions.map((question, index) => {
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
                  <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-[#777]">
                    <Clock3 size={12} />
                    {formatDuration(elapsedSeconds)} decorridos
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

                  {currentIndex < exam.questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentIndex((prev) => Math.min(exam.questions.length - 1, prev + 1))}
                      className="px-4 py-2.5 rounded-lg bg-[#242429] hover:bg-[#303036] text-xs font-bold text-[#E5E5E7] flex items-center gap-2 cursor-pointer"
                    >
                      Próxima
                      <ArrowRight size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={submitExam}
                      className="px-5 py-2.5 rounded-lg bg-[#34D399] hover:bg-[#5BE3B2] text-[#07120E] text-xs font-black uppercase tracking-wide flex items-center gap-2 cursor-pointer"
                    >
                      <Send size={15} />
                      Finalizar prova
                    </button>
                  )}
                </div>

                {currentIndex !== exam.questions.length - 1 && (
                  <div className="mt-5 text-center">
                    <button
                      onClick={submitExam}
                      className="text-[11px] text-[#888] hover:text-[#C5A059] underline underline-offset-4 cursor-pointer"
                    >
                      Finalizar e corrigir agora
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {phase === 'submitting' && (
          <div className="min-h-[500px] flex flex-col items-center justify-center gap-4 text-center p-8">
            <Loader2 size={38} className="text-[#34D399] animate-spin" />
            <div>
              <h3 className="font-bold text-lg text-[#E8E8EA]">Corrigindo sua prova...</h3>
              <p className="text-sm text-[#999] mt-1">
                O gabarito fica protegido no Supabase. A pontuação está sendo calculada no servidor.
              </p>
            </div>
          </div>
        )}

        {phase === 'result' && exam && result && (
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
                Correção automática concluída
              </div>
              <h3 className={`text-3xl sm:text-4xl font-serif font-black mt-2 ${
                result.passed ? 'text-[#34D399]' : 'text-[#F87171]'
              }`}>
                {result.passed ? 'APROVADO' : 'REPROVADO'}
              </h3>
              <p className="text-sm text-[#AAA] mt-2">
                {result.score} acertos de {result.totalQuestions} • mínimo de {result.passingScore}
              </p>

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
                        : 'Nenhum XP ou progresso de casos é perdido. Revise os conteúdos e faça uma nova tentativa quando quiser.'}
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
                Este resultado refere-se ao simulado baseado no <strong>{exam.title}</strong>, aplicado originalmente em 2026.
                Ele não substitui o Exame de Ordem oficial.
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                {!result.passed && (
                  <button
                    onClick={retryExam}
                    className="px-6 py-3 rounded-xl border border-[#C5A059]/40 text-[#C5A059] font-bold text-xs uppercase tracking-wide cursor-pointer hover:bg-[#C5A059]/10"
                  >
                    Tentar novamente
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
