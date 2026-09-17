import React, { useEffect, useMemo, useState } from 'react';
import { LegalCase, ActiveCaseState, Character, SearchableSpot, DialogueOption } from '../types/game';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  HelpCircle,
  Map,
  MessageSquare,
  Search,
  Users,
  X,
} from 'lucide-react';
import { sound } from '../utils/sound';
import { CharacterPortrait } from './CharacterPortrait';
import { PersistentNpcDiligence } from './PersistentNpcDiligence';
import styles from './LocationScene.module.css';

interface LocationSceneProps {
  currentCase: LegalCase;
  activeState: ActiveCaseState;
  onAskQuestion: (character: Character, option: DialogueOption) => void;
  onInspectSpot: (spot: SearchableSpot) => void;
  onBackToMap: () => void;
  onOpenDossier: () => void;
}

type VisualCharacter = Character & {
  portraitSrc?: string;
  portraitStoragePath?: string;
  portraitGeneratedAt?: string;
  appearanceProfile?: Record<string, string>;
};

function asVisualCharacter(character: Character): VisualCharacter {
  return character as VisualCharacter;
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
  const [professionalsOpen, setProfessionalsOpen] = useState(false);

  useEffect(() => {
    setSelectedCharacterId(currentLocation.characters[0]?.id || '');
    setActiveSpeech(null);
    setSelectedSpotForReview(null);
    setActiveTab('dialogos');
  }, [currentLocation.id]);

  const selectedCharacter = currentLocation.characters.find((character) => character.id === selectedCharacterId) || currentLocation.characters[0];
  const selectedVisualCharacter = selectedCharacter ? asVisualCharacter(selectedCharacter) : null;
  const reviewedClue = selectedSpotForReview?.foundClueId
    ? currentCase.availableClues.find((clue) => clue.id === selectedSpotForReview.foundClueId) || null
    : null;
  const hoursLeft = Math.max(0, currentCase.deadlineHours - activeState.hoursSpent);
  const inspectedCount = currentLocation.searchables.filter((spot) => activeState.inspectedSpotIds.includes(spot.id)).length;

  const handleSpotAction = (spot: SearchableSpot) => {
    const wasAlreadyInspected = activeState.inspectedSpotIds.includes(spot.id);
    sound.playPaper();
    if (!wasAlreadyInspected) onInspectSpot(spot);
    setSelectedSpotForReview(spot);
  };

  const locationAccent = useMemo(() => ({
    tribunal: '#e6c97f',
    delegacia: '#78a6cc',
    residencia: '#b8a995',
    empresa: '#c89c70',
    banco: '#77b68e',
    cartorio: '#b795d0',
    escritorio: '#d8b45b',
  }[currentLocation.category] || '#c5a059'), [currentLocation.category]);

  return (
    <section
      className={styles.scene}
      data-category={currentLocation.category}
      style={{ '--location-accent': locationAccent } as React.CSSProperties}
    >
      <div className={styles.ambient} aria-hidden="true">
        <div className={styles.ambientGrid} />
        <div className={styles.ambientGlow} />
        <div className={styles.ambientLabel}>{currentLocation.name}</div>
      </div>

      <header className={styles.topHud}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => {
            sound.playTravel();
            onBackToMap();
          }}
        >
          <ArrowLeft size={17} />
          <span>Mapa</span>
        </button>

        <div className={styles.locationIdentity}>
          <small>DILIGÊNCIA EM ANDAMENTO • {currentCase.code}</small>
          <strong>{currentLocation.name}</strong>
          <span>{currentLocation.address}</span>
        </div>

        <div className={styles.caseIdentity}>
          <small>{currentCase.area}</small>
          <strong>{currentCase.title}</strong>
        </div>

        <div className={`${styles.deadline} ${hoursLeft <= 8 ? styles.deadlineCritical : ''}`}>
          <Clock size={17} />
          <span>
            <small>PRAZO RESTANTE</small>
            <strong>{hoursLeft.toFixed(hoursLeft % 1 ? 1 : 0)}h</strong>
          </span>
        </div>

        <button type="button" className={styles.dossierButton} onClick={onOpenDossier}>
          <FileText size={16} />
          Autos
        </button>
      </header>

      <main className={styles.stage}>
        {activeTab === 'dialogos' ? (
          <div className={styles.dialogueStage}>
            <div className={styles.characterStage}>
              {currentLocation.characters.length > 1 && (
                <div className={styles.characterSelector}>
                  {currentLocation.characters.map((character) => (
                    <button
                      type="button"
                      key={character.id}
                      className={selectedCharacter?.id === character.id ? styles.characterSelectorActive : ''}
                      onClick={() => {
                        sound.playClick();
                        setSelectedCharacterId(character.id);
                        setActiveSpeech(null);
                      }}
                    >
                      <span>{character.name.charAt(0)}</span>
                      <small>{character.name}</small>
                    </button>
                  ))}
                </div>
              )}

              {selectedCharacter && selectedVisualCharacter ? (
                <>
                  <div className={styles.portraitHalo} />
                  <CharacterPortrait
                    name={selectedCharacter.name}
                    src={selectedVisualCharacter.portraitSrc}
                    avatarBg={selectedCharacter.avatarBg}
                    variant="conversation"
                    className={styles.heroPortrait}
                  />
                  <div className={styles.characterNameplate}>
                    <span>PERSONAGEM DESTE CASO</span>
                    <h2>{selectedCharacter.name}</h2>
                    <p>{selectedCharacter.role}</p>
                  </div>
                </>
              ) : (
                <div className={styles.emptyCharacter}>Nenhum personagem disponível neste local.</div>
              )}
            </div>

            <div className={styles.dialoguePanel}>
              <div className={styles.speechBlock}>
                <span><MessageSquare size={14} /> CONVERSA</span>
                <blockquote>“{activeSpeech || selectedCharacter?.initialDialogue || 'Nenhum depoimento disponível.'}”</blockquote>
              </div>

              <div className={styles.questionsHeader}>
                <span><HelpCircle size={14} /> O QUE PERGUNTAR</span>
                <button type="button" onClick={() => setProfessionalsOpen(true)}>
                  <Users size={14} /> Profissionais vinculados
                </button>
              </div>

              <div className={styles.questionsList}>
                {selectedCharacter?.dialogueOptions.map((option) => {
                  const isAsked = activeState.askedDialogueIds.includes(option.id);
                  return (
                    <button
                      type="button"
                      key={option.id}
                      className={isAsked ? styles.questionAsked : styles.questionButton}
                      onClick={() => {
                        setActiveSpeech(option.answer);
                        if (isAsked) {
                          sound.playPaper();
                          return;
                        }
                        onAskQuestion(selectedCharacter, option);
                      }}
                    >
                      <span className={styles.questionArrow}>▶</span>
                      <span className={styles.questionCopy}>
                        <strong>{option.question}</strong>
                        {isAsked && <small><CheckCircle2 size={11} /> resposta já obtida • rever sem custo</small>}
                      </span>
                      <span className={styles.questionTime}><Clock size={12} /> {isAsked ? 'revisão' : `+${option.timeCostMinutes} min`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.evidenceStage}>
            <header>
              <div>
                <span>PERÍCIA E EXAME DOCUMENTAL</span>
                <h2>{currentLocation.name}</h2>
                <p>{currentLocation.description}</p>
              </div>
              <strong>{inspectedCount}/{currentLocation.searchables.length} examinados</strong>
            </header>

            <div className={styles.evidenceGrid}>
              {currentLocation.searchables.map((spot) => {
                const isInspected = activeState.inspectedSpotIds.includes(spot.id);
                return (
                  <article key={spot.id} className={isInspected ? styles.evidenceDone : styles.evidenceCard}>
                    <div className={styles.evidenceIcon}><FileText size={20} /></div>
                    <div>
                      <span>{isInspected ? 'EXAMINADO' : 'PONTO DE ANÁLISE'}</span>
                      <h3>{spot.name}</h3>
                      <p>{spot.description}</p>
                      {isInspected && <em>{spot.inspectedMessage}</em>}
                    </div>
                    <footer>
                      <small><Clock size={12} /> {isInspected ? 'sem novo custo' : `+${spot.timeCostMinutes} min`}</small>
                      <button type="button" onClick={() => handleSpotAction(spot)}>
                        {isInspected ? <Eye size={14} /> : <Search size={14} />}
                        {isInspected ? 'Rever' : 'Examinar'}
                      </button>
                    </footer>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <footer className={styles.bottomDock}>
        <div className={styles.locationSummary}>
          <span>{currentLocation.category}</span>
          <strong>{currentLocation.description}</strong>
        </div>

        <div className={styles.dockActions}>
          <button type="button" className={activeTab === 'dialogos' ? styles.dockActive : ''} onClick={() => setActiveTab('dialogos')}>
            <MessageSquare size={19} /><span>Conversas</span>
          </button>
          <button type="button" className={activeTab === 'pericia' ? styles.dockActive : ''} onClick={() => setActiveTab('pericia')}>
            <Search size={19} /><span>Perícia ({currentLocation.searchables.length})</span>
          </button>
          <button type="button" onClick={onOpenDossier}>
            <FileText size={19} /><span>Autos</span>
          </button>
          <button type="button" onClick={onBackToMap}>
            <Map size={19} /><span>Voltar ao mapa</span>
          </button>
        </div>
      </footer>

      {professionalsOpen && (
        <div className={styles.drawerBackdrop} onMouseDown={() => setProfessionalsOpen(false)}>
          <aside className={styles.professionalsDrawer} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>REDE PROFISSIONAL</span>
                <h2>Profissionais vinculados ao caso</h2>
              </div>
              <button type="button" onClick={() => setProfessionalsOpen(false)}><X size={18} /></button>
            </header>
            <div className={styles.professionalsContent}>
              <PersistentNpcDiligence
                currentCase={currentCase}
                currentLocation={currentLocation}
                activeState={activeState}
                onAskQuestion={onAskQuestion}
              />
            </div>
          </aside>
        </div>
      )}

      {selectedSpotForReview && (
        <div className={styles.reviewBackdrop} onMouseDown={() => setSelectedSpotForReview(null)}>
          <section className={styles.reviewModal} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>REVISÃO DA EVIDÊNCIA</span>
                <h3>{selectedSpotForReview.name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedSpotForReview(null)}><X size={18} /></button>
            </header>
            <div className={styles.reviewContent}>
              <article>
                <span>CONSTATAÇÃO</span>
                <p>{selectedSpotForReview.inspectedMessage}</p>
              </article>
              {reviewedClue && (
                <article>
                  <span>PISTA OBTIDA</span>
                  <h4>{reviewedClue.title}</h4>
                  <p>{reviewedClue.fullDetail}</p>
                  <small>{reviewedClue.type.replace('_', ' ')}</small>
                </article>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
};
