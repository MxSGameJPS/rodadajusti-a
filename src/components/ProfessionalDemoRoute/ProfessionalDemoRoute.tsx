import React, { useMemo, useState } from 'react';
import { BriefcaseBusiness, ShieldCheck } from 'lucide-react';
import { GAME_CASES } from '../../data/cases';
import { createDemoLawyer } from '../../demo/demoLawyer';
import type { SocialJuridicoToolUse } from '../../types/game';
import { ProfessionalOfficeHub } from '../ProfessionalOfficeHub/ProfessionalOfficeHub';
import { ProfessionalSocialJuridicoExperience } from '../ProfessionalSocialJuridicoExperience/ProfessionalSocialJuridicoExperience';
import { DemoHiringExperience } from './DemoHiringExperience';
import { DemoProfessionalPhone } from './DemoProfessionalPhone';
import styles from './ProfessionalDemoRoute.module.css';

function navigate(path: string) {
  window.location.assign(path);
}

function DemoBanner({ mode }: { mode: 'ADVOGADO' | 'CONTRATACAO' }) {
  return (
    <header className={styles.demoBanner}>
      <div className={styles.bannerCopy}>
        <ShieldCheck size={21} />
        <div>
          <span>Ambiente de demonstração</span>
          <strong>Jogador fictício • nenhum dado da sua carreira é lido ou alterado</strong>
        </div>
      </div>
      <nav className={styles.bannerActions}>
        <a className={mode === 'CONTRATACAO' ? styles.activeLink : ''} href="/demo/contratacao">Contratação</a>
        <a className={mode === 'ADVOGADO' ? styles.activeLink : ''} href="/demo/advogado">Advogado Contratado</a>
        <a href="/jogo">Voltar ao meu jogo</a>
      </nav>
    </header>
  );
}

function DemoStatsBar() {
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto 18px', display: 'grid', gridTemplateColumns: '1.6fr repeat(4, .7fr)', gap: 8 }}>
      <div style={{ border: '1px solid #2d2d31', background: '#131315', borderRadius: 12, padding: '12px 14px' }}>
        <span style={{ display: 'block', color: '#c5a059', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>Rota da Justiça • Demo</span>
        <strong style={{ display: 'block', color: '#f0eadf', marginTop: 4, fontSize: 14 }}>DR. RAFAEL MARTINS</strong>
        <small style={{ color: '#827d74' }}>Advogado Contratado • Ramos & Associados</small>
      </div>
      {[['XP', '3.200'], ['REPUTAÇÃO', '62 / 100'], ['PATRIMÔNIO', 'R$ 18.500'], ['OAB', 'APROVADO']].map(([label, value]) => (
        <div key={label} style={{ border: '1px solid #2d2d31', background: '#131315', borderRadius: 12, padding: '12px 14px' }}>
          <span style={{ display: 'block', color: '#77736b', fontSize: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</span>
          <strong style={{ display: 'block', color: label === 'OAB' ? '#6ee7b7' : '#e6dfd2', marginTop: 6, fontSize: 13 }}>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function ProfessionalDemoRoute() {
  const mode = window.location.pathname === '/demo/contratacao' ? 'CONTRATACAO' : 'ADVOGADO';
  const demoCase = useMemo(
    () => GAME_CASES.find((caseItem) => caseItem.minCareerTier === 'ADVOGADO_CONTRATADO') || null,
    [],
  );
  const [player, setPlayer] = useState(() => createDemoLawyer(demoCase));
  const currentCase = demoCase && player.activeCase?.caseId === demoCase.id ? demoCase : null;

  const handleUseTool = (tool: SocialJuridicoToolUse) => {
    setPlayer((current) => {
      if (!current.activeCase) return current;
      const action = {
        id: `demo-sj-${Date.now()}`,
        featureId: tool.featureId,
        targetId: tool.targetId,
        label: tool.label,
        scoreBonus: tool.scoreBonus,
        timeCostHours: tool.timeCostHours,
        timestampGameHours: current.activeCase.hoursSpent,
      };
      return {
        ...current,
        activeCase: {
          ...current.activeCase,
          hoursSpent: current.activeCase.hoursSpent + tool.timeCostHours,
          socialJuridicoActions: [...current.activeCase.socialJuridicoActions, action],
        },
      };
    });
  };

  if (mode === 'CONTRATACAO') {
    const hiringPlayer = { ...player, careerTier: 'ESTAGIARIO_SENIOR' as const, activeCase: null };
    return (
      <main className={styles.root}>
        <DemoBanner mode="CONTRATACAO" />
        <div className={styles.content}>
          <section className={styles.placeholder} style={{ marginTop: 10 }}>
            <span>Simulação da transição de carreira</span>
            <h1>Exame da Ordem aprovado</h1>
            <p>Rafael Martins é um personagem fictício com a OAB simulada já aprovada. Esta sequência permite revisar Dr. Roberto → contrato → parabéns → Mariana sem tocar no seu save.</p>
          </section>
          <DemoHiringExperience player={hiringPlayer} onFinish={() => navigate('/demo/advogado')} />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.root}>
      <DemoBanner mode="ADVOGADO" />
      <DemoStatsBar />
      <div className={styles.content}>
        <ProfessionalOfficeHub
          player={player}
          onResumeActiveCase={() => window.alert('Demonstração: as diligências do caso real não são executadas nesta rota isolada.')}
          onOpenCareerModal={() => window.alert('Demonstração: o Plano de Carreira continua disponível no jogo normal.')}
          onOpenAcademicModal={() => window.alert('Demonstração: a Carreira Acadêmica continua disponível no jogo normal.')}
          onOpenConcursoModal={() => window.alert('Demonstração: a Magistratura continua disponível no jogo normal.')}
          onOpenOfficeModal={() => window.alert('Demonstração: Meu Escritório continua disponível no jogo normal.')}
        />
      </div>

      <ProfessionalSocialJuridicoExperience
        player={player}
        currentCase={currentCase}
        onUseTool={handleUseTool}
      />
      <DemoProfessionalPhone player={player} currentCase={currentCase} />
    </main>
  );
}
