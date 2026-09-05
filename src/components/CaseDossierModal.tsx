import React, { useEffect, useState } from 'react';
import { ActiveCaseState, Clue, LegalCase } from '../types/game';
import { FileCheck, FileText, MessageSquare, Receipt, Scale, Search, Stamp, X } from 'lucide-react';
import { sound } from '../utils/sound';
import { resolveCollectedClues } from '../lib/evidenceProgress';

interface CaseDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: LegalCase;
  activeState: ActiveCaseState;
}

const getClueIcon = (clue: Clue) => {
  if (clue.type === 'registro_publico') return <Stamp size={16} />;
  if (clue.type === 'pericia') return <Scale size={16} />;
  if (clue.type === 'depoimento') return <MessageSquare size={16} />;
  if (clue.type === 'comprovante') return <Receipt size={16} />;
  if (clue.type === 'objeto') return <Search size={16} />;
  return <FileText size={16} />;
};

export const CaseDossierModal: React.FC<CaseDossierModalProps> = ({ isOpen, onClose, currentCase, activeState }) => {
  const [filterType, setFilterType] = useState('todos');
  const [selectedClueForPreview, setSelectedClueForPreview] = useState<Clue | null>(null);

  useEffect(() => {
    setSelectedClueForPreview(null);
    setFilterType('todos');
  }, [currentCase.id]);

  if (!isOpen) return null;

  const discoveredClues = resolveCollectedClues(currentCase, activeState);
  const filteredClues = filterType === 'todos' ? discoveredClues : discoveredClues.filter((clue) => clue.type === filterType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0A0A0B]/85 p-4 backdrop-blur-md">
      <div className="my-6 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#161618] text-[#E0E0E0] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2A2A2E] bg-[#111113] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#C5A059]/40 bg-[#1A1A1D] text-[#C5A059]"><FileCheck size={22} /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-[#2A2A2E] bg-[#0A0A0B] px-2 py-0.5 font-mono text-[10px] font-bold text-[#C5A059]">AUTOS Nº {currentCase.code}</span>
                <span className="text-xs text-[#888888]">{currentCase.area}</span>
              </div>
              <h2 className="text-lg font-bold font-serif">Caderno de Provas & Documentos</h2>
            </div>
          </div>
          <button type="button" onClick={() => { sound.playClick(); onClose(); }} className="rounded-lg border border-[#2A2A2E] bg-[#1A1A1D] p-2 text-[#888888] hover:text-[#E0E0E0]"><X size={18} /></button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222226] bg-[#0D0D0E] p-4 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-[#888888]">Filtrar</span>
            {['todos', 'documento', 'registro_publico', 'pericia', 'depoimento', 'comprovante', 'objeto'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => { sound.playClick(); setFilterType(type); }}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${filterType === type ? 'bg-[#C5A059] text-[#0A0A0B]' : 'border border-[#2A2A2E] bg-[#1A1A1D] text-[#888888] hover:text-[#E0E0E0]'}`}
              >
                {type === 'todos' ? 'Todas' : type.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="font-mono text-[11px] text-[#888888]">Coletadas: <strong className="text-[#C5A059]">{discoveredClues.length}</strong> de {currentCase.availableClues.length}</div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto bg-[#0A0A0B] p-5 lg:grid-cols-12 lg:p-6">
          <div className={`${selectedClueForPreview ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-3`}>
            {filteredClues.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2A2A2E] p-12 text-center text-xs text-[#666666]">Nenhuma evidência desta categoria foi coletada.</div>
            ) : filteredClues.map((clue) => {
              const isSelected = selectedClueForPreview?.id === clue.id;
              return (
                <button
                  key={clue.id}
                  type="button"
                  onClick={() => { sound.playPaper(); setSelectedClueForPreview(clue); }}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${isSelected ? 'border-[#C5A059] bg-[#1A1A1D]' : 'border-[#2A2A2E] bg-[#161618] hover:border-[#3A3A42] hover:bg-[#1A1A1D]'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2A2A2E] bg-[#1A1A1D] text-[#C5A059]">{getClueIcon(clue)}</div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#E0E0E0]">{clue.title}</h4>
                      <span className="font-mono text-[10px] uppercase text-[#888888]">{clue.type.replace('_', ' ')}</span>
                      <p className="mt-2 text-xs leading-relaxed text-[#AAAAAA]">{clue.summary}</p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-[#2A2A2E] pt-2 text-[10px] font-semibold uppercase tracking-wider text-[#C5A059]">Examinar conteúdo</div>
                </button>
              );
            })}
          </div>

          {selectedClueForPreview && (
            <div className="lg:col-span-6">
              <div className="sticky top-0 rounded-2xl border-4 border-[#C5A059]/40 bg-[#FDFCF0] p-6 font-serif text-[#1A1A1A] shadow-2xl">
                <div className="mb-4 border-b-2 border-[#1A1A1A]/20 pb-3 text-center">
                  <span className="block text-[9px] font-bold uppercase tracking-widest text-[#666666]">Documento juntado aos autos</span>
                  <h3 className="mt-1 text-base font-bold uppercase">{selectedClueForPreview.title}</h3>
                  <span className="font-mono text-[10px] text-[#777777]">Cód. de custódia: {selectedClueForPreview.id}</span>
                </div>
                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="rounded-lg border border-[#DDD] bg-[#F0EFE6] p-3">
                    <strong className="mb-1 block">Teor da evidência</strong>
                    <p>{selectedClueForPreview.fullDetail}</p>
                  </div>
                  <div className="rounded-lg border border-[#D5D5CA] bg-white/60 p-3 font-sans">
                    <strong className="mb-1 block text-[10px] uppercase tracking-wider text-[#555555]">Cadeia de custódia</strong>
                    <p className="text-[#444444]">Autenticidade registrada: {selectedClueForPreview.isAuthentic ? 'sem impugnação técnica até o momento' : 'há questionamento de autenticidade nos autos'}.</p>
                  </div>
                </div>
                <p className="mt-5 border-t border-[#1A1A1A]/10 pt-3 font-sans text-[10px] leading-relaxed text-[#777777]">A relevância jurídica não é indicada pelo jogo durante a investigação. Cabe a você decidir se esta prova realmente sustenta a tese escolhida.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-[#2A2A2E] bg-[#111113] p-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[#888888]">Não existe marcação de “prova certa”. Analise o conteúdo, confronte os fatos e forme sua própria estratégia.</span>
          <button type="button" onClick={() => { sound.playClick(); onClose(); }} className="rounded-xl border border-[#2A2A2E] bg-[#1A1A1D] px-5 py-2 font-semibold text-[#E0E0E0] hover:bg-[#222226]">Fechar Autos</button>
        </div>
      </div>
    </div>
  );
};
