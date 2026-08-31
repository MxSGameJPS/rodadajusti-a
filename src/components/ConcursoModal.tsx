import React, { useState } from 'react';
import { PlayerProfile, ConcursoPhase } from '../types/game';
import { CONCURSO_MAGISTRATURA_PHASES } from '../data/careers';
import { 
  X, 
  Landmark, 
  Award, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ArrowRight,
  Scale,
  ShieldCheck,
  Coins
} from 'lucide-react';
import { sound } from '../utils/sound';

interface ConcursoModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onPassPhase: (phaseId: string) => void;
}

export const ConcursoModal: React.FC<ConcursoModalProps> = ({
  isOpen,
  onClose,
  player,
  onPassPhase,
}) => {
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [examSuccessMessage, setExamSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPhase: ConcursoPhase = CONCURSO_MAGISTRATURA_PHASES[activePhaseIndex] || CONCURSO_MAGISTRATURA_PHASES[0];
  const question = currentPhase.questions[currentQuestionIndex];
  const isPhaseCompleted = player.concursoCompletedPhases.includes(currentPhase.id);

  const meetsXp = player.xp >= currentPhase.requiredXp;
  const canAfford = player.money >= currentPhase.cost;

  const handleSelectOption = (optionId: string) => {
    if (isAnswerChecked) return;
    sound.playClick();
    setSelectedOptionId(optionId);
  };

  const handleConfirmAnswer = () => {
    if (!selectedOptionId || !question) return;
    const selected = question.options.find((o) => o.id === selectedOptionId);
    setIsAnswerChecked(true);

    if (selected?.isCorrect) {
      sound.playClueFound();
    } else {
      sound.playFailure();
    }
  };

  const handleNextOrFinish = () => {
    if (currentQuestionIndex < currentPhase.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOptionId(null);
      setIsAnswerChecked(false);
    } else {
      // Check if all correct
      sound.playVictory();
      onPassPhase(currentPhase.id);
      setExamSuccessMessage(`Parabéns, ${player.name}! Você foi aprovado(a) na ${currentPhase.title}!`);
      setIsAnswerChecked(false);
      setSelectedOptionId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#111113] px-6 py-4 border-b border-[#2A2A2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1A1A1D] border border-[#F87171]/40 flex items-center justify-center text-[#F87171]">
              <Landmark size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-[#E0E0E0] flex items-center gap-2">
                Concurso Público para a Magistratura
              </h2>
              <p className="text-xs text-[#888888]">
                Tribunal de Justiça do Estado • Cargo: <strong className="text-[#F87171]">Juiz de Direito Substituto</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-lg bg-[#1A1A1D] hover:bg-[#222226] text-[#888888] hover:text-[#E0E0E0] border border-[#2A2A2E] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Phases Selector Tabs */}
        <div className="p-4 bg-[#0D0D0E] border-b border-[#222226] flex items-center gap-2 overflow-x-auto text-xs">
          {CONCURSO_MAGISTRATURA_PHASES.map((phase, idx) => {
            const isDone = player.concursoCompletedPhases.includes(phase.id);
            const isCurrentTab = activePhaseIndex === idx;

            return (
              <button
                key={phase.id}
                onClick={() => {
                  sound.playClick();
                  setActivePhaseIndex(idx);
                  setCurrentQuestionIndex(0);
                  setSelectedOptionId(null);
                  setIsAnswerChecked(false);
                  setExamSuccessMessage(null);
                }}
                className={`px-3 py-2 rounded-xl border flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isCurrentTab
                    ? 'bg-[#1A1A1D] border-[#F87171] text-[#F87171] ring-1 ring-[#F87171]/40 shadow-sm'
                    : isDone
                    ? 'bg-[#111113] border-[#34D399]/40 text-[#34D399]'
                    : 'bg-[#111113] border-[#222226] text-[#888888]'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={15} className="text-[#34D399]" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-[#1A1A1D] text-[#AAAAAA] flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                )}
                <span className="font-semibold">{phase.title.split(':')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-[#0A0A0B]">
          {examSuccessMessage && (
            <div className="p-4 bg-[#34D399]/10 border border-[#34D399]/30 rounded-xl text-[#34D399] text-sm flex items-center gap-3">
              <CheckCircle2 size={24} className="text-[#34D399] shrink-0" />
              <div>
                <h4 className="font-bold">Etapa Concluída com Sucesso!</h4>
                <p className="text-xs opacity-90">{examSuccessMessage}</p>
              </div>
            </div>
          )}

          {isPhaseCompleted ? (
            <div className="p-8 text-center bg-[#161618] border border-[#2A2A2E] rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="font-bold text-base text-[#E0E0E0]">Etapa Aprovada pela Banca Examinadora</h3>
              <p className="text-xs text-[#AAAAAA] max-w-md mx-auto">
                O candidato <strong>{player.name}</strong> atingiu a pontuação necessária nesta etapa e garantiu aprovação para os quadros do Poder Judiciário.
              </p>
            </div>
          ) : !meetsXp ? (
            <div className="p-8 text-center bg-[#161618] border border-[#2A2A2E] rounded-2xl space-y-3">
              <Scale size={32} className="mx-auto text-[#666666]" />
              <h3 className="font-bold text-base text-[#CCCCCC]">Requisitos Prévios Não Atingidos</h3>
              <p className="text-xs text-[#888888] max-w-md mx-auto">
                Para se inscrever nesta fase da Magistratura, você precisa acumular mais prática jurídica e experiência: <strong>{currentPhase.requiredXp} XP</strong> (Você possui {player.xp} XP).
              </p>
            </div>
          ) : question ? (
            <div className="space-y-4">
              {/* Question Enunciado */}
              <div className="p-5 bg-[#161618] rounded-xl border border-[#2A2A2E] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#888888]">
                  <span className="font-bold text-[#F87171] uppercase font-mono tracking-wider">
                    Questão {currentQuestionIndex + 1} de {currentPhase.questions.length}
                  </span>
                  <span>Pontuação Mínima: 70%</span>
                </div>
                <p className="text-sm font-semibold text-[#E0E0E0] leading-relaxed font-serif">
                  {question.enunciado}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {question.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  const showFeedback = isAnswerChecked;

                  let optionStyle = 'bg-[#161618] hover:bg-[#1A1A1D] border-[#2A2A2E] text-[#E0E0E0]';
                  if (isSelected) {
                    optionStyle = 'bg-[#1A1A1D] border-[#F87171] text-[#F87171] ring-1 ring-[#F87171]/40';
                  }
                  if (showFeedback) {
                    if (opt.isCorrect) {
                      optionStyle = 'bg-[#1A1A1D] border-[#34D399] text-[#34D399] ring-1 ring-[#34D399]/40';
                    } else if (isSelected && !opt.isCorrect) {
                      optionStyle = 'bg-[#1A1A1D] border-[#F87171] text-[#F87171] ring-1 ring-[#F87171]/40';
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      disabled={isAnswerChecked}
                      className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${optionStyle}`}
                    >
                      <span className="w-6 h-6 rounded-lg bg-[#0A0A0B] border border-[#2A2A2E] flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                        {opt.id}
                      </span>
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm leading-relaxed">{opt.text}</p>
                        {showFeedback && (
                          <p className={`text-xs mt-1 italic ${opt.isCorrect ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
                            {opt.explanation}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                {!isAnswerChecked ? (
                  <button
                    onClick={handleConfirmAnswer}
                    disabled={!selectedOptionId}
                    className="px-6 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#D4B475] disabled:opacity-50 text-[#0A0A0B] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Confirmar Resposta
                  </button>
                ) : (
                  <button
                    onClick={handleNextOrFinish}
                    className="px-6 py-2.5 rounded-xl bg-[#34D399] hover:bg-[#10B981] text-[#0A0A0B] font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Avançar</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#111113] border-t border-[#2A2A2E] flex items-center justify-between text-xs">
          <span className="text-[#888888]">
            A aprovação em todas as etapas nomeia o jogador como Juiz de Direito Substituto.
          </span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-[#1A1A1D] hover:bg-[#222226] text-[#E0E0E0] border border-[#2A2A2E] font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
