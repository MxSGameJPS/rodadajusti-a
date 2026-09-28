import React, { useEffect, useMemo } from 'react';
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Building,
  Clock3,
  GraduationCap,
  Landmark,
  Laptop,
  MessageCircle,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { GAME_CASES } from '../../data/cases';
import {
  employmentIncludesSocialJuridico,
  isProfessionalPreviewMode,
  isRamosEmploymentActive,
  readProfessionalEmploymentState,
} from '../../lib/professionalEmployment';
import { usePlayerDisplayName } from '../../lib/playerTreatment';
import type { PlayerProfile } from '../../types/game';
import { sound } from '../../utils/sound';
import { ProfessionalDailyBrief } from './ProfessionalDailyBrief';
import { professionalDaySummary, readProfessionalPortfolio, registerProfessionalArrival } from '../../lib/professionalActTwo';
import styles from './ProfessionalOfficeHub.module.css';

const OPEN_SOCIAL_JURIDICO_EVENT = 'rota:open-social-juridico';
const OPEN_PHONE_EVENT = 'rota:open-professional-phone';

interface ProfessionalOfficeHubProps {
  player: PlayerProfile;
  onResumeActiveCase: () => void;
  onOpenCareerModal: () => void;
  onOpenAcademicModal: () => void;
  onOpenConcursoModal: () => void;
  onOpenOfficeModal: () => void;
}

export const ProfessionalOfficeHub: React.FC<ProfessionalOfficeHubProps> = ({
  player,
  onResumeActiveCase,
  onOpenCareerModal,
  onOpenAcademicModal,
  onOpenConcursoModal,
  onOpenOfficeModal,
}) => {
  const displayName = usePlayerDisplayName(player, 'Advogado');
  const activeCase = GAME_CASES.find((caseItem) => caseItem.id === player.activeCase?.caseId) || null;
  const previewMode = isProfessionalPreviewMode();
  const employment = readProfessionalEmploymentState(player);
  const ramosEmployment = isRamosEmploymentActive(player);
  const officeName = employment?.officeName || 'Escritório atual';
  const roleTitle = employment?.role || 'Advogado';
  const socialJuridicoIncluded = employmentIncludesSocialJuridico(player);
  const gameDate = `${String(player.gameCurrentDay).padStart(2,'0')}/${String(player.gameCurrentMonth).padStart(2,'0')}/${player.gameCurrentYear}`;
  useEffect(() => { if (!previewMode && employment?.contractStatus === 'SIGNED') registerProfessionalArrival(player, gameDate); }, [player.cloudCareerId, gameDate, employment?.contractStatus, previewMode]);
  const portfolio = useMemo(() => readProfessionalPortfolio(player), [player, gameDate]);
  const daySummary = useMemo(() => professionalDaySummary(player), [player, gameDate]);

  const openDevice = (eventName: string) => {
    sound.playClick();
    window.dispatchEvent(new CustomEvent(eventName));
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroSeal}>
          <BriefcaseBusiness size={29} />
        </div>
        <div className={styles.heroCopy}>
          <div className={styles.heroBadges}>
            <span>{officeName}</span>
            {socialJuridicoIncluded && <span className={styles.enterpriseBadge}>Social Jurídico {ramosEmployment ? 'Enterprise' : 'Profissional'}</span>}
            {previewMode && <span>Modo demonstração • seu progresso não foi alterado</span>}
          </div>
          <h2>Bom expediente, {displayName}.</h2>
          <p>
            Você atua como <strong>{roleTitle}</strong> em <strong>{officeName}</strong>. Casos, clientes, documentos, prazos e
            ferramentas ficam no ambiente profissional do escritório. Comunicações continuam disponíveis no celular profissional.
          </p>
        </div>
        <div className={styles.oabCard}>
          <span>Inscrição profissional do personagem</span>
          <strong>{player.oabRegistration?.code || (previewMode ? 'OAB/RS • DEMO' : '—')}</strong>
          <small>{previewMode ? 'visualização de desenvolvimento' : 'simulada no Rota da Justiça'}</small>
        </div>
      </section>

      <ProfessionalDailyBrief player={player} onResumeActiveCase={onResumeActiveCase} />

      <section className={styles.caseSection} aria-label="Carteira e agenda profissional">
        <div className={styles.sectionTitle}><div><span>Responsabilidade profissional</span><h3>Minha carteira e agenda</h3></div><div className={styles.assignmentFlow}><span>{daySummary.activeMatters} processos</span><span>{daySummary.pendingTasks} tarefas</span><span>{daySummary.criticalTasks} críticas</span></div></div>
        {daySummary.nextTasks.length > 0 ? daySummary.nextTasks.map((task) => (
          <article key={task.id} className={task.critical ? styles.activeCaseCard : styles.waitingCaseCard}>
            <div><span className={styles.caseCode}>{task.kind}{task.critical ? ' • PRIORIDADE' : ''}</span><h4>{task.title}</h4><p>Prazo: {task.dueGameDate}{task.dueMinute != null ? ` • ${String(Math.floor(task.dueMinute/60)).padStart(2,'0')}:${String(task.dueMinute%60).padStart(2,'0')}` : ''}</p></div>
          </article>
        )) : <article className={styles.waitingCaseCard}><div><span>Agenda organizada</span><h4>Nenhuma obrigação profissional pendente</h4><p>Novas atribuições e compromissos aparecerão aqui conforme sua carteira crescer.</p></div></article>}
        {portfolio.matters.filter((matter)=>matter.status!=='CLOSED').slice(0,4).map((matter)=>(
          <article key={matter.id} className={styles.activeCaseCard}><div><span className={styles.caseCode}>{matter.area} • {matter.officePriority}</span><h4>{matter.title}</h4><p><strong>Cliente:</strong> {matter.clientName} • Próxima ação: {matter.nextAction} • Confiança: {matter.clientTrust}%</p></div></article>
        ))}
      </section>

      <section className={styles.deviceGrid} aria-label="Dispositivos profissionais">
        <button type="button" className={styles.notebookCard} onClick={() => openDevice(OPEN_SOCIAL_JURIDICO_EVENT)}>
          <div className={styles.deviceIcon}><Laptop size={30} /></div>
          <div className={styles.deviceCopy}>
            <span>Ferramenta principal de trabalho</span>
            <h3>Notebook • Social Jurídico</h3>
            <p>{socialJuridicoIncluded
              ? 'Abra o CRM, acompanhe o caso atribuído, consulte documentos e utilize as ferramentas jurídicas publicadas pelo escritório.'
              : 'Acompanhe o caso atribuído, documentos e ferramentas profissionais disponibilizadas pelo seu empregador.'}</p>
            <div className={styles.deviceAction}>Abrir notebook <ArrowRight size={15} /></div>
          </div>
        </button>

        <button type="button" className={styles.phoneCard} onClick={() => openDevice(OPEN_PHONE_EVENT)}>
          <div className={styles.deviceIcon}><Smartphone size={30} /></div>
          <div className={styles.deviceCopy}>
            <span>Comunicação profissional e pessoal</span>
            <h3>Celular</h3>
            <p>Faça e receba ligações, converse com a equipe, clientes e pessoas da sua vida pessoal por WhatsApp.</p>
            <div className={styles.deviceAction}>Abrir celular <ArrowRight size={15} /></div>
          </div>
        </button>
      </section>

      <section className={styles.caseSection}>
        <div className={styles.sectionTitle}>
          <div>
            <span>Fluxo interno do escritório</span>
            <h3>Atendimento profissional</h3>
          </div>
          <div className={styles.assignmentFlow}>
            {ramosEmployment ? (
              <><span>Dr. Roberto</span><ArrowRight size={12} /><span>Mariana</span><ArrowRight size={12} /><span>CRM</span><ArrowRight size={12} /><span>{displayName}</span></>
            ) : (
              <><span>{officeName}</span><ArrowRight size={12} /><span>Coordenação</span><ArrowRight size={12} /><span>CRM</span><ArrowRight size={12} /><span>{displayName}</span></>
            )}
          </div>
        </div>

        {activeCase && player.activeCase ? (
          <article className={styles.activeCaseCard}>
            <div className={styles.activeCaseStatus}>
              <span><Clock3 size={14} /> Caso ativo</span>
              <strong>{player.activeCase.hoursSpent}h / {activeCase.deadlineHours}h</strong>
            </div>
            <div className={styles.activeCaseMain}>
              <div>
                <span className={styles.caseCode}>{activeCase.code} • {activeCase.area}</span>
                <h4>{activeCase.title}</h4>
                <p><strong>Cliente:</strong> {activeCase.client.name}. O dossiê e as ferramentas continuam disponíveis no notebook do Social Jurídico.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playPaper();
                  onResumeActiveCase();
                }}
              >
                Continuar diligências <ArrowRight size={15} />
              </button>
            </div>
          </article>
        ) : (
          <article className={styles.waitingCaseCard}>
            <div className={styles.waitingIcon}><ShieldCheck size={25} /></div>
            <div>
              <span>Nenhum caso ativo</span>
              <h4>Aguarde uma nova atribuição no CRM</h4>
              <p>
                Os casos não ficam mais expostos para escolha. A coordenação de {officeName} define a distribuição e disponibiliza
                <strong> atendimentos compatíveis com sua capacidade</strong> no ambiente profissional.
              </p>
            </div>
            <button type="button" onClick={() => openDevice(OPEN_SOCIAL_JURIDICO_EVENT)}>
              Consultar CRM <ArrowRight size={15} />
            </button>
          </article>
        )}
      </section>

      <section className={styles.caseSection} aria-label="Reputação profissional">
        <div className={styles.sectionTitle}><div><span>Posicionamento profissional</span><h3>Reputação e rede</h3></div><div className={styles.assignmentFlow}><span>Técnica {portfolio.reputation.technical}</span><span>Interna {portfolio.reputation.internalTrust}</span><span>Pública {portfolio.reputation.publicRecognition}</span><span>Mercado {portfolio.reputation.marketPrestige}</span></div></div>
        {portfolio.network.slice().sort((a,b)=>b.respect+b.trust-a.respect-a.trust).slice(0,4).map((contact)=><article key={contact.entityId} className={styles.waitingCaseCard}><div><span>{contact.role}</span><h4>{contact.name}</h4><p>Confiança {contact.trust}% • Respeito {contact.respect}% • Influência {contact.influence}% • Oportunidades {contact.opportunities}</p></div></article>)}
      </section>

      <section className={styles.caseSection} aria-label="Clientes e especializações">
        <div className={styles.sectionTitle}><div><span>Construção de carreira</span><h3>Clientes e especialização</h3></div></div>
        {portfolio.clients.slice(-3).map((client)=><article key={client.id} className={styles.waitingCaseCard}><div><span>{client.mood} • Confiança {client.trust}%</span><h4>{client.clientName}</h4><p>Satisfação {client.satisfaction}% • Comunicação {client.communication}% • {client.matterIds.length} atendimento(s)</p></div></article>)}
        {portfolio.specializations.slice().sort((a,b)=>b.experiencePoints+b.studyPoints-a.experiencePoints-a.studyPoints).slice(0,4).map((spec)=><article key={spec.area} className={styles.activeCaseCard}><div><span className={styles.caseCode}>{spec.level.replaceAll('_',' ')}</span><h4>{spec.area}</h4><p>{spec.handledMatters} processo(s) • {spec.successfulMatters} resultado(s) favorável(is) • {spec.experiencePoints+spec.studyPoints} pontos de experiência.</p></div></article>)}
      </section>

      <section className={styles.routineGrid}>
        <button type="button" onClick={onOpenCareerModal}>
          <Award size={19} />
          <div><span>Progressão</span><strong>Plano de Carreira</strong></div>
        </button>
        <button type="button" onClick={onOpenAcademicModal}>
          <GraduationCap size={19} />
          <div><span>Formação</span><strong>Carreira Acadêmica</strong></div>
        </button>
        <button type="button" onClick={onOpenConcursoModal}>
          <Landmark size={19} />
          <div><span>Setor público</span><strong>Magistratura</strong></div>
        </button>
        <button type="button" onClick={onOpenOfficeModal}>
          <Building size={19} />
          <div><span>Futuro profissional</span><strong>Meu Escritório</strong></div>
        </button>
      </section>

      <section className={styles.enterpriseNote}>
        <MessageCircle size={18} />
        <div>
          <strong>{officeName} é o seu empregador atual.</strong>
          <p>{socialJuridicoIncluded
            ? 'O escritório disponibiliza o Social Jurídico como parte da operação profissional. O notebook centraliza casos, documentos, prazos e atividade da equipe.'
            : 'As ferramentas e benefícios disponíveis seguem as condições do cargo aceito no Mercado de Trabalho.'}</p>
        </div>
      </section>
    </div>
  );
};
