import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Files,
  GraduationCap,
  Landmark,
  Laptop,
  Map,
  MapPin,
  Scale,
  Smartphone,
  Star,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  WalletCards,
  X,
} from 'lucide-react';
import { GAME_CASES } from '../../data/cases';
import { CAREER_TIERS } from '../../data/careers';
import { getAvailableCasesForCareer } from '../../lib/caseRules';
import {
  getTasksForTier,
  normalizeOfficePerformance,
} from '../../lib/internCareerEngine';
import { getDeclaredPlayerCity, readWorldMapProfile } from '../../lib/worldMap';
import { formatGameDate } from '../../lib/gameDate';
import { usePlayerDisplayName } from '../../lib/playerTreatment';
import { sound } from '../../utils/sound';
import { InternshipCareerPanel } from '../../components/InternshipCareerPanel';
import { OfficeHub } from '../../components/OfficeHub';
import { GameClock } from '../GameClock/GameClock';
import styles from './OfficeScene.module.css';

const OPEN_SOCIAL_JURIDICO_EVENT = 'rota:open-social-juridico';
const OFFICE_SCENE_BACKGROUND = '/fundos/escritorio.png';

const NAV_ITEMS = [
  { id: 'OFFICE', label: 'Escritório', icon: Building2 },
  { id: 'MAP', label: 'Mapa', icon: Map },
  { id: 'CASES', label: 'Casos', icon: Files },
  { id: 'AGENDA', label: 'Agenda', icon: CalendarDays },
  { id: 'FINANCE', label: 'Finanças', icon: WalletCards },
  { id: 'TEAM', label: 'Equipe', icon: Users },
  { id: 'ACHIEVEMENTS', label: 'Conquistas', icon: Trophy },
];

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getDrawerTitle(drawer) {
  switch (drawer) {
    case 'CASES': return 'Casos e oportunidades';
    case 'AGENDA': return 'Agenda e avaliação profissional';
    case 'FINANCE': return 'Finanças da carreira';
    case 'TEAM': return 'Equipe do escritório';
    case 'ACHIEVEMENTS': return 'Conquistas';
    default: return '';
  }
}

export function OfficeScene({
  player,
  onSelectCaseToView,
  onResumeActiveCase,
  onOpenCareerModal,
  onOpenAcademicModal,
  onOpenConcursoModal,
  onOpenOfficeModal,
  onOpenOabExam,
  onCompleteOfficeTask,
  onToggleSound,
  onEnableMobileFrame,
}) {
  const [drawer, setDrawer] = useState(null);
  const currentTier = CAREER_TIERS[player.careerTier] || CAREER_TIERS.ESTAGIARIO;
  const displayName = usePlayerDisplayName(player, 'Profissional');
  const activeCase = useMemo(
    () => GAME_CASES.find((caseItem) => caseItem.id === player.activeCase?.caseId) || null,
    [player.activeCase?.caseId],
  );

  const availableCases = useMemo(() => {
    const finished = new Set((player.history || []).map((record) => record.caseId));
    return getAvailableCasesForCareer(GAME_CASES, player.careerTier)
      .filter((caseItem) => !finished.has(caseItem.id));
  }, [player.careerTier, player.history]);

  const suggestedCase = activeCase || availableCases[0] || GAME_CASES[0] || null;
  const performance = normalizeOfficePerformance(player.officePerformance);
  const isIntern = player.careerTier === 'ESTAGIARIO' || player.careerTier === 'ESTAGIARIO_SENIOR';
  const stageTasks = isIntern ? getTasksForTier(player.careerTier) : [];
  const completedTaskIds = new Set(performance.completedTaskIds || []);
  const completedTasks = stageTasks.filter((task) => completedTaskIds.has(task.id)).length;

  const worldProfile = readWorldMapProfile(player);
  const declaredCity = getDeclaredPlayerCity(player);
  const cityLabel = worldProfile?.city
    ? `${worldProfile.city} • ${worldProfile.state}`
    : declaredCity.city
      ? `${declaredCity.city} • ${declaredCity.state || 'BR'}`
      : 'Brasil';

  const brandCityLabel = worldProfile?.city
    ? `${worldProfile.city}${worldProfile.state ? ` - ${worldProfile.state}` : ''}`
    : declaredCity.city
      ? `${declaredCity.city}${declaredCity.state ? ` - ${declaredCity.state}` : ''}`
      : 'Brasil';

  const gameDateLabel = formatGameDate({
    day: player.gameCurrentDay,
    month: player.gameCurrentMonth,
    year: player.gameCurrentYear,
  });

  const hoursLeft = activeCase && player.activeCase
    ? Math.max(0, activeCase.deadlineHours - player.activeCase.hoursSpent)
    : null;

  const currentLocation = 'Ramos & Associados';

  const caseProgress = activeCase && player.activeCase
    ? Math.min(100, Math.max(12, Math.round((player.activeCase.hoursSpent / Math.max(1, activeCase.deadlineHours)) * 100)))
    : 18;

  const notifications = [
    activeCase
      ? { title: 'Caso em andamento', detail: activeCase.title, age: `${hoursLeft}h restantes` }
      : { title: 'Expediente iniciado', detail: 'Nenhum caso ativo neste momento', age: 'agora' },
    performance.evaluations?.[0]
      ? { title: 'Avaliação registrada', detail: performance.evaluations[0].title, age: performance.evaluations[0].date }
      : { title: 'Avaliação profissional', detail: 'Seu desempenho está sendo acompanhado', age: 'hoje' },
    { title: 'Agenda do escritório', detail: `${completedTasks}/${stageTasks.length || 3} atividades concluídas`, age: 'hoje' },
    player.history?.[0]
      ? { title: 'Último processo concluído', detail: player.history[0].caseTitle, age: player.history[0].completedDate }
      : { title: 'Carreira em construção', detail: 'Conclua casos para formar seu histórico', age: '—' },
  ];

  const navigate = (itemId) => {
    sound.playClick();

    if (itemId === 'OFFICE') {
      setDrawer(null);
      return;
    }

    if (itemId === 'MAP') {
      if (player.activeCase) onResumeActiveCase();
      else setDrawer('CASES');
      return;
    }

    setDrawer(itemId);
  };

  const openNotebook = () => {
    sound.playClick();
    window.dispatchEvent(new CustomEvent(OPEN_SOCIAL_JURIDICO_EVENT));
  };

  const openPrimaryCase = () => {
    sound.playPaper();
    if (activeCase && player.activeCase) {
      onResumeActiveCase();
      return;
    }
    if (suggestedCase) onSelectCaseToView(suggestedCase);
  };

  return (
    <section className={styles.scene}>
      <div
        className={styles.background}
        style={{ backgroundImage: `url("${OFFICE_SCENE_BACKGROUND}")` }}
        aria-hidden="true"
      />
      <div className={styles.backgroundShade} aria-hidden="true" />

      <header className={styles.topBar}>
        <div className={styles.brand}>
          <div className={styles.brandSeal}><Scale size={31} /></div>
          <div>
            <strong>ROTA DA JUSTIÇA</strong>
            <span>{brandCityLabel} <i /> Data {gameDateLabel}</span>
          </div>
        </div>

        <div className={styles.caseStatus}>
          <GameClock
            player={player}
            hoursLeft={hoursLeft}
            caseTitle={activeCase?.title || null}
            cityLabel={cityLabel}
            worldProfile={worldProfile}
            declaredCity={declaredCity}
          />
          <div>
            <MapPin size={16} />
            <span>Local Atual:</span>
            <strong>{currentLocation}</strong>
          </div>
        </div>

        <div className={styles.topQuote}>
          <span>“Direito também se faz<br />nas decisões do dia a dia.”</span>
        </div>

        <div className={styles.cityBlock}>
          <strong>{cityLabel}</strong>
          <span>Pessoas</span>
          <span>Casos</span>
          <span>Cidade</span>
          <span>Justiça</span>
        </div>

        <div className={styles.utilityActions}>
          <button
            type="button"
            onClick={onToggleSound}
            title={player.soundEnabled ? 'Desativar áudio' : 'Ativar áudio'}
          >
            {player.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button type="button" onClick={onEnableMobileFrame} title="Modo celular">
            <Smartphone size={15} />
          </button>
        </div>
      </header>

      <aside className={styles.sidebar}>
        <div className={styles.sidebarItems}>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={id === 'OFFICE' && !drawer ? styles.navActive : styles.navItem}
              onClick={() => navigate(id)}
            >
              <Icon size={24} strokeWidth={1.55} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className={styles.sidebarSlogan}>UMA<br />CIDADE.<br />INFINITAS<br />HISTÓRIAS.</div>
      </aside>

      <main className={styles.stage}>
        <section className={styles.leftRail}>
          <article className={styles.glassPanel}>
            <div className={styles.panelHeading}>
              <span>{activeCase ? 'CASO EM ANDAMENTO' : 'PRÓXIMA OPORTUNIDADE'}</span>
              <button type="button" onClick={() => setDrawer('CASES')}>VER TODOS <ArrowRight size={13} /></button>
            </div>

            {suggestedCase ? (
              <div className={styles.caseCard}>
                <div className={styles.caseVisual}>
                  <Scale size={36} />
                  <span>{suggestedCase.code}</span>
                </div>
                <div className={styles.caseCopy}>
                  <div className={styles.caseMeta}>{suggestedCase.area}</div>
                  <h2>{suggestedCase.title}</h2>
                  <p>{suggestedCase.client.name}</p>
                  <div className={styles.caseDeadline}>
                    <CalendarDays size={14} />
                    {activeCase ? `${hoursLeft}h para o prazo` : `${suggestedCase.deadlineHours}h de prazo processual`}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhum caso disponível no momento.</div>
            )}

            <div className={styles.caseFooter}>
              <div className={styles.progressTrack}><span style={{ width: `${caseProgress}%` }} /></div>
              <strong>{caseProgress}%</strong>
              <button type="button" onClick={openPrimaryCase}>
                {activeCase ? 'CONTINUAR CASO' : 'ABRIR CASO'} <ArrowRight size={14} />
              </button>
            </div>
          </article>

          <article className={styles.glassPanel}>
            <div className={styles.panelHeading}>
              <span>TAREFAS DO DIA</span>
              <strong>{completedTasks}/{stageTasks.length || 5} concluídas</strong>
            </div>

            <div className={styles.taskList}>
              {(stageTasks.length ? stageTasks.slice(0, 5) : [
                { id: 'agenda', title: 'Revisar agenda e prazos' },
                { id: 'cliente', title: 'Retornar mensagens de clientes' },
                { id: 'processo', title: 'Analisar movimentações processuais' },
                { id: 'equipe', title: 'Reunião com a equipe' },
                { id: 'estudo', title: 'Revisar jurisprudência do dia' },
              ]).map((task, index) => {
                const done = completedTaskIds.has(task.id);
                const schedule = ['09:00', '11:00', '14:00', '16:00', '18:00'][index] || '18:00';
                return (
                  <button type="button" key={task.id} onClick={() => setDrawer('AGENDA')} className={styles.taskRow}>
                    {done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                    <span>{task.title}</span>
                    <time>{schedule}</time>
                  </button>
                );
              })}
            </div>

            <button type="button" className={styles.panelLink} onClick={() => setDrawer('AGENDA')}>
              VER AGENDA COMPLETA <ArrowRight size={13} />
            </button>
          </article>
        </section>

        <section className={styles.rightRail}>
          <article className={styles.glassPanel}>
            <div className={styles.panelHeading}>
              <span>DESEMPENHO</span>
              <button type="button" onClick={() => setDrawer('AGENDA')}>Ver mais <ArrowRight size={13} /></button>
            </div>

            <div className={styles.performanceList}>
              <div>
                <BriefcaseBusiness size={18} />
                <span>Patrimônio</span>
                <strong>R$ {formatMoney(player.money)}</strong>
              </div>
              <div>
                <Star size={18} />
                <span>Reputação</span>
                <strong>{player.reputation}/100</strong>
              </div>
              <div>
                <Award size={18} />
                <span>Ética</span>
                <div className={styles.metricBar}><i style={{ width: `${performance.ethics}%` }} /></div>
              </div>
              <div>
                <Users size={18} />
                <span>Equipe</span>
                <strong>{player.officeFinances?.employees?.length || 'Ramos'}</strong>
              </div>
            </div>
          </article>

          <article className={styles.glassPanel}>
            <div className={styles.panelHeading}>
              <span>NOTIFICAÇÕES</span>
              <Bell size={15} />
            </div>
            <div className={styles.notificationList}>
              {notifications.map((notification, index) => (
                <button
                  type="button"
                  key={`${notification.title}-${index}`}
                  onClick={() => index === 0 && activeCase ? onResumeActiveCase() : setDrawer(index === 2 ? 'AGENDA' : 'CASES')}
                >
                  <Bell size={15} />
                  <span>
                    <strong>{notification.title}</strong>
                    <small>{notification.detail}</small>
                  </span>
                  <time>{notification.age}</time>
                </button>
              ))}
            </div>
          </article>
        </section>
      </main>

      <footer className={styles.bottomDock}>
        <button type="button" className={styles.playerCard} onClick={onOpenCareerModal}>
          <span className={styles.playerMonogram}>RJ</span>
          <span>
            <strong>{displayName}</strong>
            <small>{currentTier.title}{player.oabRegistration?.code ? ` • ${player.oabRegistration.code}` : ''}</small>
          </span>
        </button>

        <div className={styles.dockActions}>
          <button type="button" onClick={() => setDrawer('CASES')}><Files size={21} /><span>VER CASOS</span></button>
          <button type="button" onClick={() => setDrawer('AGENDA')}><BookOpenCheck size={21} /><span>AVALIAÇÃO</span></button>
          <button type="button" onClick={() => setDrawer('TEAM')}><Users size={21} /><span>CHAMAR EQUIPE</span></button>
          <button type="button" onClick={openNotebook}><Laptop size={21} /><span>ABRIR NOTEBOOK</span></button>
          <button type="button" onClick={() => player.activeCase ? onResumeActiveCase() : setDrawer('CASES')}><Map size={21} /><span>IR AO MAPA</span></button>
        </div>

        <div className={styles.dockQuote}>PLANEJAMENTO<br />HOJE.<br />IMPACTO AMANHÃ.</div>
      </footer>

      {drawer && (
        <div className={styles.drawerBackdrop} onMouseDown={() => setDrawer(null)}>
          <section className={styles.drawer} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>Ramos & Associados</span>
                <h2>{getDrawerTitle(drawer)}</h2>
              </div>
              <button type="button" onClick={() => setDrawer(null)} aria-label="Fechar painel"><X size={20} /></button>
            </header>

            <div className={styles.drawerContent}>
              {drawer === 'CASES' && (
                <OfficeHub
                  player={player}
                  onSelectCaseToView={onSelectCaseToView}
                  onResumeActiveCase={onResumeActiveCase}
                  onOpenCareerModal={onOpenCareerModal}
                  onOpenAcademicModal={onOpenAcademicModal}
                  onOpenConcursoModal={onOpenConcursoModal}
                  onOpenOfficeModal={onOpenOfficeModal}
                  onOpenOabExam={onOpenOabExam}
                />
              )}

              {drawer === 'AGENDA' && isIntern && (
                <InternshipCareerPanel player={player} onCompleteTask={onCompleteOfficeTask} />
              )}

              {drawer === 'AGENDA' && !isIntern && (
                <div className={styles.simpleDrawerGrid}>
                  <button type="button" onClick={onOpenCareerModal}><Award size={22} /><strong>Plano de carreira</strong><span>Acompanhe progressão, experiência e próximos marcos.</span></button>
                  <button type="button" onClick={onOpenAcademicModal}><GraduationCap size={22} /><strong>Carreira acadêmica</strong><span>Especializações, titulação e desenvolvimento profissional.</span></button>
                  <button type="button" onClick={onOpenConcursoModal}><Landmark size={22} /><strong>Magistratura</strong><span>Acompanhe requisitos e etapas da carreira pública.</span></button>
                </div>
              )}

              {drawer === 'FINANCE' && (
                <div className={styles.financeDrawer}>
                  <div><span>Patrimônio atual</span><strong>R$ {formatMoney(player.money)}</strong></div>
                  <div><span>Remuneração-base</span><strong>R$ {formatMoney(currentTier.salaryBaseMonthly)}/mês</strong></div>
                  <div><span>Casos vencidos</span><strong>{player.casesSolved}</strong></div>
                  <div><span>Reputação</span><strong>{player.reputation}/100</strong></div>
                  <button type="button" onClick={onOpenOfficeModal}>Gestão do escritório <ArrowRight size={15} /></button>
                </div>
              )}

              {drawer === 'TEAM' && (
                <div className={styles.teamDrawer}>
                  <article><div>RR</div><span><strong>Dr. Roberto Ramos</strong><small>Sócio fundador • Supervisor</small></span></article>
                  <article><div>MD</div><span><strong>Mariana Duarte</strong><small>Secretária do escritório</small></span></article>
                  {(player.officeFinances?.employees || []).map((employee) => (
                    <article key={employee.id}><div>{employee.name?.slice(0, 2).toUpperCase()}</div><span><strong>{employee.name}</strong><small>{employee.role}</small></span></article>
                  ))}
                  <button type="button" onClick={onOpenOfficeModal}>Gerenciar equipe <ArrowRight size={15} /></button>
                </div>
              )}

              {drawer === 'ACHIEVEMENTS' && (
                <div className={styles.achievementsDrawer}>
                  <Trophy size={34} />
                  <strong>{player.unlockedAchievements?.length || 0} conquistas desbloqueadas</strong>
                  <p>Casos concluídos: {player.casesSolved} • Experiência: {player.xp} XP • Reputação: {player.reputation}/100.</p>
                  <button type="button" onClick={onOpenCareerModal}>Ver trajetória <ArrowRight size={15} /></button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
