import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileSignature,
  Laptop,
  MessageCircle,
  Scale,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import type { PlayerProfile } from '../../types/game';
import { readCurrentPlayerSnapshot } from '../../lib/professionalRpg';
import { readPlayerGender, usePlayerDisplayName } from '../../lib/playerTreatment';
import {
  completeProfessionalEmploymentOnboarding,
  PROFESSIONAL_EMPLOYMENT_UPDATED_EVENT,
  readProfessionalEmploymentState,
  reconcilePostOabCareerBeforeContract,
  signProfessionalEmploymentContract,
  type ProfessionalEmploymentState,
} from '../../lib/professionalEmployment';
import { sound } from '../../utils/sound';
import styles from './PostOabEmploymentExperience.module.css';

type ExperienceStage = 'ROBERTO' | 'CONTRACT' | 'CONGRATS' | 'MARIANA' | null;

const ROBERTO_DIALOGUES = [
  'Parabéns pela aprovação no Exame da Ordem. Você entrou neste escritório como estagiário e chegou até aqui demonstrando evolução técnica, responsabilidade e compromisso com a profissão.',
  'Com a sua inscrição profissional liberada no jogo, eu quero formalizar uma nova relação de trabalho. A proposta é para permanecer no Ramos & Associados como advogado empregado, agora com responsabilidades próprias de advocacia.',
  'Leia o contrato com atenção. A sua independência técnica continua preservada, mas a partir da contratação você passa a responder diretamente pelos casos que lhe forem atribuídos e pela rotina profissional do escritório.',
];

const MARIANA_DIALOGUES = [
  {
    title: 'Bem-vindo ao novo cargo',
    text: 'Parabéns, doutor. A partir de agora sua rotina muda bastante. Você deixa a dinâmica de estágio e passa a atuar como advogado contratado do Ramos & Associados.',
  },
  {
    title: 'O escritório usa Social Jurídico',
    text: 'O Ramos & Associados utiliza o Social Jurídico Enterprise como sistema oficial de gestão. Clientes, casos, documentos, tarefas, prazos e ferramentas jurídicas ficam centralizados no sistema para facilitar o trabalho diário da equipe.',
  },
  {
    title: 'Os casos chegam pelo CRM',
    text: 'Você não escolherá mais casos em uma lista pública. O Dr. Roberto determina a distribuição e eu disponibilizo o atendimento no seu CRM do Social Jurídico. No início, você receberá um caso por vez.',
  },
  {
    title: 'Notebook e celular profissional',
    text: 'No notebook você acessa o Social Jurídico In-Game. O celular fica reservado para comunicação: ligações, chamadas recebidas e WhatsApp com clientes e integrantes do escritório. Os dois passam a fazer parte da sua rotina.',
  },
];

function gameDate(player: PlayerProfile) {
  return `${String(player.gameCurrentDay).padStart(2, '0')}/${String(player.gameCurrentMonth).padStart(2, '0')}/${player.gameCurrentYear}`;
}

export const PostOabEmploymentExperience: React.FC = () => {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [employment, setEmployment] = useState<ProfessionalEmploymentState | null>(null);
  const [stage, setStage] = useState<ExperienceStage>(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [contractRead, setContractRead] = useState(false);
  const displayName = usePlayerDisplayName(player, 'Profissional');

  useEffect(() => {
    let active = true;
    let reconciled = false;

    const sync = () => {
      const current = readCurrentPlayerSnapshot();
      if (!active || !current?.oabRegistration) return;

      if (!reconciled && reconcilePostOabCareerBeforeContract(current)) {
        reconciled = true;
        window.location.reload();
        return;
      }

      setPlayer(current);
      setEmployment(readProfessionalEmploymentState(current));
    };

    sync();
    const timer = window.setInterval(sync, 700);
    const onEmploymentUpdate = () => sync();
    window.addEventListener(PROFESSIONAL_EMPLOYMENT_UPDATED_EVENT, onEmploymentUpdate);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(PROFESSIONAL_EMPLOYMENT_UPDATED_EVENT, onEmploymentUpdate);
    };
  }, []);

  const hasProfessionalTreatment = useMemo(() => Boolean(player && readPlayerGender(player)), [player]);

  if (!player?.oabRegistration || !employment || employment.onboardingCompleted || !hasProfessionalTreatment) {
    return null;
  }

  const contractSigned = employment.contractStatus === 'SIGNED';

  const openExperience = () => {
    sound.playClick();
    setDialogueIndex(0);
    setStage(contractSigned ? 'MARIANA' : 'ROBERTO');
  };

  const closeExperience = () => {
    sound.playClick();
    setStage(null);
    setDialogueIndex(0);
  };

  const advanceRoberto = () => {
    sound.playClick();
    if (dialogueIndex < ROBERTO_DIALOGUES.length - 1) {
      setDialogueIndex((current) => current + 1);
      return;
    }
    setDialogueIndex(0);
    setStage('CONTRACT');
  };

  const signContract = () => {
    if (!contractRead) return;
    sound.playPaper();
    const next = signProfessionalEmploymentContract(player, gameDate(player));
    setEmployment(next);
    setStage('CONGRATS');
  };

  const finishCongratulations = () => {
    sound.playVictory();
    setDialogueIndex(0);
    setStage('MARIANA');
  };

  const advanceMariana = () => {
    sound.playClick();
    if (dialogueIndex < MARIANA_DIALOGUES.length - 1) {
      setDialogueIndex((current) => current + 1);
      return;
    }

    completeProfessionalEmploymentOnboarding(player);
    window.location.reload();
  };

  return (
    <>
      {!stage && (
        <aside className={styles.objectiveCard} aria-label="Novo objetivo profissional">
          <div className={styles.objectiveIcon}>
            {contractSigned ? <MessageCircle size={21} /> : <BriefcaseBusiness size={21} />}
          </div>
          <div className={styles.objectiveCopy}>
            <span>Novo objetivo</span>
            <strong>{contractSigned ? 'Converse com Mariana Duarte' : 'Converse com Dr. Roberto Ramos'}</strong>
            <p>
              {contractSigned
                ? 'Finalize a integração ao novo cargo e conheça sua rotina profissional.'
                : 'A aprovação na OAB abriu uma nova proposta de trabalho no escritório.'}
            </p>
          </div>
          <button type="button" onClick={openExperience}>
            Conversar <ArrowRight size={15} />
          </button>
        </aside>
      )}

      {stage === 'ROBERTO' && (
        <div className={styles.backdrop}>
          <section className={styles.dialogueModal} role="dialog" aria-modal="true" aria-label="Conversa com Dr. Roberto Ramos">
            <button type="button" className={styles.closeButton} onClick={closeExperience} aria-label="Fechar conversa">
              <X size={18} />
            </button>
            <div className={styles.npcPortrait}>
              <img src="/personagens/dr-roberto-ramos.png" alt="Dr. Roberto Ramos" />
            </div>
            <div className={styles.dialogueContent}>
              <span className={styles.eyebrow}>Sala do sócio responsável</span>
              <h2>Dr. Roberto Ramos</h2>
              <small>Sócio responsável • Ramos & Associados</small>
              <p className={styles.dialogueText}>{ROBERTO_DIALOGUES[dialogueIndex]}</p>
              <div className={styles.dialogueFooter}>
                <span>{dialogueIndex + 1} / {ROBERTO_DIALOGUES.length}</span>
                <button type="button" onClick={advanceRoberto}>
                  {dialogueIndex === ROBERTO_DIALOGUES.length - 1 ? 'Ler proposta de contrato' : 'Continuar'}
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {stage === 'CONTRACT' && (
        <div className={styles.backdrop}>
          <section className={styles.contractModal} role="dialog" aria-modal="true" aria-label="Contrato de trabalho de advogado empregado">
            <header className={styles.contractHeader}>
              <div>
                <span>Ramos & Associados • Departamento Pessoal</span>
                <h2>Contrato Individual de Trabalho de Advogado Empregado</h2>
                <p>Regime de dedicação exclusiva • prazo indeterminado • documento ficcional do jogo</p>
              </div>
              <button type="button" className={styles.closeButtonInline} onClick={closeExperience} aria-label="Fechar contrato">
                <X size={18} />
              </button>
            </header>

            <div className={styles.contractBody}>
              <div className={styles.contractMeta}>
                <div><span>Contratante</span><strong>Ramos & Associados</strong></div>
                <div><span>Contratado</span><strong>{displayName}</strong></div>
                <div><span>Inscrição profissional</span><strong>{player.oabRegistration.code}</strong></div>
                <div><span>Cargo</span><strong>Advogado Contratado</strong></div>
              </div>

              <article className={styles.contractPaper}>
                <h3>CONTRATO INDIVIDUAL DE TRABALHO DE ADVOGADO EMPREGADO</h3>
                <p>
                  Pelo presente instrumento particular, de um lado <strong>RAMOS & ASSOCIADOS</strong>, sociedade de advogados integrante do universo ficcional do Rota da Justiça, doravante denominada EMPREGADORA, e, de outro, <strong>{displayName}</strong>, inscrito(a) no cadastro profissional simulado sob nº <strong>{player.oabRegistration.code}</strong>, doravante denominado(a) EMPREGADO(A), ajustam o presente contrato de trabalho por prazo indeterminado.
                </p>

                <h4>1. Função e objeto</h4>
                <p>O(A) EMPREGADO(A) exercerá a função de Advogado(a), realizando atividades de consultoria, assessoria, representação, elaboração de peças, atendimento a clientes, análise documental, diligências e demais atos compatíveis com o exercício profissional e com os casos regularmente atribuídos pelo escritório.</p>

                <h4>2. Independência técnica</h4>
                <p>A relação de emprego não reduz a independência profissional nem a isenção técnica inerentes à advocacia. O(A) EMPREGADO(A) não estará obrigado(a) a prestar serviços profissionais de interesse pessoal dos empregadores fora da relação de emprego.</p>

                <h4>3. Regime e jornada</h4>
                <p>Fica pactuado regime <strong>misto</strong>, com atividades presenciais no escritório, em órgãos públicos, fóruns, audiências e diligências, além de atividades não presenciais quando autorizadas. O contrato é firmado em <strong>regime expresso de dedicação exclusiva</strong>, com jornada de até 8 horas diárias e 40 horas semanais, de segunda a sexta-feira, preferencialmente das 9h às 18h, com intervalo intrajornada, ressalvadas alterações admitidas por lei, instrumentos coletivos e necessidades profissionais.</p>

                <h4>4. Remuneração</h4>
                <p>A remuneração mensal inicial será de <strong>R$ {employment.salaryMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, sujeita aos descontos legais e aos reajustes previstos em lei, acordo ou convenção coletiva aplicável. Eventuais horas extraordinárias observarão a legislação profissional e trabalhista vigente.</p>

                <h4>5. Despesas profissionais</h4>
                <p>Despesas necessárias e previamente autorizadas para transporte, hospedagem, alimentação, diligências e execução de serviços externos serão reembolsadas pela EMPREGADORA mediante registro e comprovação, conforme política interna.</p>

                <h4>6. Honorários de sucumbência</h4>
                <p>Os honorários de sucumbência eventualmente incidentes em causas conduzidas no âmbito do escritório observarão o Estatuto da Advocacia, os instrumentos coletivos aplicáveis e a política formal de partilha adotada pela sociedade de advogados, sem integração automática ao salário contratual.</p>

                <h4>7. Sigilo, ética e proteção de dados</h4>
                <p>O(A) EMPREGADO(A) compromete-se a preservar o sigilo profissional, a confidencialidade dos dados dos clientes, os deveres éticos da advocacia e as regras internas de segurança da informação e proteção de dados, inclusive após o encerramento do vínculo.</p>

                <h4>8. Ferramentas de trabalho</h4>
                <p>O escritório disponibiliza notebook, celular profissional e acesso ao <strong>Social Jurídico Enterprise</strong>, sistema oficial utilizado pelo Ramos & Associados para CRM, gestão de casos, documentos, tarefas, prazos e ferramentas jurídicas. As credenciais são pessoais e devem ser utilizadas exclusivamente para atividades profissionais.</p>

                <h4>9. Atribuição e supervisão de casos</h4>
                <p>Os casos serão distribuídos pelo Dr. Roberto Ramos e disponibilizados no CRM pela equipe administrativa, com responsabilidade técnica do(a) advogado(a) designado(a), observadas as regras de supervisão, prazos, conflitos de interesse e capacidade operacional.</p>

                <h4>10. Prazo e rescisão</h4>
                <p>O presente contrato é celebrado por prazo indeterminado e poderá ser encerrado nas hipóteses admitidas pela legislação trabalhista e profissional aplicável, respeitados os direitos e deveres decorrentes da relação de emprego.</p>

                <h4>11. Legislação aplicável</h4>
                <p>Para fins de realismo da simulação, este instrumento foi estruturado com referência à CLT, ao Estatuto da Advocacia e da OAB e às regras profissionais aplicáveis ao advogado empregado. Por integrar um jogo, não produz qualquer efeito jurídico real.</p>

                <div className={styles.signatureGrid}>
                  <div><span>Ramos & Associados</span><small>EMPREGADORA</small></div>
                  <div><span>{displayName}</span><small>EMPREGADO(A)</small></div>
                </div>
                <p className={styles.contractDate}>Data da contratação no jogo: {gameDate(player)}</p>
              </article>
            </div>

            <footer className={styles.contractFooter}>
              <label>
                <input type="checkbox" checked={contractRead} onChange={(event) => setContractRead(event.target.checked)} />
                <span>Li o contrato e aceito a proposta de trabalho no universo do jogo.</span>
              </label>
              <button type="button" disabled={!contractRead} onClick={signContract}>
                <FileSignature size={16} /> Assinar contrato
              </button>
            </footer>
          </section>
        </div>
      )}

      {stage === 'CONGRATS' && (
        <div className={styles.backdrop}>
          <section className={styles.congratulationsModal} role="dialog" aria-modal="true" aria-label="Parabéns pelo novo cargo">
            <div className={styles.successSeal}><CheckCircle2 size={38} /></div>
            <span className={styles.eyebrow}>Contrato assinado</span>
            <h2>Parabéns, {displayName}!</h2>
            <h3>Você agora é Advogado Contratado.</h3>
            <p>Seu vínculo com o Ramos & Associados foi formalizado. A próxima etapa é conhecer a nova rotina, os dispositivos profissionais e o Social Jurídico utilizado pelo escritório.</p>
            <div className={styles.unlocks}>
              <span><BriefcaseBusiness size={16} /> Novo cargo</span>
              <span><Laptop size={16} /> Notebook profissional</span>
              <span><Smartphone size={16} /> Celular profissional</span>
            </div>
            <button type="button" onClick={finishCongratulations}>
              Conhecer nova rotina <ArrowRight size={15} />
            </button>
          </section>
        </div>
      )}

      {stage === 'MARIANA' && (
        <div className={styles.backdrop}>
          <section className={styles.dialogueModal} role="dialog" aria-modal="true" aria-label="Integração com Mariana Duarte">
            <button type="button" className={styles.closeButton} onClick={closeExperience} aria-label="Fechar conversa">
              <X size={18} />
            </button>
            <div className={styles.npcPortrait}>
              <img src="/personagens/mariana-duarte.png" alt="Mariana Duarte" />
            </div>
            <div className={styles.dialogueContent}>
              <span className={styles.eyebrow}>Integração do novo cargo</span>
              <h2>Mariana Duarte</h2>
              <small>Secretária do Escritório • Ramos & Associados</small>
              <div className={styles.onboardingBadge}>
                {dialogueIndex === 1 && <><ShieldCheck size={15} /> Social Jurídico Enterprise</>}
                {dialogueIndex === 2 && <><Scale size={15} /> Dr. Roberto → Mariana → CRM</>}
                {dialogueIndex === 3 && <><Laptop size={15} /> Notebook <span>+</span> <Smartphone size={15} /> Celular</>}
              </div>
              <h3 className={styles.onboardingTitle}>{MARIANA_DIALOGUES[dialogueIndex].title}</h3>
              <p className={styles.dialogueText}>{MARIANA_DIALOGUES[dialogueIndex].text}</p>
              <div className={styles.dialogueFooter}>
                <span>{dialogueIndex + 1} / {MARIANA_DIALOGUES.length}</span>
                <button type="button" onClick={advanceMariana}>
                  {dialogueIndex === MARIANA_DIALOGUES.length - 1 ? 'Iniciar rotina profissional' : 'Continuar'}
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
