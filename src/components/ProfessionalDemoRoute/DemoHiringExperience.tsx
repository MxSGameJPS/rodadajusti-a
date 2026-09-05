import React, { useState } from 'react';
import { ArrowRight, Award, CheckCircle2, FileSignature, ShieldCheck } from 'lucide-react';
import type { PlayerProfile } from '../../types/game';
import { sound } from '../../utils/sound';
import styles from './ProfessionalDemoRoute.module.css';

type Stage = 'ROBERTO' | 'CONTRATO' | 'PARABENS' | 'MARIANA';

const ROBERTO = [
  'Parabéns pela aprovação no Exame da Ordem. Você entrou neste escritório como estagiário e chegou até aqui demonstrando evolução técnica, responsabilidade e compromisso com a profissão.',
  'Com a sua inscrição profissional liberada, quero formalizar uma nova relação de trabalho. A proposta é para permanecer no Ramos & Associados como advogado empregado, agora com responsabilidades próprias de advocacia.',
  'Leia o contrato com atenção. Sua independência técnica continua preservada, mas a partir da contratação você passa a responder pelos casos que lhe forem atribuídos e pela rotina profissional do escritório.',
];

const MARIANA = [
  {
    title: 'Bem-vindo ao novo cargo',
    text: 'Parabéns, doutor. A partir de agora sua rotina muda bastante. Você deixa a dinâmica de estágio e passa a atuar como Advogado Contratado do Ramos & Associados.',
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
    text: 'No notebook você acessa o Social Jurídico In-Game. O celular fica reservado para comunicação: ligações, chamadas recebidas e WhatsApp com clientes e integrantes do escritório.',
  },
];

interface DemoHiringExperienceProps {
  player: PlayerProfile;
  onFinish: () => void;
}

export const DemoHiringExperience: React.FC<DemoHiringExperienceProps> = ({ player, onFinish }) => {
  const [stage, setStage] = useState<Stage>('ROBERTO');
  const [index, setIndex] = useState(0);
  const [accepted, setAccepted] = useState(false);

  const advanceRoberto = () => {
    sound.playClick();
    if (index < ROBERTO.length - 1) {
      setIndex((current) => current + 1);
      return;
    }
    setIndex(0);
    setStage('CONTRATO');
  };

  const sign = () => {
    if (!accepted) return;
    sound.playPaper();
    setStage('PARABENS');
  };

  const advanceMariana = () => {
    sound.playClick();
    if (index < MARIANA.length - 1) {
      setIndex((current) => current + 1);
      return;
    }
    onFinish();
  };

  if (stage === 'ROBERTO') {
    return (
      <div className={styles.hiringStage}>
        <section className={styles.hiringCard}>
          <div className={styles.hiringNpc}>
            <div className={styles.hiringPortrait}><img src="/personagens/dr-roberto-ramos.png" alt="Dr. Roberto Ramos" /></div>
            <div className={styles.hiringCopy}>
              <span>Sala do sócio responsável</span>
              <h2>Dr. Roberto Ramos</h2>
              <small>Ramos & Associados</small>
              <p>{ROBERTO[index]}</p>
              <div className={styles.hiringFooter}>
                <span>{index + 1} / {ROBERTO.length}</span>
                <button type="button" className={styles.primaryButton} onClick={advanceRoberto}>
                  {index === ROBERTO.length - 1 ? 'Ler proposta de contrato' : 'Continuar'} <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (stage === 'CONTRATO') {
    return (
      <div className={styles.hiringStage}>
        <section className={styles.hiringCard}>
          <div className={styles.contractWrap}>
            <header className={styles.contractHead}>
              <div>
                <span>Ramos & Associados • Departamento Pessoal</span>
                <h2>Contrato Individual de Trabalho de Advogado Empregado</h2>
              </div>
              <ShieldCheck size={24} color="#c5a059" />
            </header>

            <div className={styles.contractMeta}>
              <div><span>Contratante</span><strong>Ramos & Associados</strong></div>
              <div><span>Contratado</span><strong>Dr. {player.name}</strong></div>
              <div><span>Inscrição</span><strong>{player.oabRegistration?.code}</strong></div>
              <div><span>Cargo</span><strong>Advogado Contratado</strong></div>
            </div>

            <article className={styles.contractPaper}>
              <h3>CONTRATO INDIVIDUAL DE TRABALHO DE ADVOGADO EMPREGADO</h3>
              <p>Pelo presente instrumento particular, de um lado <strong>RAMOS & ASSOCIADOS</strong>, sociedade de advogados integrante do universo ficcional do Rota da Justiça, e, de outro, <strong>Dr. {player.name}</strong>, inscrito no cadastro profissional simulado sob nº <strong>{player.oabRegistration?.code}</strong>, ajustam o presente contrato de trabalho por prazo indeterminado.</p>
              <h4>1. Função e objeto</h4>
              <p>O empregado exercerá a função de Advogado, realizando consultoria, assessoria, representação, elaboração de peças, atendimento a clientes, análise documental, diligências e demais atos compatíveis com o exercício profissional e com os casos regularmente atribuídos pelo escritório.</p>
              <h4>2. Independência técnica</h4>
              <p>A relação de emprego não reduz a independência profissional nem a isenção técnica inerentes à advocacia.</p>
              <h4>3. Regime e jornada</h4>
              <p>Fica pactuado regime misto, com atividades presenciais e não presenciais quando autorizadas, em regime expresso de dedicação exclusiva, com jornada de até 8 horas diárias e 40 horas semanais, observadas as regras profissionais e trabalhistas aplicáveis.</p>
              <h4>4. Remuneração</h4>
              <p>A remuneração mensal inicial será de <strong>R$ 5.800,00</strong>, sujeita aos descontos legais e aos reajustes previstos em lei, acordo ou convenção coletiva aplicável.</p>
              <h4>5. Sigilo, ética e proteção de dados</h4>
              <p>O empregado compromete-se a preservar o sigilo profissional, a confidencialidade dos dados dos clientes, os deveres éticos da advocacia e as regras internas de segurança da informação.</p>
              <h4>6. Ferramentas de trabalho</h4>
              <p>O escritório disponibiliza notebook, celular profissional e acesso ao <strong>Social Jurídico Enterprise</strong>, sistema oficial utilizado pelo Ramos & Associados para CRM, gestão de casos, documentos, tarefas, prazos e ferramentas jurídicas.</p>
              <h4>7. Distribuição de casos</h4>
              <p>Os casos serão distribuídos pelo Dr. Roberto Ramos e disponibilizados no CRM por Mariana Duarte, com responsabilidade técnica do advogado designado.</p>
              <h4>8. Prazo e rescisão</h4>
              <p>O contrato é celebrado por prazo indeterminado e poderá ser encerrado nas hipóteses admitidas pela legislação trabalhista e profissional aplicável.</p>
              <p><strong>Observação:</strong> este documento existe somente para fins de simulação e não produz efeitos jurídicos reais.</p>
            </article>

            <footer className={styles.contractActions}>
              <label><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> Li o contrato e aceito a proposta no universo do jogo.</label>
              <button type="button" className={styles.primaryButton} disabled={!accepted} onClick={sign}><FileSignature size={15} /> Assinar contrato</button>
            </footer>
          </div>
        </section>
      </div>
    );
  }

  if (stage === 'PARABENS') {
    return (
      <div className={styles.hiringStage}>
        <section className={styles.hiringCard}>
          <div className={styles.congrats}>
            <div className={styles.congratsIcon}><Award size={38} /></div>
            <span>Novo cargo desbloqueado</span>
            <h2>Parabéns, Dr. {player.name}!</h2>
            <p>Você agora é Advogado Contratado do Ramos & Associados.</p>
            <button type="button" className={styles.primaryButton} onClick={() => { sound.playVictory(); setIndex(0); setStage('MARIANA'); }}>
              Conhecer a nova rotina <ArrowRight size={15} />
            </button>
          </div>
        </section>
      </div>
    );
  }

  const item = MARIANA[index];
  return (
    <div className={styles.hiringStage}>
      <section className={styles.hiringCard}>
        <div className={styles.hiringNpc}>
          <div className={styles.hiringPortrait}><img src="/personagens/mariana-duarte.png" alt="Mariana Duarte" /></div>
          <div className={styles.hiringCopy}>
            <span>Integração ao novo cargo</span>
            <h2>Mariana Duarte</h2>
            <small>Secretária do Escritório</small>
            <p><strong style={{ color: '#f0e4c2' }}>{item.title}.</strong> {item.text}</p>
            <div className={styles.hiringFooter}>
              <span>{index + 1} / {MARIANA.length}</span>
              <button type="button" className={styles.primaryButton} onClick={advanceMariana}>
                {index === MARIANA.length - 1 ? <><CheckCircle2 size={15} /> Entrar no novo cargo</> : <>Continuar <ArrowRight size={15} /></>}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
