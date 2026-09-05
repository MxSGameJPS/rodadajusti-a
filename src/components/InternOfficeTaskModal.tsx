import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, RotateCcw, X } from 'lucide-react';
import type { OfficeStageTask } from '../lib/internCareerEngine';
import { sound } from '../utils/sound';

interface InternOfficeTaskModalProps {
  isOpen: boolean;
  task: OfficeStageTask | null;
  onClose: () => void;
  onComplete: (taskId: string) => void;
}

export const InternOfficeTaskModal: React.FC<InternOfficeTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onComplete,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    setStepIndex(0);
    setSelectedOptionId('');
    setFeedback(null);
    setCompletedSteps([]);
  }, [task?.id, isOpen]);

  const currentStep = task?.challengeSteps[stepIndex] || null;
  const isLastStep = !!task && stepIndex === task.challengeSteps.length - 1;
  const currentStepSolved = !!currentStep && completedSteps.includes(currentStep.id);

  const progress = useMemo(() => {
    if (!task || task.challengeSteps.length === 0) return 0;
    return Math.round((completedSteps.length / task.challengeSteps.length) * 100);
  }, [completedSteps.length, task]);

  if (!isOpen || !task || !currentStep) return null;

  const handleValidate = () => {
    if (!selectedOptionId || currentStepSolved) return;
    sound.playPaper();

    if (selectedOptionId === currentStep.correctOptionId) {
      setCompletedSteps((current) => current.includes(currentStep.id) ? current : [...current, currentStep.id]);
      setFeedback({ kind: 'success', text: currentStep.successFeedback });
      return;
    }

    sound.playFailure();
    setFeedback({ kind: 'error', text: currentStep.retryFeedback });
  };

  const handleAdvance = () => {
    if (!currentStepSolved) return;

    if (isLastStep) {
      sound.playVictory();
      onComplete(task.id);
      onClose();
      return;
    }

    setStepIndex((current) => current + 1);
    setSelectedOptionId('');
    setFeedback(null);
  };

  const handleRetry = () => {
    setSelectedOptionId('');
    setFeedback(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#070708]/90 p-4 backdrop-blur-md">
      <div className="my-6 w-full max-w-2xl overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#111113] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#2A2A2E] bg-[#151517] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#C5A059]/35 bg-[#C5A059]/10 text-[#C5A059]">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-[#C5A059]">Atividade supervisionada</span>
              <h2 className="mt-1 font-serif text-lg font-black text-[#F0EDE6]">{task.title}</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-[#8F8F96]">Você só recebe a avaliação e a recompensa depois de concluir a atividade corretamente.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-[#2A2A2E] bg-[#1A1A1D] p-2 text-[#8A8A91] hover:text-[#E0E0E0]">
            <X size={17} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-5">
            <div className="flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-wider text-[#77777E]">
              <span>Etapa {stepIndex + 1} de {task.challengeSteps.length}</span>
              <span>{progress}% concluído</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#202024]">
              <div className="h-full rounded-full bg-[#C5A059] transition-all" style={{ width: `${Math.max(progress, stepIndex > 0 ? 50 : 0)}%` }} />
            </div>
          </div>

          <div className="rounded-xl border border-[#2A2A2E] bg-[#0B0B0D] p-4">
            <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8F8469]">Situação</span>
            <p className="mt-2 text-xs leading-relaxed text-[#B9B6AF]">{currentStep.context}</p>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-bold leading-relaxed text-[#E5E2DB]">{currentStep.prompt}</h3>
            <div className="mt-3 space-y-2.5">
              {currentStep.options.map((option) => {
                const selected = selectedOptionId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={currentStepSolved}
                    onClick={() => {
                      sound.playClick();
                      setSelectedOptionId(option.id);
                      setFeedback(null);
                    }}
                    className={`w-full rounded-xl border p-3.5 text-left text-xs leading-relaxed transition-all ${
                      selected
                        ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#F0E0B5]'
                        : 'border-[#29292E] bg-[#151518] text-[#B5B5BB] hover:border-[#3C3C42]'
                    } disabled:cursor-default`}
                  >
                    <span className="mr-2 font-mono font-black text-[#C5A059]">{option.id.toUpperCase()}.</span>
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {feedback && (
            <div className={`mt-4 rounded-xl border p-3.5 text-xs leading-relaxed ${
              feedback.kind === 'success'
                ? 'border-[#34D399]/30 bg-[#34D399]/[0.06] text-[#A9E4CB]'
                : 'border-[#F87171]/30 bg-[#F87171]/[0.06] text-[#F2B1B1]'
            }`}>
              <div className="flex items-start gap-2.5">
                {feedback.kind === 'success' ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#34D399]" /> : <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[#F87171]" />}
                <div>
                  <strong className="block text-[10px] uppercase tracking-wider">{feedback.kind === 'success' ? 'Decisão correta' : 'Revise sua decisão'}</strong>
                  <p className="mt-1">{feedback.text}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-[#2A2A2E] bg-[#151517] p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[10px] leading-relaxed text-[#77777E]">Dr. Roberto avalia o raciocínio da atividade, não apenas o clique no botão.</span>
          <div className="flex gap-2">
            {feedback?.kind === 'error' ? (
              <button type="button" onClick={handleRetry} className="flex items-center gap-2 rounded-lg border border-[#3A3A40] bg-[#1B1B1F] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#D0D0D4]">
                <RotateCcw size={13} /> Tentar novamente
              </button>
            ) : currentStepSolved ? (
              <button type="button" onClick={handleAdvance} className="rounded-lg bg-[#C5A059] px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#0A0A0B] hover:bg-[#D4B475]">
                {isLastStep ? 'Entregar ao Dr. Roberto' : 'Próxima etapa'}
              </button>
            ) : (
              <button type="button" disabled={!selectedOptionId} onClick={handleValidate} className="rounded-lg bg-[#C5A059] px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#0A0A0B] hover:bg-[#D4B475] disabled:cursor-not-allowed disabled:opacity-40">
                Confirmar decisão
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
