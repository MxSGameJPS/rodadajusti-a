import React, { useState } from 'react';
import { LegalCase, ActiveCaseState, LegalStrategy, Clue } from '../types/game';
import { 
  X, 
  Scale, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  FileCheck, 
  FileText, 
  HelpCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { sound } from '../utils/sound';

interface LegalCourtroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: LegalCase;
  activeState: ActiveCaseState;
  onSubmitPetition: (strategyId: string, selectedEvidenceIds: string[]) => void;
}

export const LegalCourtroomModal: React.FC<LegalCourtroomModalProps> = ({
  isOpen,
  onClose,
  currentCase,
  activeState,
  onSubmitPetition,
}) => {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(
    currentCase.strategies[0]?.id || ''
  );
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>(
    activeState.discoveredClueIds.slice(0, 4)
  );

  if (!isOpen) return null;

  const discoveredClues = currentCase.availableClues.filter((c) =>
    activeState.discoveredClueIds.includes(c.id)
  );

  const toggleEvidence = (clueId: string) => {
    sound.playClick();
    if (selectedEvidenceIds.includes(clueId)) {
      setSelectedEvidenceIds(selectedEvidenceIds.filter((id) => id !== clueId));
    } else {
      if (selectedEvidenceIds.length >= 5) return; // limit max 5
      setSelectedEvidenceIds([...selectedEvidenceIds, clueId]);
    }
  };

  const handleSubmit = () => {
    if (!selectedStrategyId) return;
    sound.playGavel();
    onSubmitPetition(selectedStrategyId, selectedEvidenceIds);
  };

  const selectedStrategy = currentCase.strategies.find((s) => s.id === selectedStrategyId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#111113] px-6 py-4 border-b border-[#2A2A2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1A1A1D] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059]">
              <Scale size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0A0A0B] text-[#C5A059] border border-[#2A2A2E]">
                  DISTRIBUIÇÃO DA PETIÇÃO INICIAL
                </span>
                <span className="text-xs text-[#888888]">Vara Judicial Competente</span>
              </div>
              <h2 className="text-lg font-bold font-serif text-[#E0E0E0]">
                Elaboração da Peça & Seleção Probatória
              </h2>
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-[#0A0A0B]">
          {/* STEP 1: CHOOSE LEGAL STRATEGY */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#E0E0E0] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#C5A059] text-[#0A0A0B] flex items-center justify-center font-bold text-[11px]">
                  1
                </span>
                <span>Escolha da Ação / Tese Jurídica Principal:</span>
              </label>
              <span className="text-[11px] text-[#888888]">Defina o rito processual e os pedidos</span>
            </div>

            <div className="space-y-2.5">
              {currentCase.strategies.map((strat) => {
                const isSelected = selectedStrategyId === strat.id;

                return (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSelectedStrategyId(strat.id);
                    }}
                    className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1A1A1D] border-[#C5A059] ring-1 ring-[#C5A059]/40 shadow-md'
                        : 'bg-[#111113] border-[#2A2A2E] hover:border-[#3A3A42]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[#C5A059] border-[#C5A059] text-[#0A0A0B]'
                              : 'border-[#444] bg-[#1A1A1D]'
                          }`}
                        >
                          {isSelected && <CheckCircle2 size={13} />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#E0E0E0]">{strat.title}</h4>
                          <span className="text-[10px] text-[#C5A059] font-mono block mt-0.5">
                            Ramo: {strat.branch}
                          </span>
                          <p className="text-xs text-[#AAAAAA] mt-1.5 leading-relaxed">
                            {strat.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: SELECT EVIDENCE TO ATTACH */}
          <div className="space-y-3 pt-4 border-t border-[#2A2A2E]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#E0E0E0] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#C5A059] text-[#0A0A0B] flex items-center justify-center font-bold text-[11px]">
                  2
                </span>
                <span>Anexar Provas Coletadas aos Autos (Até 5):</span>
              </label>
              <span className="text-[11px] text-[#888888] font-mono">
                {selectedEvidenceIds.length} selecionada(s)
              </span>
            </div>

            {discoveredClues.length === 0 ? (
              <div className="p-6 bg-[#F87171]/10 border border-[#F87171]/30 rounded-xl text-center text-xs text-[#F87171]">
                <AlertTriangle size={18} className="mx-auto mb-1 text-[#F87171]" />
                Você não coletou nenhuma prova ainda! Volte aos locais e investigue para obter certidões e documentos antes de protocolar.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {discoveredClues.map((clue) => {
                  const isChecked = selectedEvidenceIds.includes(clue.id);

                  return (
                    <div
                      key={clue.id}
                      onClick={() => toggleEvidence(clue.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'bg-[#1A1A1D] border-[#34D399] ring-1 ring-[#34D399]/40 shadow-sm'
                          : 'bg-[#111113] border-[#222226] hover:border-[#3A3A42] opacity-80'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                          isChecked
                            ? 'bg-[#34D399] border-[#34D399] text-[#0A0A0B]'
                            : 'border-[#444] bg-[#1A1A1D]'
                        }`}
                      >
                        {isChecked && <CheckCircle2 size={13} />}
                      </div>

                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="font-bold text-xs text-[#E0E0E0] truncate">{clue.title}</h5>
                          {clue.relevance === 'crucial' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#34D399]/10 text-[#34D399] font-bold">
                              Crucial
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#888888] line-clamp-2 mt-0.5">{clue.summary}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Submission Action */}
        <div className="p-4 bg-[#111113] border-t border-[#2A2A2E] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-[#888888] text-center sm:text-left">
            <span>O julgamento dependerá da compatibilidade da tese, robustez probatória e prazo.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-[#1A1A1D] hover:bg-[#222226] text-[#E0E0E0] border border-[#2A2A2E] font-semibold transition-colors w-1/2 sm:w-auto cursor-pointer"
            >
              Continuar Diligenciando
            </button>

            <button
              onClick={handleSubmit}
              disabled={discoveredClues.length === 0}
              className="px-6 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#D4B475] text-[#0A0A0B] font-bold uppercase tracking-wider shadow-lg shadow-[#C5A059]/20 transition-all cursor-pointer flex items-center justify-center gap-2 w-1/2 sm:w-auto disabled:opacity-50"
            >
              <Send size={14} />
              <span>Protocolar no PJe</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
