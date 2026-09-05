import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  HeartHandshake,
  MapPinPlus,
  MessageCircleMore,
  Search,
  Sparkles,
  UserRoundSearch,
  X,
} from 'lucide-react';
import type {
  ActiveCaseState,
  Character,
  DialogueOption,
  LegalCase,
  LocationScene,
} from '../types/game';
import {
  isNpcAvailableAtLocation,
  loadCaseNpcAssignments,
  type PersistentNpcAssignment,
} from '../lib/npcRepository';
import {
  getNpcRelationship,
  getRelationshipLabel,
  recordNpcInteraction,
  relationshipDeltaFromDialogue,
} from '../lib/reactiveWorldStore';
import { sound } from '../utils/sound';

interface PersistentNpcDiligenceProps {
  currentCase: LegalCase;
  currentLocation: LocationScene;
  activeState: ActiveCaseState;
  onAskQuestion: (character: Character, option: DialogueOption) => void;
}

function toCharacter(npc: PersistentNpcAssignment): Character {
  return {
    id: `persistent-npc:${npc.npcId}`,
    name: npc.name,
    role: npc.roleInCase || npc.profession,
    avatarIcon: 'UserRoundSearch',
    avatarBg: '#1A1A1D',
    initialDialogue: npc.initialDialogue,
    dialogueOptions: npc.dialogueOptions,
  };
}

export const PersistentNpcDiligence: React.FC<PersistentNpcDiligenceProps> = ({
  currentCase,
  currentLocation,
  activeState,
  onAskQuestion,
}) => {
  const [assignments, setAssignments] = useState<PersistentNpcAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [activeOptionId, setActiveOptionId] = useState<string | null>(null);
  const [relationshipRevision, setRelationshipRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    loadCaseNpcAssignments(currentCase.id)
      .then((items) => {
        if (!cancelled) setAssignments(items);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentCase.id]);

  useEffect(() => {
    setSelectedNpcId(null);
    setActiveOptionId(null);
  }, [currentLocation.id]);

  const availableNpcs = useMemo(
    () => assignments.filter((assignment) => isNpcAvailableAtLocation(assignment, currentLocation)),
    [assignments, currentLocation],
  );

  const selectedNpc = availableNpcs.find((npc) => npc.assignmentId === selectedNpcId) || null;
  const selectedOption = selectedNpc?.dialogueOptions.find((option) => option.id === activeOptionId) || null;
  const selectedRelationship = useMemo(() => {
    if (!selectedNpc) return null;
    return getNpcRelationship(
      `persistent-npc:${selectedNpc.npcId}`,
      selectedNpc.name,
      selectedNpc.roleInCase || selectedNpc.profession,
    );
  }, [selectedNpc, relationshipRevision]);

  if (isLoading || availableNpcs.length === 0) return null;

  const openConversation = (npc: PersistentNpcAssignment) => {
    sound.playClick();
    setSelectedNpcId(npc.assignmentId);
    setActiveOptionId(null);
  };

  const closeConversation = () => {
    sound.playClick();
    setSelectedNpcId(null);
    setActiveOptionId(null);
  };

  const askNpc = (npc: PersistentNpcAssignment, option: DialogueOption) => {
    const alreadyAsked = activeState.askedDialogueIds.includes(option.id);
    setActiveOptionId(option.id);

    if (alreadyAsked) {
      sound.playPaper();
      return;
    }

    const character = toCharacter(npc);
    const deltas = relationshipDeltaFromDialogue(option);
    recordNpcInteraction({
      npcKey: character.id,
      name: npc.name,
      role: npc.roleInCase || npc.profession,
      caseId: currentCase.id,
      memory: `No caso ${currentCase.code}, você perguntou: “${option.question}”`,
      ...deltas,
    });
    setRelationshipRevision((current) => current + 1);
    onAskQuestion(character, option);
  };

  const revealedClue = selectedOption?.revealsClueId
    ? currentCase.availableClues.find((clue) => clue.id === selectedOption.revealsClueId) || null
    : null;
  const unlockedLocation = selectedOption?.unlocksLocationId
    ? currentCase.locations.find((location) => location.id === selectedOption.unlocksLocationId) || null
    : null;

  return (
    <>
      <section className="mb-5 overflow-hidden rounded-2xl border border-[#C5A059]/30 bg-gradient-to-br from-[#181719] to-[#0E0E10] shadow-xl">
        <div className="flex flex-col gap-3 border-b border-[#2A2A2E] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059]">
              <UserRoundSearch size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-[#F0ECE2] sm:text-base">Profissionais vinculados ao caso</h3>
                <span className="rounded-full border border-[#C5A059]/25 bg-[#C5A059]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#D5B874]">
                  NPC persistente
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#8F8A82]">
                Esses personagens lembram de interações anteriores e a relação profissional continua entre casos.
              </p>
            </div>
          </div>

          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8F8A82]">
            {availableNpcs.length} {availableNpcs.length === 1 ? 'profissional disponível' : 'profissionais disponíveis'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
          {availableNpcs.map((npc) => {
            const interactionCount = npc.dialogueOptions.filter((option) =>
              activeState.askedDialogueIds.includes(option.id),
            ).length;
            const relationship = getNpcRelationship(
              `persistent-npc:${npc.npcId}`,
              npc.name,
              npc.roleInCase || npc.profession,
            );

            return (
              <article
                key={npc.assignmentId}
                className="group flex min-h-[190px] flex-col justify-between overflow-hidden rounded-xl border border-[#2A2A2E] bg-[#121214] shadow-lg transition hover:border-[#C5A059]/45 hover:bg-[#161618]"
              >
                <div className="flex min-w-0 gap-3 p-4">
                  <div className="relative flex h-24 w-20 shrink-0 items-end justify-center overflow-hidden rounded-xl border border-[#2E2D31] bg-[#0C0C0D]">
                    <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-[#C5A059]/45">
                      {npc.name.charAt(0)}
                    </span>
                    <img
                      src={npc.portraitSrc}
                      alt={npc.name}
                      className="relative z-10 max-h-full w-full object-contain object-bottom"
                      draggable={false}
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#C5A059]">
                      {npc.roleInCase}
                    </span>
                    <h4 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-[#ECE8DE]">
                      {npc.name}
                    </h4>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#9B968E]">
                      {npc.profession}{npc.specialization ? ` • ${npc.specialization}` : ''}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-md border border-[#C5A059]/20 bg-[#C5A059]/[0.07] px-2 py-1 text-[9px] font-bold text-[#CDBA8B]">
                      <HeartHandshake size={11} /> {getRelationshipLabel(relationship)} • confiança {relationship.trust}
                    </span>
                    {interactionCount > 0 && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-[#34D399]/20 bg-[#34D399]/10 px-2 py-1 font-mono text-[9px] font-bold text-[#6EE7B7]">
                        <CheckCircle2 size={11} /> {interactionCount} interação(ões) neste caso
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#242428] p-3">
                  <button
                    type="button"
                    onClick={() => openConversation(npc)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C5A059] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A0A0B] transition hover:bg-[#D6B66F] active:scale-[0.99]"
                  >
                    <MessageCircleMore size={15} />
                    Conversar
                    <ArrowRight size={13} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selectedNpc && (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#070708]/95 p-3 backdrop-blur-md sm:p-6">
          <div className="mx-auto flex min-h-full w-full max-w-6xl items-center justify-center py-3">
            <div className="relative grid w-full overflow-hidden rounded-2xl border border-[#C5A059]/30 bg-[#111113] shadow-2xl lg:grid-cols-[0.78fr_1.22fr]">
              <button
                type="button"
                onClick={closeConversation}
                className="absolute right-3 top-3 z-30 rounded-lg border border-[#343238] bg-[#111113]/90 p-2 text-[#918C84] transition hover:border-[#C5A059]/40 hover:text-[#ECE8DE]"
                aria-label="Fechar conversa"
              >
                <X size={18} />
              </button>

              <div className="relative flex min-h-[310px] items-end justify-center overflow-hidden border-b border-[#2A2A2E] bg-[radial-gradient(circle_at_50%_35%,rgba(197,160,89,0.14),transparent_38%),linear-gradient(155deg,#1A191B,#09090A)] lg:min-h-[640px] lg:border-b-0 lg:border-r">
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0B0B0C] via-transparent to-transparent" />
                <span className="absolute text-7xl font-black text-[#C5A059]/10">{selectedNpc.name.charAt(0)}</span>
                <img
                  src={selectedNpc.portraitSrc}
                  alt={selectedNpc.name}
                  className="relative z-10 max-h-[300px] w-auto max-w-[88%] object-contain object-bottom drop-shadow-[0_28px_45px_rgba(0,0,0,0.55)] lg:max-h-[610px]"
                  draggable={false}
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/85 to-transparent px-5 pb-5 pt-14">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C5A059]">{selectedNpc.roleInCase}</span>
                  <h2 className="mt-1 font-serif text-xl font-black text-[#F1EEE6] sm:text-2xl">{selectedNpc.name}</h2>
                  <p className="mt-1 text-xs text-[#A8A197]">
                    {selectedNpc.profession}{selectedNpc.specialization ? ` • ${selectedNpc.specialization}` : ''}
                  </p>
                  {selectedNpc.jurisdiction && (
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-[#77726C]">{selectedNpc.jurisdiction}</p>
                  )}
                  {selectedRelationship && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#C5A059]/25 bg-[#C5A059]/10 px-2.5 py-1 text-[9px] font-bold text-[#D8C493]">{getRelationshipLabel(selectedRelationship)}</span>
                      <span className="rounded-full border border-[#2F2E32] bg-[#111113]/80 px-2.5 py-1 font-mono text-[9px] text-[#A39D94]">Confiança {selectedRelationship.trust} • Respeito {selectedRelationship.respect}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-h-[520px] flex-col bg-[#111113]">
                <div className="border-b border-[#2A2A2E] px-5 pb-4 pt-12 sm:px-7 sm:pt-7">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#8D877D]">
                    <MessageCircleMore size={13} className="text-[#C5A059]" />
                    Conversa profissional • {currentLocation.name}
                  </div>
                  <div className="mt-3 rounded-xl border border-[#2A2A2E] bg-[#0C0C0D] p-4 text-sm italic leading-7 text-[#D6D0C6]">
                    “{selectedOption?.answer || selectedNpc.initialDialogue}”
                  </div>

                  {(revealedClue || unlockedLocation) && (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {revealedClue && (
                        <div className="flex items-start gap-2 rounded-lg border border-[#34D399]/25 bg-[#34D399]/10 p-3 text-[11px] text-[#A7F3D0]">
                          <Sparkles size={15} className="mt-0.5 shrink-0" />
                          <span><strong>Pista:</strong> {revealedClue.title}</span>
                        </div>
                      )}
                      {unlockedLocation && (
                        <div className="flex items-start gap-2 rounded-lg border border-[#60A5FA]/25 bg-[#60A5FA]/10 p-3 text-[11px] text-[#BFDBFE]">
                          <MapPinPlus size={15} className="mt-0.5 shrink-0" />
                          <span><strong>Nova diligência:</strong> {unlockedLocation.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-7">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#AAA49B]">
                      <Search size={13} className="text-[#C5A059]" />
                      O que perguntar
                    </span>
                    <span className="font-mono text-[9px] text-[#6E6963]">
                      {selectedNpc.dialogueOptions.length} opções
                    </span>
                  </div>

                  {selectedNpc.dialogueOptions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#343238] bg-[#0C0C0D] p-5 text-center text-xs leading-relaxed text-[#77726C]">
                      Este NPC está corretamente vinculado ao local, mas ainda não possui opções de conversa configuradas no Admin.
                    </div>
                  ) : (
                    selectedNpc.dialogueOptions.map((option) => {
                      const alreadyAsked = activeState.askedDialogueIds.includes(option.id);
                      const isActive = activeOptionId === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => askNpc(selectedNpc, option)}
                          className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition ${
                            isActive
                              ? 'border-[#C5A059] bg-[#C5A059]/10'
                              : alreadyAsked
                                ? 'border-[#28272A] bg-[#0E0E10] hover:border-[#3A383D]'
                                : 'border-[#2A2A2E] bg-[#161618] hover:border-[#C5A059]/45 hover:bg-[#1A1A1D]'
                          }`}
                        >
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className="mt-0.5 font-black text-[#C5A059]">▶</span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold leading-relaxed text-[#E6E1D8] sm:text-sm">{option.question}</p>
                              {alreadyAsked && (
                                <span className="mt-1.5 inline-flex items-center gap-1 font-mono text-[9px] font-bold text-[#6EE7B7]">
                                  <CheckCircle2 size={11} /> Rever sem novo custo de tempo
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="flex shrink-0 items-center gap-1 font-mono text-[9px] text-[#827C74]">
                            <Clock size={11} className="text-[#C5A059]" />
                            {alreadyAsked ? 'revisão' : `+${option.timeCostMinutes} min`}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-[#2A2A2E] bg-[#0C0C0D] px-5 py-3 text-[10px] leading-relaxed text-[#706B65] sm:px-7">
                  {selectedRelationship && selectedRelationship.memories.length > 0
                    ? `Este NPC lembra de ${selectedRelationship.memories.length} interação(ões) relevante(s) com você. A relação profissional continuará sendo usada quando ele aparecer em outros casos.`
                    : 'Este NPC ainda está formando uma impressão profissional sobre você. As próximas interações ficarão registradas para aparições futuras.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};