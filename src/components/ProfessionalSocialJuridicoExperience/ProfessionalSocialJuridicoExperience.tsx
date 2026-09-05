import React, { useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileSignature,
  FolderKanban,
  Home,
  Laptop,
  Loader2,
  Send,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { GAME_CASES } from '../../data/cases';
import { getAvailableCasesForCareer, getCareerRank } from '../../lib/caseRules';
import {
  loadActiveSocialJuridicoFeatures,
  type SocialJuridicoFeature,
  type SocialJuridicoFeatureId,
} from '../../lib/socialJuridicoRepository';
import { usePlayerDisplayName } from '../../lib/playerTreatment';
import type { ActiveCaseState, LegalCase, PlayerProfile, SocialJuridicoToolUse } from '../../types/game';
import { sound } from '../../utils/sound';
import styles from './ProfessionalSocialJuridicoExperience.module.css';

const OPEN_SOCIAL_JURIDICO_EVENT = 'rota:open-social-juridico';
const PLAYER_SAVE_KEY = 'rota_da_justica_save_v1';

type NotebookTab = 'HOME' | 'CRM' | 'TOOLS';

const DEFAULT_MECHANICS: Record<SocialJuridicoFeatureId, { scoreBonus: number; timeCostHours: number }> = {
  sj_evidence_shield: { scoreBonus: 2, timeCostHours: 0 },
  sj_digital_signature: { scoreBonus: 3, timeCostHours: 0 },
  sj_extrajudicial_notice: { scoreBonus: 3, timeCostHours: 1 },
  sj_crm: { scoreBonus: 2, timeCostHours: 0 },
};

interface ProfessionalSocialJuridicoExperienceProps {
  player: PlayerProfile;
  currentCase: LegalCase | null;
  onUseTool: (tool: SocialJuridicoToolUse) => void;
}

function numberFromConfig(feature: SocialJuridicoFeature, key: 'scoreBonus' | 'timeCostHours') {
  const raw = feature.config[key];
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0
    ? raw
    : DEFAULT_MECHANICS[feature.id][key];
}

function FeatureIcon({ id }: { id: SocialJuridicoFeatureId }) {
  if (id === 'sj_evidence_shield') return <ShieldCheck size={21} />;
  if (id === 'sj_digital_signature') return <FileSignature size={21} />;
  if (id === 'sj_extrajudicial_notice') return <Send size={21} />;
  return <Users size={21} />;
}

function buildAssignedCase(player: PlayerProfile) {
  if (player.activeCase) return null;
  const lawyerRank = getCareerRank('ADVOGADO_CONTRATADO');
  const currentRank = getCareerRank(player.careerTier);
  const completed = new Set(
    player.history.filter((record) => record.success).map((record) => record.caseId),
  );

  return getAvailableCasesForCareer(GAME_CASES, player.careerTier).find((caseItem) => {
    const minRank = getCareerRank(caseItem.minCareerTier);
    return minRank >= lawyerRank && minRank <= currentRank && !completed.has(caseItem.id);
  }) || null;
}

function startCaseFromCrm(player: PlayerProfile, caseItem: LegalCase) {
  const activeCase: ActiveCaseState = {
    caseId: caseItem.id,
    hoursSpent: 0,
    currentLocationId: caseItem.locations[0]?.id || 'LOC_ESCRITORIO_RAMOS',
    discoveredClueIds: [],
    unlockedLocationIds: caseItem.locations.filter((location) => location.unlockedByDefault).map((location) => location.id),
    askedDialogueIds: [],
    inspectedSpotIds: [],
    logs: [
      {
        id: `log-crm-${Date.now()}`,
        timestampGameHours: 0,
        message: `Caso disponibilizado no CRM por Mariana Duarte, por determinação do Dr. Roberto Ramos: ${caseItem.title}`,
        type: 'alerta',
      },
    ],
    selectedStrategyId: null,
    selectedEvidenceIds: [],
    socialJuridicoActions: [],
  };

  try {
    const raw = window.localStorage.getItem(PLAYER_SAVE_KEY);
    const current = raw ? (JSON.parse(raw) as PlayerProfile) : player;
    window.localStorage.setItem(PLAYER_SAVE_KEY, JSON.stringify({ ...current, activeCase }));
    return true;
  } catch {
    return false;
  }
}

export const ProfessionalSocialJuridicoExperience: React.FC<ProfessionalSocialJuridicoExperienceProps> = ({
  player,
  currentCase,
  onUseTool,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<NotebookTab>('HOME');
  const [features, setFeatures] = useState<SocialJuridicoFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const displayName = usePlayerDisplayName(player, 'Advogado');
  const activeState = player.activeCase;
  const actions = activeState?.socialJuridicoActions || [];
  const assignedCase = useMemo(() => buildAssignedCase(player), [player]);
  const crmFeature = features.find((feature) => feature.id === 'sj_crm') || null;

  const discoveredClues = useMemo(() => {
    if (!activeState || !currentCase) return [];
    const ids = new Set(activeState.discoveredClueIds);
    return currentCase.availableClues.filter((clue) => ids.has(clue.id));
  }, [activeState, currentCase]);

  useEffect(() => {
    const openFromGame = () => {
      sound.playClick();
      setTab('HOME');
      setIsOpen(true);
    };
    window.addEventListener(OPEN_SOCIAL_JURIDICO_EVENT, openFromGame);
    return () => window.removeEventListener(OPEN_SOCIAL_JURIDICO_EVENT, openFromGame);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoading(true);
    setError('');
    loadActiveSocialJuridicoFeatures()
      .then((loaded) => {
        if (active) setFeatures(loaded);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível sincronizar o Social Jurídico.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const close = () => {
    sound.playClick();
    setIsOpen(false);
  };

  const acceptAssignedCase = () => {
    if (!assignedCase || activeState || !crmFeature) return;
    sound.playPaper();
    setAssignmentError('');
    if (!startCaseFromCrm(player, assignedCase)) {
      setAssignmentError('Não foi possível registrar o caso no save local. Tente novamente.');
      return;
    }
    window.location.reload();
  };

  const useOnce = (feature: SocialJuridicoFeature, label: string) => {
    if (!activeState || actions.some((action) => action.featureId === feature.id)) return;
    sound.playPaper();
    onUseTool({
      featureId: feature.id,
      label,
      scoreBonus: numberFromConfig(feature, 'scoreBonus'),
      timeCostHours: numberFromConfig(feature, 'timeCostHours'),
    });
  };

  const renderToolAction = (feature: SocialJuridicoFeature) => {
    if (!activeState || !currentCase) {
      return <p className={styles.toolHint}>A ferramenta ficará disponível quando houver um caso ativo no CRM.</p>;
    }

    if (feature.id === 'sj_evidence_shield') {
      if (discoveredClues.length === 0) {
        return <p className={styles.toolHint}>Descubra uma prova ou pista no caso antes de iniciar a blindagem.</p>;
      }

      return (
        <div className={styles.evidenceList}>
          {discoveredClues.map((clue) => {
            const protectedAlready = actions.some(
              (action) => action.featureId === feature.id && action.targetId === clue.id,
            );
            return (
              <div key={clue.id} className={styles.evidenceRow}>
                <div>
                  <strong>{clue.title}</strong>
                  <span>{clue.relevance}</span>
                </div>
                <button
                  type="button"
                  disabled={protectedAlready}
                  onClick={() => {
                    if (protectedAlready) return;
                    sound.playPaper();
                    onUseTool({
                      featureId: feature.id,
                      targetId: clue.id,
                      label: `Prova blindada: ${clue.title}`,
                      scoreBonus: numberFromConfig(feature, 'scoreBonus'),
                      timeCostHours: numberFromConfig(feature, 'timeCostHours'),
                    });
                  }}
                >
                  {protectedAlready ? 'Blindada ✓' : 'Blindar prova'}
                </button>
              </div>
            );
          })}
        </div>
      );
    }

    const alreadyUsed = actions.some((action) => action.featureId === feature.id);
    const labels: Partial<Record<SocialJuridicoFeatureId, string>> = {
      sj_digital_signature: 'Dossiê formalizado com assinatura digital',
      sj_extrajudicial_notice: 'Notificação extrajudicial enviada ao caso',
    };
    const buttonLabels: Partial<Record<SocialJuridicoFeatureId, string>> = {
      sj_digital_signature: 'Assinar documento',
      sj_extrajudicial_notice: 'Enviar notificação',
    };
    const timeCost = numberFromConfig(feature, 'timeCostHours');

    return (
      <div className={styles.toolAction}>
        <span>{timeCost > 0 ? <><Clock3 size={11} /> Consome {timeCost}h do prazo</> : 'Ação digital sem deslocamento.'}</span>
        <button
          type="button"
          disabled={alreadyUsed}
          onClick={() => useOnce(feature, labels[feature.id] || feature.name)}
        >
          {alreadyUsed ? 'Concluído ✓' : buttonLabels[feature.id] || 'Utilizar ferramenta'}
        </button>
      </div>
    );
  };

  const toolFeatures = features.filter((feature) => feature.id !== 'sj_crm');

  return (
    <div className={styles.backdrop}>
      <section className={styles.notebook} role="dialog" aria-modal="true" aria-label="Notebook Social Jurídico">
        <div className={styles.screenBezel}>
          <header className={styles.header}>
            <div className={styles.brand}>
              <div className={styles.logo}><Laptop size={21} /></div>
              <div>
                <span>Ramos & Associados • Enterprise</span>
                <h2>Social Jurídico In-Game</h2>
                <p>{displayName}</p>
              </div>
            </div>
            <button type="button" onClick={close} aria-label="Fechar notebook"><X size={18} /></button>
          </header>

          <div className={styles.workspace}>
            <aside className={styles.sidebar}>
              <div className={styles.workspaceIdentity}>
                <BriefcaseBusiness size={18} />
                <div><span>Workspace</span><strong>Ramos & Associados</strong></div>
              </div>
              <nav>
                <button type="button" className={tab === 'HOME' ? styles.activeNav : ''} onClick={() => setTab('HOME')}><Home size={16} /> Início</button>
                <button type="button" className={tab === 'CRM' ? styles.activeNav : ''} onClick={() => setTab('CRM')}><FolderKanban size={16} /> CRM Jurídico{(assignedCase || activeState) && <i />}</button>
                <button type="button" className={tab === 'TOOLS' ? styles.activeNav : ''} onClick={() => setTab('TOOLS')}><Wrench size={16} /> Ferramentas</button>
              </nav>
              <div className={styles.enterpriseMark}>
                <ShieldCheck size={15} />
                <div><span>Plano do escritório</span><strong>Enterprise</strong></div>
              </div>
            </aside>

            <main className={styles.content}>
              {isLoading && (
                <div className={styles.loading}><Loader2 size={28} /><p>Sincronizando módulos publicados no Rota Admin...</p></div>
              )}

              {!isLoading && error && <div className={styles.error}>{error}</div>}

              {!isLoading && !error && tab === 'HOME' && (
                <div className={styles.homeView}>
                  <div className={styles.viewHeading}>
                    <span>Visão profissional</span>
                    <h3>Bom expediente, {displayName}.</h3>
                    <p>O Social Jurídico é o ambiente oficial de trabalho do Ramos & Associados. Acompanhe seu atendimento no CRM e utilize os módulos liberados pela administração.</p>
                  </div>

                  <div className={styles.metrics}>
                    <div><FolderKanban size={18} /><span>Casos ativos</span><strong>{activeState ? 1 : 0}</strong></div>
                    <div><UserRound size={18} /><span>Cliente atual</span><strong>{currentCase?.client.name || 'Aguardando'}</strong></div>
                    <div><Clock3 size={18} /><span>Prazo usado</span><strong>{activeState && currentCase ? `${activeState.hoursSpent}h / ${currentCase.deadlineHours}h` : '—'}</strong></div>
                    <div><Wrench size={18} /><span>Módulos ativos</span><strong>{features.length}</strong></div>
                  </div>

                  <div className={styles.homeGrid}>
                    <button type="button" onClick={() => setTab('CRM')} className={styles.homeCrmCard}>
                      <FolderKanban size={24} />
                      <div>
                        <span>CRM Jurídico</span>
                        <strong>{activeState ? 'Caso em andamento' : assignedCase ? 'Novo caso atribuído' : 'Sem nova atribuição'}</strong>
                        <p>{activeState ? currentCase?.title : assignedCase ? `${assignedCase.client.name} • ${assignedCase.area}` : 'Aguarde o Dr. Roberto distribuir um novo atendimento.'}</p>
                      </div>
                    </button>
                    <button type="button" onClick={() => setTab('TOOLS')} className={styles.homeToolsCard}>
                      <Wrench size={24} />
                      <div><span>Ferramentas jurídicas</span><strong>{toolFeatures.length} módulo(s) publicado(s)</strong><p>Assinatura, blindagem de provas, notificações e outros recursos ficam vinculados ao caso ativo.</p></div>
                    </button>
                  </div>
                </div>
              )}

              {!isLoading && !error && tab === 'CRM' && (
                <div className={styles.crmView}>
                  <div className={styles.viewHeading}>
                    <span>CRM Jurídico • Ramos & Associados</span>
                    <h3>Meus atendimentos</h3>
                    <p>O Dr. Roberto define a distribuição e Mariana Duarte disponibiliza o caso no CRM. Nesta etapa da carreira, apenas um caso fica ativo por vez.</p>
                  </div>

                  {!crmFeature && (
                    <div className={styles.moduleUnavailable}><ShieldCheck size={20} /><div><strong>CRM temporariamente indisponível</strong><p>O módulo não está publicado e ativo no Rota Admin. O escritório não pode disponibilizar novos casos até a reativação.</p></div></div>
                  )}

                  {crmFeature && activeState && currentCase && (
                    <article className={styles.crmCaseCard}>
                      <div className={styles.crmCaseTop}>
                        <div><span className={styles.caseCode}>{currentCase.code}</span><span className={styles.activeStatus}>Em andamento</span></div>
                        <small>Responsável: {displayName}</small>
                      </div>
                      <h4>{currentCase.title}</h4>
                      <p>{currentCase.client.summary}</p>
                      <div className={styles.caseFacts}>
                        <div><span>Cliente</span><strong>{currentCase.client.name}</strong></div>
                        <div><span>Área</span><strong>{currentCase.area}</strong></div>
                        <div><span>Prazo</span><strong>{activeState.hoursSpent}h / {currentCase.deadlineHours}h</strong></div>
                        <div><span>Supervisor</span><strong>Dr. Roberto Ramos</strong></div>
                      </div>
                      <div className={styles.assignmentNote}><CheckCircle2 size={15} /> Disponibilizado por Mariana Duarte • determinação do Dr. Roberto Ramos</div>
                      <p className={styles.resumeHint}>Para retomar diligências externas, feche o notebook e utilize “Continuar diligências” no ambiente do escritório.</p>
                    </article>
                  )}

                  {crmFeature && !activeState && assignedCase && (
                    <article className={styles.crmCaseCard}>
                      <div className={styles.crmCaseTop}>
                        <div><span className={styles.caseCode}>{assignedCase.code}</span><span className={styles.newStatus}>Novo caso</span></div>
                        <small>Atribuído hoje no CRM</small>
                      </div>
                      <h4>{assignedCase.title}</h4>
                      <p>{assignedCase.client.summary}</p>
                      <div className={styles.caseFacts}>
                        <div><span>Cliente</span><strong>{assignedCase.client.name}</strong></div>
                        <div><span>Área</span><strong>{assignedCase.area}</strong></div>
                        <div><span>Complexidade</span><strong>{assignedCase.difficulty}</strong></div>
                        <div><span>Supervisor</span><strong>Dr. Roberto Ramos</strong></div>
                      </div>
                      <div className={styles.assignmentNote}><CheckCircle2 size={15} /> Mariana Duarte adicionou este atendimento ao seu CRM por determinação do Dr. Roberto Ramos.</div>
                      {assignmentError && <div className={styles.error}>{assignmentError}</div>}
                      <button type="button" className={styles.acceptCaseButton} onClick={acceptAssignedCase}>Aceitar caso no CRM</button>
                    </article>
                  )}

                  {crmFeature && !activeState && !assignedCase && (
                    <div className={styles.emptyCrm}>
                      <FolderKanban size={32} />
                      <h4>Nenhum novo caso atribuído</h4>
                      <p>Você está sem atendimento ativo. O próximo caso aparecerá aqui após a distribuição do Dr. Roberto e o lançamento da Mariana no CRM.</p>
                    </div>
                  )}
                </div>
              )}

              {!isLoading && !error && tab === 'TOOLS' && (
                <div className={styles.toolsView}>
                  <div className={styles.viewHeading}>
                    <span>Aplicativos do workspace</span>
                    <h3>Ferramentas Social Jurídico</h3>
                    <p>Somente módulos publicados e ativos no Rota Admin aparecem aqui. As ações ficam registradas no atendimento atual.</p>
                  </div>

                  {toolFeatures.length === 0 ? (
                    <div className={styles.emptyCrm}><Wrench size={32} /><h4>Nenhuma ferramenta publicada</h4><p>O administrador ainda não liberou módulos jurídicos adicionais para este workspace.</p></div>
                  ) : (
                    <div className={styles.toolGrid}>
                      {toolFeatures.map((feature) => {
                        const featureActions = actions.filter((action) => action.featureId === feature.id);
                        return (
                          <article key={feature.id} className={styles.toolCard}>
                            <div className={styles.toolTitle}>
                              <div><FeatureIcon id={feature.id} /></div>
                              <div><h4>{feature.name}</h4><p>{feature.description}</p></div>
                            </div>
                            {renderToolAction(feature)}
                            {featureActions.length > 0 && <div className={styles.toolCompleted}><CheckCircle2 size={12} /> {featureActions.length} ação(ões) registrada(s)</div>}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
        <div className={styles.notebookBase}><span /></div>
      </section>
    </div>
  );
};
