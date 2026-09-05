import React from 'react';
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
import { usePlayerDisplayName } from '../../lib/playerTreatment';
import type { PlayerProfile } from '../../types/game';
import { sound } from '../../utils/sound';
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
            <span>Ramos & Associados</span>
            <span className={styles.enterpriseBadge}>Social Jurídico Enterprise</span>
          </div>
          <h2>Bom expediente, {displayName}.</h2>
          <p>
            Você atua como <strong>Advogado Contratado</strong>. A rotina profissional do escritório agora é organizada pelo
            Social Jurídico: casos, clientes, documentos, prazos e ferramentas ficam no notebook. Comunicações ficam no celular profissional.
          </p>
        </div>
        <div className={styles.oabCard}>
          <span>Inscrição profissional do personagem</span>
          <strong>{player.oabRegistration?.code || '—'}</strong>
          <small>simulada no Rota da Justiça</small>
        </div>
      </section>

      <section className={styles.deviceGrid} aria-label="Dispositivos profissionais">
        <button type="button" className={styles.notebookCard} onClick={() => openDevice(OPEN_SOCIAL_JURIDICO_EVENT)}>
          <div className={styles.deviceIcon}><Laptop size={30} /></div>
          <div className={styles.deviceCopy}>
            <span>Ferramenta principal de trabalho</span>
            <h3>Notebook • Social Jurídico</h3>
            <p>Abra o CRM, acompanhe o caso atribuído, consulte documentos e utilize as ferramentas jurídicas publicadas pelo escritório.</p>
            <div className={styles.deviceAction}>Abrir notebook <ArrowRight size={15} /></div>
          </div>
        </button>

        <button type="button" className={styles.phoneCard} onClick={() => openDevice(OPEN_PHONE_EVENT)}>
          <div className={styles.deviceIcon}><Smartphone size={30} /></div>
          <div className={styles.deviceCopy}>
            <span>Comunicação profissional</span>
            <h3>Celular do Escritório</h3>
            <p>Faça e receba ligações, converse com a equipe e responda mensagens de WhatsApp relacionadas à sua rotina e aos clientes.</p>
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
            <span>Dr. Roberto</span><ArrowRight size={12} /><span>Mariana</span><ArrowRight size={12} /><span>CRM</span><ArrowRight size={12} /><span>{displayName}</span>
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
                Os casos não ficam mais expostos para escolha. O Dr. Roberto Ramos define a distribuição e a Mariana disponibiliza
                <strong> um atendimento por vez</strong> no CRM do seu Social Jurídico.
              </p>
            </div>
            <button type="button" onClick={() => openDevice(OPEN_SOCIAL_JURIDICO_EVENT)}>
              Consultar CRM <ArrowRight size={15} />
            </button>
          </article>
        )}
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
          <strong>O Social Jurídico faz parte da operação do Ramos & Associados.</strong>
          <p>Dentro do universo do jogo, o escritório utiliza o plano Enterprise para centralizar a atividade da equipe. O notebook não é uma lista de atalhos: ele passa a ser o ambiente profissional da carreira do jogador.</p>
        </div>
      </section>
    </div>
  );
};
