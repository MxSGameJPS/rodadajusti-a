import React, { useEffect, useState } from 'react';
import { LegalCase, ActiveCaseState, Character, SearchableSpot, DialogueOption } from '../types/game';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  HelpCircle,
  MessageSquare,
  Search,
  X
} from 'lucide-react';
import { sound } from '../utils/sound';
import { PersistentNpcDiligence } from './PersistentNpcDiligence';

interface LocationSceneProps {
  currentCase: LegalCase;
  activeState: ActiveCaseState;
  onAskQuestion: (character: Character, option: DialogueOption) => void;
  onInspectSpot: (spot: SearchableSpot) => void;
  onBackToMap: () => void;
  onOpenDossier: () => void;
}

export const LocationScene: React.FC<LocationSceneProps> = ({
  currentCase,
  activeState,
  onAskQuestion,
  onInspectSpot,
  onBackToMap,
  onOpenDossier,
}) => {
  const currentLocation = currentCase.locations.find((location) => location.id === activeState.currentLocationId) || currentCase.locations[0];
  const [activeTab, setActiveTab] = useState<'dialogos' | 'pericia'>('dialogos');
  const [selectedCharacterId, setSelectedCharacterId] = useState(currentLocation.characters[0]?.id || '');
  const [activeSpeech, setActiveSpeech] = useState<string | null>(null);
  const [selectedSpotForReview, setSelectedSpotForReview] = useState<SearchableSpot | null>(null);

  useEffect(() => {
    setSelectedCharacterId(currentLocation.characters[0]?.id || '');
    setActiveSpeech(null);
    setSelectedSpotForReview(null);
  }, [currentLocation.id]);

  const selectedCharacter = currentLocation.characters.find((character) => character.id === selectedCharacterId) || currentLocation.characters[0];
  const reviewedClue = selectedSpotForReview?.foundClueId
    ? currentCase.availableClues.find((clue) => clue.id === selectedSpotForReview.foundClueId) || null
    : null;

  const handleSpotAction = (spot: SearchableSpot) => {
    const wasAlreadyInspected = activeState.inspectedSpotIds.includes(spot.id);
    sound.playPaper();

    if (!wasAlreadyInspected) {
      onInspectSpot(spot);
    }

    setSelectedSpotForReview(spot);
  };

  return (
    <>
      <div className="w-full space-y-4">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#2A2A2E] bg-[#161618] p-4 shadow-xl sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                sound.playTravel();
                onBackToMap();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-[#2A2A2E] bg-[#1A1A1D] p-2.5 text-xs font-semibold text-[#E0E0E0] transition-colors hover:text-[#C5A059]"
            >
              <ArrowLeft size={16} /> Voltar ao Mapa
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-[#C5A059]/25 bg-[#C5A059]/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#C5A059]">Diligência em andamento</span>
                <span className="text-xs text-[#888888]">{currentLocation.address}</span>
              </div>
              <h2 className="mt-1 text-base font-bold font-serif text-[#E0E0E0] sm:text-lg">{currentLocation.name}</h2>
            </div>
          </div>

          <div className="flex w-full items-center justify-center gap-1 rounded-xl border border-[#2A2A2E] bg-[#0A0A0B] p-1 text-xs sm:w-auto">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('dialogos');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider ${activeTab === 'dialogos' ? 'bg-[#C5A059] text-[#0A0A0B]' : 'text-[#888888] hover:text-[#E0E0E0]'}`}
            >
              <MessageSquare size={13} /> Conversas
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('pericia');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider ${activeTab === 'pericia' ? 'bg-[#C5A059] text-[#0A0A0B]' : 'text-[#888888] hover:text-[#E0E0E0]'}`}
            >
              <Search size={13} /> Perícia ({currentLocation.searchables.length})
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#0A0A0B] p-4 shadow-2xl sm:p-6">
          <div className="mb-5 flex flex-col items-start justify-between gap-2 rounded-xl border border-[#2A2A2E] bg-[#161618] p-3.5 text-xs text-[#AAAAAA] sm:flex-row sm:items-center">
            <p className="leading-relaxed">{currentLocation.description}</p>
            <button
              type="button"
              onClick={() => {
                sound.playPaper();
                onOpenDossier();
              }}
              className="shrink-0 text-[11px] font-semibold text-[#C5A059] underline hover:text-[#D4B475]"
            >
              Ver Autos do Processo
            </button>
          </div>

          {activeTab === 'dialogos' && (
            <div className="space-y-5">
              <PersistentNpcDiligence
                currentCase={currentCase}
                currentLocation={currentLocation}
                activeState={activeState}
                onAskQuestion={onAskQuestion}
              />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
                {currentLocation.characters.length > 1 && (
                  <div className="space-y-2 md:col-span-4">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#888888]">Personagens deste caso</span>
                    {currentLocation.characters.map((character) => (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setSelectedCharacterId(character.id);
                          setActiveSpeech(null);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${selectedCharacter?.id === character.id ? 'border-[#C5A059] bg-[#1A1A1D]' : 'border-[#2A2A2E] bg-[#111113] hover:border-[#3A3A42]'}`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2A2A2E] bg-[#1A1A1D] font-bold text-[#C5A059]">{character.name.charAt(0)}</div>
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-bold text-[#E0E0E0]">{character.name}</h4>
                          <p className="truncate text-[11px] text-[#888888]">{character.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className={`${currentLocation.characters.length > 1 ? 'md:col-span-8' : 'md:col-span-12'} space-y-4`}>
                  {selectedCharacter ? (
                    <>
                      <div className="flex items-start gap-4 rounded-xl border border-[#2A2A2E] bg-[#161618] p-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C5A059] text-lg font-bold text-[#0A0A0B]">{selectedCharacter.name.charAt(0)}</div>
                        <div className="w-full space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-[#E0E0E0]">{selectedCharacter.name}</h3>
                            <span className="rounded border border-[#2A2A2E] bg-[#1A1A1D] px-2 py-0.5 text-[10px] font-semibold text-[#C5A059]">{selectedCharacter.role}</span>
                          </div>
                          <div className="rounded-lg border border-[#222226] bg-[#0D0D0E] p-3.5 text-xs italic leading-relaxed text-[#CCCCCC]">“{activeSpeech || selectedCharacter.initialDialogue}”</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#888888]"><HelpCircle size={14} className="text-[#C5A059]" /> Formular perguntas</span>
                        {selectedCharacter.dialogueOptions.map((option) => {
                          const isAsked = activeState.askedDialogueIds.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setActiveSpeech(option.answer);
                                if (isAsked) {
                                  sound.playPaper();
                                  return;
                                }
                                onAskQuestion(selectedCharacter, option);
                              }}
                              className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-all ${isAsked ? 'border-[#222226] bg-[#111113] text-[#AAAAAA] hover:bg-[#161618]' : 'border-[#2A2A2E] bg-[#161618] text-[#E0E0E0] hover:border-[#C5A059]/50 hover:bg-[#1A1A1D]'}`}
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="font-bold text-[#C5A059]">▶</span>
                                <div>
                                  <p className="text-xs font-semibold leading-snug sm:text-sm">{option.question}</p>
                                  {isAsked && <span className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-[#34D399]"><CheckCircle2 size={11} /> Rever resposta sem custo de tempo</span>}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-[#888888]"><Clock size={12} className="text-[#C5A059]" /> {isAsked ? 'revisão' : `+${option.timeCostMinutes} min`}</div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#2A2A2E] p-8 text-center text-xs text-[#666666]">Nenhum personagem específico deste caso está disponível para depoimento neste local.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pericia' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E0E0E0]"><Search size={15} className="text-[#C5A059]" /> Pontos de exame documental e perícia</span>
                <span className="font-mono text-[11px] text-[#888888]">{currentLocation.searchables.filter((spot) => activeState.inspectedSpotIds.includes(spot.id)).length} de {currentLocation.searchables.length} examinados</span>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {currentLocation.searchables.map((spot) => {
                  const isInspected = activeState.inspectedSpotIds.includes(spot.id);
                  return (
                    <div key={spot.id} className={`flex flex-col justify-between rounded-xl border p-4 ${isInspected ? 'border-[#222226] bg-[#111113]' : 'border-[#2A2A2E] bg-[#161618] shadow-md'}`}>
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A2E] bg-[#1A1A1D] text-[#C5A059]"><FileText size={16} /></div>
                            <h4 className="text-sm font-bold text-[#E0E0E0]">{spot.name}</h4>
                          </div>
                          {isInspected && <span className="rounded border border-[#34D399]/30 bg-[#34D399]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#34D399]">EXAMINADO</span>}
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-[#AAAAAA]">{spot.description}</p>
                        {isInspected && <p className="mt-3 line-clamp-2 rounded-lg border border-[#222226] bg-[#0D0D0E] p-3 text-[11px] leading-relaxed text-[#C5A059]">{spot.inspectedMessage}</p>}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-[#2A2A2E] pt-3 text-xs">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-[#888888]"><Clock size={12} className="text-[#C5A059]" /> {isInspected ? 'sem novo custo' : `+${spot.timeCostMinutes} min`}</div>
                        <button
                          type="button"
                          onClick={() => handleSpotAction(spot)}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${isInspected ? 'border border-[#2A2A2E] bg-[#1A1A1D] text-[#E0E0E0] hover:bg-[#222226]' : 'bg-[#C5A059] text-[#0A0A0B] hover:bg-[#D4B475]'}`}
                        >
                          {isInspected ? <Eye size={13} /> : <Search size={13} />}
                          {isInspected ? 'Rever prova' : 'Examinar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedSpotForReview && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto bg-[#0A0A0B]/90 p-4 backdrop-blur-md">
          <div className="my-6 w-full max-w-2xl overflow-hidden rounded-2xl border border-[#C5A059]/35 bg-[#161618] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2A2A2E] bg-[#111113] px-5 py-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059]">Revisão da evidência</span>
                <h3 className="text-base font-bold text-[#E0E0E0]">{selectedSpotForReview.name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedSpotForReview(null)} className="rounded-lg border border-[#2A2A2E] bg-[#1A1A1D] p-2 text-[#888888] hover:text-[#E0E0E0]"><X size={17} /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-[#2A2A2E] bg-[#0D0D0E] p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">Constatação da análise</span>
                <p className="mt-2 text-sm leading-relaxed text-[#E0E0E0]">{selectedSpotForReview.inspectedMessage}</p>
              </div>
              {reviewedClue && (
                <div className="rounded-xl border border-[#2A2A2E] bg-[#111113] p-4">
                  <div className="flex items-center gap-2"><FileText size={16} className="text-[#C5A059]" /><h4 className="text-sm font-bold text-[#E0E0E0]">{reviewedClue.title}</h4></div>
                  <p className="mt-2 text-xs leading-relaxed text-[#AAAAAA]">{reviewedClue.fullDetail}</p>
                  <span className="mt-3 inline-block rounded border border-[#2A2A2E] bg-[#1A1A1D] px-2 py-1 font-mono text-[10px] uppercase text-[#888888]">Tipo: {reviewedClue.type.replace('_', ' ')}</span>
                </div>
              )}
              <p className="text-[11px] leading-relaxed text-[#777777]">Revisar uma evidência já examinada não consome novamente o prazo do processo. O custo de tempo é aplicado somente na primeira análise.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};