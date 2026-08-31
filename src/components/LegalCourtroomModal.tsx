import React, { useEffect, useMemo, useState } from 'react';
import { ActiveCaseState, LegalCase } from '../types/game';
import { AlertTriangle, CheckCircle2, Clock, FileText, Scale, Send, X } from 'lucide-react';
import { sound } from '../utils/sound';

interface LegalCourtroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: LegalCase;
  activeState: ActiveCaseState;
  onSubmitPetition: (strategyId: string, selectedEvidenceIds: string[]) => void;
}

export const LegalCourtroomModal: React.FC<LegalCourtroomModalProps> = ({ isOpen, onClose, currentCase, activeState, onSubmitPetition }) => {
  const [selectedStrategyId, setSelectedStrategyId] = useState('');
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedStrategyId('');
    setSelectedEvidenceIds([]);
  }, [currentCase.id]);

  const strategyOptions = useMemo(() => {
    const list = [...currentCase.strategies];
    if (list.length <= 1) return list;

    const seed = currentCase.id.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
    const offset = seed % list.length;
    let ordered = [...list.slice(offset), ...list.slice(0, offset)];

    if (ordered[0]?.isOptimal) {
      ordered = [...ordered.slice(1), ordered[0]];
    }

    return ordered;
  }, [currentCase.id, currentCase.strategies]);

  if (!isOpen) return null;

  const discoveredClues = currentCase.availableClues.filter((clue) => activeState.discoveredClueIds.includes(clue.id));
  const deadlineExceeded = activeState.hoursSpent > currentCase.deadlineHours;
  const hoursOverdue = Math.max(0, activeState.hoursSpent - currentCase.deadlineHours);
  const canSubmit = deadlineExceeded || (!!selectedStrategyId && selectedEvidenceIds.length > 0);

  const toggleEvidence = (clueId: string) => {
    sound.playClick();
    if (selectedEvidenceIds.includes(clueId)) {
      setSelectedEvidenceIds((current) => current.filter((id) => id !== clueId));
      return;
    }
    if (selectedEvidenceIds.length >= 5) return;
    setSelectedEvidenceIds((current) => [...current, clueId]);
  };

  const handleSubmit = () => {
    if (deadlineExceeded) {
      sound.playFailure();
      onSubmitPetition('__PRAZO_FATAL_PERDIDO__', []);
      return;
    }

    if (!selectedStrategyId || selectedEvidenceIds.length === 0) return;
    sound.playGavel();
    onSubmitPetition(selectedStrategyId, selectedEvidenceIds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0A0A0B]/85 p-4 backdrop-blur-md">
      <div className="my-6 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#161618] text-[#E0E0E0] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2A2A2E] bg-[#111113] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#C5A059]/40 bg-[#1A1A1D] text-[#C5A059]"><Scale size={20} /></div>
            <div>
              <span className="rounded border border-[#2A2A2E] bg-[#0A0A0B] px-2 py-0.5 font-mono text-[10px] font-bold text-[#C5A059]">PREPARAÇÃO PROCESSUAL</span>
              <h2 className="mt-1 text-lg font-bold font-serif">Escolha da Tese & Seleção Probatória</h2>
            </div>
          </div>
          <button type="button" onClick={() => { sound.playClick(); onClose(); }} className="rounded-lg border border-[#2A2A2E] bg-[#1A1A1D] p-2 text-[#888888] hover:text-[#E0E0E0]"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-[#0A0A0B] p-5 sm:p-6">
          {deadlineExceeded && (
            <div className="rounded-xl border border-[#F87171]/40 bg-[#F87171]/10 p-4 text-[#FCA5A5]">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider">Prazo fatal perdido</h3>
                  <p className="mt-1 text-xs leading-relaxed">O prazo terminou há {hoursOverdue}h. O protocolo será considerado intempestivo. Em uma simulação profissional, perder prazo fatal significa perder a oportunidade processual e comprometer a reputação.</p>
                </div>
              </div>
            </div>
          )}

          {!deadlineExceeded && (
            <>
              <div className="rounded-xl border border-[#2A2A2E] bg-[#111113] p-4 text-xs leading-relaxed text-[#AAAAAA]">
                O jogo não informa qual tese é a correta e não marca quais provas são decisivas. Leia os fatos, confronte as evidências e escolha como faria em um atendimento real.
              </div>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C5A059] text-[11px] text-[#0A0A0B]">1</span> Escolha a tese / medida principal</label>
                  <span className="text-[11px] text-[#888888]">Nenhuma opção vem pré-selecionada</span>
                </div>
                <div className="space-y-2.5">
                  {strategyOptions.map((strategy) => {
                    const isSelected = selectedStrategyId === strategy.id;
                    return (
                      <button
                        key={strategy.id}
                        type="button"
                        onClick={() => { sound.playClick(); setSelectedStrategyId(strategy.id); }}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${isSelected ? 'border-[#C5A059] bg-[#1A1A1D]' : 'border-[#2A2A2E] bg-[#111113] hover:border-[#3A3A42]'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-[#C5A059] bg-[#C5A059] text-[#0A0A0B]' : 'border-[#444] bg-[#1A1A1D]'}`}>{isSelected && <CheckCircle2 size={13} />}</div>
                          <div>
                            <h4 className="text-sm font-bold text-[#E0E0E0]">{strategy.title}</h4>
                            <span className="mt-0.5 block font-mono text-[10px] text-[#C5A059]">Ramo: {strategy.branch}</span>
                            <p className="mt-1.5 text-xs leading-relaxed text-[#AAAAAA]">{strategy.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3 border-t border-[#2A2A2E] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C5A059] text-[11px] text-[#0A0A0B]">2</span> Escolha as provas que realmente sustentam a tese</label>
                  <span className="font-mono text-[11px] text-[#888888]">{selectedEvidenceIds.length}/5 anexadas</span>
                </div>

                {discoveredClues.length === 0 ? (
                  <div className="rounded-xl border border-[#F87171]/30 bg-[#F87171]/10 p-6 text-center text-xs text-[#F87171]"><AlertTriangle size={18} className="mx-auto mb-1" />Você ainda não coletou nenhuma prova.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {discoveredClues.map((clue) => {
                      const isChecked = selectedEvidenceIds.includes(clue.id);
                      return (
                        <button
                          key={clue.id}
                          type="button"
                          onClick={() => toggleEvidence(clue.id)}
                          className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${isChecked ? 'border-[#34D399] bg-[#1A1A1D]' : 'border-[#222226] bg-[#111113] hover:border-[#3A3A42]'}`}
                        >
                          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isChecked ? 'border-[#34D399] bg-[#34D399] text-[#0A0A0B]' : 'border-[#444] bg-[#1A1A1D]'}`}>{isChecked && <CheckCircle2 size={13} />}</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5"><FileText size={13} className="shrink-0 text-[#C5A059]" /><h5 className="truncate text-xs font-bold text-[#E0E0E0]">{clue.title}</h5></div>
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-[#888888]">{clue.summary}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#2A2A2E] bg-[#111113] p-4 text-xs sm:flex-row">
          <div className="flex items-center gap-2 text-[#888888]"><Clock size={14} className={deadlineExceeded ? 'text-[#F87171]' : 'text-[#C5A059]'} /><span>{deadlineExceeded ? 'Prazo expirado: o resultado será desfavorável.' : `Prazo utilizado: ${activeState.hoursSpent}h de ${currentCase.deadlineHours}h.`}</span></div>
          <div className="flex w-full items-center gap-3 sm:w-auto">
            {!deadlineExceeded && <button type="button" onClick={() => { sound.playClick(); onClose(); }} className="w-1/2 rounded-xl border border-[#2A2A2E] bg-[#1A1A1D] px-4 py-2.5 font-semibold text-[#E0E0E0] hover:bg-[#222226] sm:w-auto">Continuar investigando</button>}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider transition-all sm:w-auto ${deadlineExceeded ? 'bg-[#F87171] text-[#0A0A0B] hover:bg-[#FCA5A5]' : 'bg-[#C5A059] text-[#0A0A0B] hover:bg-[#D4B475]'} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Send size={14} /> {deadlineExceeded ? 'Protocolar fora do prazo' : 'Protocolar no PJe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
