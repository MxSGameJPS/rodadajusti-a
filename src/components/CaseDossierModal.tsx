import React, { useState } from 'react';
import { LegalCase, ActiveCaseState, Clue } from '../types/game';
import { 
  X, 
  FileText, 
  Stamp, 
  Scale, 
  ShieldCheck, 
  AlertCircle, 
  Search, 
  MessageSquare, 
  Receipt, 
  FileCheck,
  Eye,
  Scroll,
  Info
} from 'lucide-react';
import { sound } from '../utils/sound';

interface CaseDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: LegalCase;
  activeState: ActiveCaseState;
}

export const CaseDossierModal: React.FC<CaseDossierModalProps> = ({
  isOpen,
  onClose,
  currentCase,
  activeState,
}) => {
  const [filterType, setFilterType] = useState<string>('todos');
  const [selectedClueForPreview, setSelectedClueForPreview] = useState<Clue | null>(null);

  if (!isOpen) return null;

  const discoveredClues = currentCase.availableClues.filter((c) =>
    activeState.discoveredClueIds.includes(c.id)
  );

  const filteredClues = filterType === 'todos'
    ? discoveredClues
    : discoveredClues.filter((c) => c.type === filterType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-6 flex flex-col max-h-[90vh]">
        {/* Header - Pasta dos Autos Judiciais */}
        <div className="bg-[#111113] px-6 py-4 border-b border-[#2A2A2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1A1A1D] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059]">
              <FileCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0A0A0B] text-[#C5A059] border border-[#2A2A2E]">
                  AUTOS Nº {currentCase.code}
                </span>
                <span className="text-xs text-[#888888]">{currentCase.area}</span>
              </div>
              <h2 className="text-lg font-bold font-serif text-[#E0E0E0]">
                Caderno de Provas & Documentos Coletados
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-lg bg-[#1A1A1D] hover:bg-[#2A2A2E] text-[#888888] hover:text-[#E0E0E0] border border-[#2A2A2E] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters and Briefing Bar */}
        <div className="p-4 bg-[#0D0D0E] border-b border-[#222226] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[#888888] font-bold uppercase text-[10px] tracking-wider mr-1">Filtrar:</span>
            {['todos', 'documento', 'registro_publico', 'pericia', 'depoimento', 'comprovante'].map((type) => (
              <button
                key={type}
                onClick={() => {
                  sound.playClick();
                  setFilterType(type);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                  filterType === type
                    ? 'bg-[#C5A059] text-[#0A0A0B] shadow'
                    : 'bg-[#1A1A1D] text-[#888888] hover:text-[#E0E0E0] border border-[#2A2A2E]'
                }`}
              >
                {type === 'todos' ? 'Todas as Provas' : type.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="text-[#888888] font-mono text-[11px]">
            Total: <strong className="text-[#C5A059]">{discoveredClues.length}</strong> de <strong className="text-[#E0E0E0]">{currentCase.availableClues.length}</strong> evidências descobertas
          </div>
        </div>

        {/* Content Area (Grid + High-Res Document Preview) */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0A0A0B]">
          {/* Left / Top: Clues Grid */}
          <div className={`${selectedClueForPreview ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-3`}>
            {filteredClues.length === 0 ? (
              <div className="p-12 text-center text-[#666666] text-xs border border-dashed border-[#2A2A2E] rounded-xl">
                Nenhuma prova desta categoria coletada ainda. Visite locais e investigue pessoas para recolher certidões e documentos.
              </div>
            ) : (
              filteredClues.map((clue) => {
                const isSelected = selectedClueForPreview?.id === clue.id;

                return (
                  <div
                    key={clue.id}
                    onClick={() => {
                      sound.playPaper();
                      setSelectedClueForPreview(clue);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#1A1A1D] border-[#C5A059] ring-1 ring-[#C5A059]/40 shadow-md'
                        : 'bg-[#161618] hover:bg-[#1A1A1D] border-[#2A2A2E] hover:border-[#3A3A42]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#1A1A1D] border border-[#2A2A2E] flex items-center justify-center text-[#C5A059] shrink-0">
                            {clue.type === 'documento' && <FileText size={16} />}
                            {clue.type === 'registro_publico' && <Stamp size={16} />}
                            {clue.type === 'pericia' && <Scale size={16} />}
                            {clue.type === 'depoimento' && <MessageSquare size={16} />}
                            {clue.type === 'comprovante' && <Receipt size={16} />}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-[#E0E0E0]">{clue.title}</h4>
                            <span className="text-[10px] uppercase font-mono text-[#888888]">
                              Tipo: {clue.type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {clue.relevance === 'crucial' && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#34D399]/10 text-[#34D399] font-bold border border-[#34D399]/30 uppercase">
                            ★ Crucial
                          </span>
                        )}
                        {clue.relevance === 'complementar' && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#60A5FA]/10 text-[#60A5FA] font-semibold border border-[#60A5FA]/30 uppercase">
                            Apoio
                          </span>
                        )}
                        {clue.relevance === 'irrelevante' && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#2A2A2E] text-[#888888] font-semibold uppercase">
                            Sem valor
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#AAAAAA] mt-2.5 leading-relaxed">
                        {clue.summary}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#2A2A2E] flex items-center justify-between text-[11px] text-[#888888]">
                      <span className="text-[#C5A059] flex items-center gap-1 font-semibold">
                        <Eye size={12} /> Clique para examinar documento
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: High-Res Official Brazilian Document Viewer (Parchment Styled) */}
          {selectedClueForPreview && (
            <div className="lg:col-span-6 sticky top-0">
              <div className="bg-[#FDFCF0] text-[#1A1A1A] rounded-2xl p-6 shadow-2xl border-4 border-[#C5A059]/50 font-serif relative overflow-hidden">
                {/* Official Brazilian Coat of Arms / Header Watermark */}
                <div className="border-b-2 border-[#1A1A1A]/20 pb-3 mb-4 text-center">
                  <span className="text-[9px] tracking-widest uppercase font-bold text-[#666666] block">
                    REPÚBLICA FEDERATIVA DO BRASIL • ESTADO DE SÃO PAULO
                  </span>
                  <h3 className="text-base font-bold text-[#1A1A1A] uppercase tracking-tight mt-1">
                    {selectedClueForPreview.title}
                  </h3>
                  <span className="text-[10px] text-[#777777] font-mono">
                    Protocolo de Custódia Probendatória: BR-{selectedClueForPreview.id}-2026
                  </span>
                </div>

                {/* Content description */}
                <div className="space-y-3 text-xs leading-relaxed text-[#2A2A2A]">
                  <div className="p-3 bg-[#F0EFE6] rounded-lg border border-[#DDD]">
                    <strong className="block text-[#1A1A1A] font-bold mb-1">Teor do Documento / Perícia:</strong>
                    <p>{selectedClueForPreview.fullDetail}</p>
                  </div>

                  <div className="p-3 bg-[#161618] text-[#E0E0E0] rounded-lg border border-[#2A2A2E] font-sans text-xs">
                    <strong className="block text-[#C5A059] font-bold mb-1 flex items-center gap-1">
                      <Scale size={14} /> Relevância Processual & Doutrinária:
                    </strong>
                    <p className="text-[#CCCCCC]">{selectedClueForPreview.legalSignificance}</p>
                  </div>
                </div>

                {/* Official Seals & Stamp Marks */}
                <div className="mt-6 pt-4 border-t-2 border-[#1A1A1A]/10 flex items-center justify-between font-mono text-[10px] text-[#444444]">
                  <div className="border-2 border-dashed border-[#B91C1C] p-2 rounded transform -rotate-3 text-[#B91C1C] font-bold text-center bg-[#FEE2E2]/60">
                    <div>FÉ PÚBLICA</div>
                    <div className="text-[8px]">AUTENTICIDADE CONFERIDA</div>
                  </div>

                  <div className="text-right">
                    <div>JUNTADA AOS AUTOS</div>
                    <div className="font-bold text-[9px]">PJe Tribunal de Justiça</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#111113] border-t border-[#2A2A2E] flex items-center justify-between text-xs">
          <span className="text-[#888888]">
            Dica do Mentor: Use apenas provas cruciais e legítimas na petição inicial.
          </span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-[#1A1A1D] hover:bg-[#222226] text-[#E0E0E0] border border-[#2A2A2E] font-semibold transition-colors cursor-pointer"
          >
            Fechar Autos
          </button>
        </div>
      </div>
    </div>
  );
};
