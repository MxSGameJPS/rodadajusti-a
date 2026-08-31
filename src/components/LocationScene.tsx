import React, { useState } from 'react';
import { LegalCase, ActiveCaseState, LocationScene as LocationType, Character, SearchableSpot, DialogueOption } from '../types/game';
import { 
  MessageSquare, 
  Search, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  ArrowLeft, 
  Briefcase, 
  User, 
  Shield, 
  HelpCircle 
} from 'lucide-react';
import { sound } from '../utils/sound';

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
  const currentLocation = currentCase.locations.find((l) => l.id === activeState.currentLocationId) || currentCase.locations[0];
  const [activeTab, setActiveTab] = useState<'dialogos' | 'pericia'>('dialogos');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(currentLocation.characters[0]?.id || '');
  const [activeSpeech, setActiveSpeech] = useState<string | null>(null);

  const selectedCharacter = currentLocation.characters.find((c) => c.id === selectedCharacterId) || currentLocation.characters[0];

  return (
    <div className="w-full space-y-4">
      {/* Top Location Navigation Banner */}
      <div className="p-4 sm:p-5 bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playTravel();
              onBackToMap();
            }}
            className="p-2.5 rounded-xl bg-[#1A1A1D] hover:bg-[#222226] text-[#E0E0E0] hover:text-[#C5A059] border border-[#2A2A2E] transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Mapa</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/25 uppercase tracking-wider">
                Diligência em Andamento
              </span>
              <span className="text-xs text-[#888888]">{currentLocation.address}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold font-serif text-[#E0E0E0] mt-1">
              {currentLocation.name}
            </h2>
          </div>
        </div>

        {/* Mode switcher tabs */}
        <div className="flex items-center gap-1 bg-[#0A0A0B] p-1 rounded-xl border border-[#2A2A2E] text-xs w-full sm:w-auto justify-center">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('dialogos');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider text-[11px] transition-all cursor-pointer ${
              activeTab === 'dialogos'
                ? 'bg-[#C5A059] text-[#0A0A0B] shadow-md'
                : 'text-[#888888] hover:text-[#E0E0E0]'
            }`}
          >
            <MessageSquare size={13} />
            <span>Interrogar ({currentLocation.characters.length})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('pericia');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider text-[11px] transition-all cursor-pointer ${
              activeTab === 'pericia'
                ? 'bg-[#C5A059] text-[#0A0A0B] shadow-md'
                : 'text-[#888888] hover:text-[#E0E0E0]'
            }`}
          >
            <Search size={13} />
            <span>Perícia ({currentLocation.searchables.length})</span>
          </button>
        </div>
      </div>

      {/* Main Scene Presentation Window */}
      <div className="relative rounded-2xl border border-[#2A2A2E] bg-[#0A0A0B] shadow-2xl p-4 sm:p-6 overflow-hidden">
        {/* Atmosphere Header Card */}
        <div className="p-3.5 bg-[#161618] rounded-xl border border-[#2A2A2E] text-xs text-[#AAAAAA] mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="leading-relaxed">
            {currentLocation.description}
          </p>
          <button
            onClick={() => {
              sound.playPaper();
              onOpenDossier();
            }}
            className="shrink-0 text-[11px] text-[#C5A059] hover:text-[#D4B475] underline font-semibold cursor-pointer"
          >
            Ver Autos do Processo
          </button>
        </div>

        {/* TAB 1: INTERROGATION & CHARACTERS */}
        {activeTab === 'dialogos' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left: Characters list selector if multiple */}
            {currentLocation.characters.length > 1 && (
              <div className="md:col-span-4 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#888888] block mb-2">
                  Pessoas no Local:
                </span>
                {currentLocation.characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedCharacterId(char.id);
                      setActiveSpeech(null);
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      selectedCharacter?.id === char.id
                        ? 'bg-[#1A1A1D] border-[#C5A059] ring-1 ring-[#C5A059]/40 shadow-md'
                        : 'bg-[#111113] border-[#2A2A2E] hover:border-[#3A3A42]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#1A1A1D] flex items-center justify-center text-[#C5A059] border border-[#2A2A2E] shrink-0 font-bold">
                      {char.name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-sm text-[#E0E0E0] truncate">{char.name}</h4>
                      <p className="text-[11px] text-[#888888] truncate">{char.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Main Dialogue Panel */}
            <div className={`${currentLocation.characters.length > 1 ? 'md:col-span-8' : 'md:col-span-12'} space-y-4`}>
              {selectedCharacter ? (
                <>
                  {/* Character Presentation Card */}
                  <div className="p-4 bg-[#161618] rounded-xl border border-[#2A2A2E] flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#C5A059] flex items-center justify-center text-[#0A0A0B] font-bold text-lg shadow-md shrink-0">
                      {selectedCharacter.name.charAt(0)}
                    </div>
                    <div className="space-y-1 w-full">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-[#E0E0E0]">{selectedCharacter.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#1A1A1D] text-[#C5A059] font-semibold border border-[#2A2A2E]">
                          {selectedCharacter.role}
                        </span>
                      </div>
                      <div className="p-3.5 bg-[#0D0D0E] rounded-lg border border-[#222226] text-xs text-[#CCCCCC] italic leading-relaxed">
                        "{activeSpeech || selectedCharacter.initialDialogue}"
                      </div>
                    </div>
                  </div>

                  {/* Inquiry Questions List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#888888] flex items-center gap-1.5">
                      <HelpCircle size={14} className="text-[#C5A059]" />
                      <span>Formular Perguntas / Indagações Técnicas:</span>
                    </span>

                    <div className="space-y-2">
                      {selectedCharacter.dialogueOptions.map((opt) => {
                        const isAsked = activeState.askedDialogueIds.includes(opt.id);

                        return (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setActiveSpeech(opt.answer);
                              onAskQuestion(selectedCharacter, opt);
                            }}
                            className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                              isAsked
                                ? 'bg-[#111113] border-[#222226] text-[#777777] hover:bg-[#161618]'
                                : 'bg-[#161618] hover:bg-[#1A1A1D] border-[#2A2A2E] hover:border-[#C5A059]/50 text-[#E0E0E0] shadow-sm'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="text-[#C5A059] font-bold text-sm">▶</span>
                              <div>
                                <p className="text-xs sm:text-sm font-semibold leading-snug">{opt.question}</p>
                                {isAsked && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-[#34D399] mt-1 font-mono">
                                    <CheckCircle2 size={11} /> Já perguntado
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1 text-[11px] text-[#888888] font-mono">
                              <Clock size={12} className="text-[#C5A059]" />
                              <span>+{opt.timeCostMinutes} min</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-[#666666] text-xs">
                  Nenhuma pessoa disponível para depoimento neste local.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SCENE PERÍCIA & SEARCHABLE SPOTS */}
        {activeTab === 'pericia' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#E0E0E0] flex items-center gap-1.5">
                <Search size={15} className="text-[#C5A059]" />
                <span>Pontos de Exame Documental e Perícia Técnica</span>
              </span>
              <span className="text-[11px] text-[#888888] font-mono">
                {currentLocation.searchables.filter((s) => activeState.inspectedSpotIds.includes(s.id)).length} de {currentLocation.searchables.length} examinados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {currentLocation.searchables.map((spot) => {
                const isInspected = activeState.inspectedSpotIds.includes(spot.id);

                return (
                  <div
                    key={spot.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isInspected
                        ? 'bg-[#111113] border-[#222226]'
                        : 'bg-[#161618] border-[#2A2A2E] hover:border-[#C5A059]/50 shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#1A1A1D] border border-[#2A2A2E] flex items-center justify-center text-[#C5A059]">
                            <FileText size={16} />
                          </div>
                          <h4 className="font-bold text-sm text-[#E0E0E0]">{spot.name}</h4>
                        </div>
                        {isInspected && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#34D399]/10 text-[#34D399] font-mono font-semibold border border-[#34D399]/30">
                            EXAMINADO
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#AAAAAA] mt-2 leading-relaxed">
                        {spot.description}
                      </p>

                      {isInspected && (
                        <div className="mt-3 p-3 bg-[#0D0D0E] rounded-lg border border-[#222226] text-[11px] text-[#C5A059] leading-relaxed font-serif">
                          <strong>Constatação pericial:</strong> {spot.inspectedMessage}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#2A2A2E] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-[#888888] font-mono text-[11px]">
                        <Clock size={12} className="text-[#C5A059]" />
                        <span>+{spot.timeCostMinutes} min</span>
                      </div>

                      <button
                        onClick={() => onInspectSpot(spot)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                          isInspected
                            ? 'bg-[#1A1A1D] hover:bg-[#222226] text-[#E0E0E0] border border-[#2A2A2E]'
                            : 'bg-[#C5A059] hover:bg-[#D4B475] text-[#0A0A0B] shadow-md'
                        }`}
                      >
                        <Search size={13} />
                        <span>{isInspected ? 'Reexaminar' : 'Examinar'}</span>
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
  );
};
