import React, { useMemo, useState } from 'react';
import { PlayerProfile, LegalCase } from '../types/game';
import { GAME_CASES } from '../data/cases';
import { CAREER_TIERS } from '../data/careers';
import { getAvailableCasesForCareer } from '../lib/caseRules';
import { getOabPreparationStatus } from '../lib/internCareerEngine';
import {
  Briefcase,
  Scale,
  Award,
  GraduationCap,
  Landmark,
  Building,
  ArrowRight,
  Clock,
  History,
  BookOpenCheck,
  ShieldCheck,
} from 'lucide-react';
import { sound } from '../utils/sound';
import { NpcGuidanceDialog, NpcGuidanceStep } from './NpcGuidanceDialog';

interface OfficeHubProps {
  player: PlayerProfile;
  onSelectCaseToView: (c: LegalCase) => void;
  onResumeActiveCase: () => void;
  onOpenCareerModal: () => void;
  onOpenAcademicModal: () => void;
  onOpenConcursoModal: () => void;
  onOpenOfficeModal: () => void;
  onOpenOabExam: () => void;
}

type GuidanceAction = 'CAREER' | 'ACADEMIC' | 'MAGISTRATURA' | 'OFFICE' | 'CASE';

interface ActiveGuidance {
  key: string;
  contextLabel: string;
  dialogues: NpcGuidanceStep[];
  finalActionLabel: string;
  action: GuidanceAction;
  caseItem?: LegalCase;
}

const GUIDANCE_STORAGE_PREFIX = 'rota_npc_guidance_seen_v1:';

const FEATURE_GUIDANCE: Record<
  'career' | 'academic' | 'magistratura' | 'office',
  Omit<ActiveGuidance, 'key' | 'action' | 'caseItem'>
> = {
  career: {
    contextLabel: 'Plano de Carreira',
    finalActionLabel: 'Conhecer plano de carreira',
    dialogues: [
      {
        eyebrow: 'Sua evolução no escritório',
        text: 'Aqui você acompanha os cargos que pode alcançar ao longo da carreira. Casos concluídos, experiência, reputação e requisitos profissionais influenciam diretamente suas próximas oportunidades.',
      },
      {
        eyebrow: 'Cada etapa tem exigências',
        text: 'Você começa como estagiário(a), mas não ficará preso(a) a esse cargo. Conforme amadurece profissionalmente, novas responsabilidades, remunerações e caminhos jurídicos ficam disponíveis.',
      },
      {
        eyebrow: 'Use como referência',
        text: 'Consulte este painel sempre que quiser saber o que falta para avançar. Ele funciona como seu mapa profissional dentro do Rota da Justiça.',
      },
    ],
  },
  academic: {
    contextLabel: 'Carreira Acadêmica',
    finalActionLabel: 'Conhecer carreira acadêmica',
    dialogues: [
      {
        eyebrow: 'Formação também faz parte da carreira',
        text: 'A prática no escritório é importante, mas estudar também abre portas. Aqui você acompanha sua formação e pode investir em novas etapas acadêmicas ao longo da trajetória.',
      },
      {
        eyebrow: 'Titulação e conhecimento',
        text: 'Graduação, especializações e títulos mais avançados podem exigir tempo, experiência e investimento. Em troca, ampliam seu desenvolvimento e podem desbloquear possibilidades futuras.',
      },
      {
        eyebrow: 'Um caminho opcional',
        text: 'Você não precisa seguir a carreira acadêmica para continuar advogando. Ela é uma escolha de desenvolvimento do personagem e pode ser combinada com outros objetivos profissionais.',
      },
    ],
  },
  magistratura: {
    contextLabel: 'Magistratura',
    finalActionLabel: 'Conhecer magistratura',
    dialogues: [
      {
        eyebrow: 'Outro caminho jurídico',
        text: 'Nem toda carreira jurídica termina na advocacia. Se esse for o seu objetivo, no futuro você poderá buscar o caminho da magistratura e da carreira pública.',
      },
      {
        eyebrow: 'Existem requisitos próprios',
        text: 'Esse caminho exige preparação, experiência e aprovação nas etapas previstas pelo jogo. Não é uma promoção automática dentro do escritório, mas uma escolha profissional diferente.',
      },
      {
        eyebrow: 'A decisão é sua',
        text: 'Você pode construir uma carreira inteira na advocacia ou se preparar para o setor público. Consulte esta área quando quiser acompanhar os requisitos e etapas desse projeto profissional.',
      },
    ],
  },
  office: {
    contextLabel: 'Meu Escritório',
    finalActionLabel: 'Conhecer meu escritório',
    dialogues: [
      {
        eyebrow: 'Hoje você faz parte da nossa equipe',
        text: 'Neste momento, você trabalha conosco no Ramos & Associados. Mais adiante, sua carreira poderá chegar ao ponto de administrar uma estrutura profissional própria.',
      },
      {
        eyebrow: 'Empreender exige gestão',
        text: 'Quando esse caminho estiver disponível, você terá que pensar em despesas, equipe, receitas e decisões administrativas, além do trabalho jurídico dos casos.',
      },
      {
        eyebrow: 'Seu futuro profissional',
        text: 'Esta área reúne a evolução empresarial da carreira. No começo algumas opções ainda estarão bloqueadas, mas elas passam a fazer sentido conforme você conquista autonomia profissional.',
      },
    ],
  },
};

function normalizeGuidanceOwner(player: PlayerProfile) {
  if (player.cloudCareerId) return `career-${player.cloudCareerId}`;
  const normalizedName = (player.name || 'personagem')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalizedName || 'personagem';
}

function guidanceStorageKey(ownerKey: string) {
  return `${GUIDANCE_STORAGE_PREFIX}${ownerKey}`;
}

function readSeenGuidance(ownerKey: string): string[] {
  try {
    const raw = localStorage.getItem(guidanceStorageKey(ownerKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function hasSeenGuidance(ownerKey: string, guidanceKey: string) {
  return readSeenGuidance(ownerKey).includes(guidanceKey);
}

function markGuidanceAsSeen(ownerKey: string, guidanceKey: string) {
  try {
    const current = readSeenGuidance(ownerKey);
    if (current.includes(guidanceKey)) return;
    localStorage.setItem(guidanceStorageKey(ownerKey), JSON.stringify([...current, guidanceKey]));
  } catch {
    // A orientação continua funcional mesmo quando o armazenamento local está indisponível.
  }
}

function buildCaseGuidance(caseItem: LegalCase): NpcGuidanceStep[] {
  const occupation = caseItem.client.occupation?.trim();
  const clientPresentation = occupation
    ? `${caseItem.client.name}, ${occupation}`
    : caseItem.client.name;

  return [
    {
      eyebrow: 'Novo atendimento',
      text: `Temos um novo atendimento em ${caseItem.area}. A pessoa que procurou o escritório é ${clientPresentation}. ${caseItem.client.summary}`,
    },
    {
      eyebrow: 'Sua primeira leitura',
      text: `O atendimento foi classificado como ${caseItem.difficulty.toLowerCase()}. Antes de tirar qualquer conclusão, leia com atenção o relato, os fatos iniciais e as instruções que estão no dossiê.`,
    },
    {
      eyebrow: 'Agora é com você',
      text: 'Meu papel aqui é só encaminhar o atendimento. Eu não vou antecipar pistas nem sugerir a solução do caso: as diligências, a análise das provas e a estratégia jurídica serão responsabilidade sua.',
    },
  ];
}

export const OfficeHub: React.FC<OfficeHubProps> = ({
  player,
  onSelectCaseToView,
  onResumeActiveCase,
  onOpenCareerModal,
  onOpenAcademicModal,
  onOpenConcursoModal,
  onOpenOfficeModal,
  onOpenOabExam,
}) => {
  const currentTier = CAREER_TIERS[player.careerTier] || CAREER_TIERS.ESTAGIARIO;
  const needsOabExam =
    player.careerTier === 'ESTAGIARIO_SENIOR' &&
    player.casesSolved >= 4 &&
    !player.oabRegistration;
  const oabPreparation = getOabPreparationStatus({
    casesSolved: player.casesSolved,
    performance: player.officePerformance,
    discipline: player.officeDiscipline,
  });

  const guidanceOwnerKey = useMemo(
    () => normalizeGuidanceOwner(player),
    [player.cloudCareerId, player.name],
  );
  const [activeGuidance, setActiveGuidance] = useState<ActiveGuidance | null>(null);

  const unlockedCases = getAvailableCasesForCareer(GAME_CASES, player.careerTier);
  const availableCases = unlockedCases.filter((caseItem) => {
    const isCompleted = player.history.some(
      (historyItem) => historyItem.caseId === caseItem.id && historyItem.success
    );
    const isActive = player.activeCase?.caseId === caseItem.id;
    return !isCompleted || isActive;
  });

  const executeGuidanceAction = (guidance: ActiveGuidance) => {
    switch (guidance.action) {
      case 'CAREER':
        onOpenCareerModal();
        break;
      case 'ACADEMIC':
        onOpenAcademicModal();
        break;
      case 'MAGISTRATURA':
        onOpenConcursoModal();
        break;
      case 'OFFICE':
        onOpenOfficeModal();
        break;
      case 'CASE':
        if (guidance.caseItem) onSelectCaseToView(guidance.caseItem);
        break;
    }
  };

  const requestGuidance = (guidance: ActiveGuidance, soundKind: 'click' | 'paper' = 'click') => {
    if (soundKind === 'paper') sound.playPaper();
    else sound.playClick();

    if (hasSeenGuidance(guidanceOwnerKey, guidance.key)) {
      executeGuidanceAction(guidance);
      return;
    }

    setActiveGuidance(guidance);
  };

  const requestFeatureGuidance = (
    feature: 'career' | 'academic' | 'magistratura' | 'office',
    action: Exclude<GuidanceAction, 'CASE'>,
  ) => {
    const configuration = FEATURE_GUIDANCE[feature];
    requestGuidance({
      ...configuration,
      key: `feature:${feature}`,
      action,
    });
  };

  const requestCaseGuidance = (caseItem: LegalCase) => {
    requestGuidance(
      {
        key: `case:${caseItem.id}`,
        contextLabel: `${caseItem.code} • ${caseItem.area}`,
        dialogues: buildCaseGuidance(caseItem),
        finalActionLabel: 'Abrir dossiê do caso',
        action: 'CASE',
        caseItem,
      },
      'paper',
    );
  };

  const handleGuidanceComplete = () => {
    if (!activeGuidance) return;

    const completedGuidance = activeGuidance;
    markGuidanceAsSeen(guidanceOwnerKey, completedGuidance.key);
    setActiveGuidance(null);

    window.setTimeout(() => {
      executeGuidanceAction(completedGuidance);
    }, 120);
  };

  return (
    <>
      {activeGuidance && (
        <NpcGuidanceDialog
          isOpen
          npcName="Mariana Duarte"
          npcRole="Secretária do Escritório"
          portraitSrc="/personagens/mariana-duarte.png"
          portraitAlt="Mariana Duarte, secretária do escritório Ramos & Associados"
          contextLabel={activeGuidance.contextLabel}
          dialogues={activeGuidance.dialogues}
          finalActionLabel={activeGuidance.finalActionLabel}
          onComplete={handleGuidanceComplete}
        />
      )}

      <div className="w-full space-y-6">
        <div className="p-6 bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#1A1A1D] border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059] shrink-0 shadow-inner">
              <Scale size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/25 uppercase tracking-wider">
                  Gabinete Jurídico • Ramos & Associados
                </span>
                <span className="text-xs text-[#888888] font-mono">
                  {String(player.gameCurrentDay).padStart(2, '0')}/{String(player.gameCurrentMonth).padStart(2, '0')}/{player.gameCurrentYear}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-[#E0E0E0] mt-1.5 tracking-tight">
                Olá, {player.name || 'Doutor'}!
              </h2>
              <p className="text-xs sm:text-sm text-[#AAAAAA] mt-1 max-w-xl leading-relaxed">
                Você está atuando como <strong className="text-[#C5A059] font-semibold">{currentTier.title}</strong>.
                {player.careerTier === 'ESTAGIARIO' &&
                  ' Sua promoção agora depende do conjunto da atuação: casos, experiência, tarefas supervisionadas, diligência e confiança do Dr. Roberto.'}
                {player.careerTier === 'ESTAGIARIO_SENIOR' && player.casesSolved < 4 &&
                  ' A autonomia aumentou. Consolide sua técnica, cumpra responsabilidades de Sênior e avance até o marco do Exame da Ordem.'}
                {needsOabExam &&
                  ' O marco do Exame da Ordem foi liberado. A avaliação interna do escritório continua indicando o seu nível de preparação antes da prova.'}
                {player.careerTier !== 'ESTAGIARIO' && player.careerTier !== 'ESTAGIARIO_SENIOR' &&
                  ' Continue acumulando experiência jurídica para avançar na carreira.'}
              </p>
            </div>
          </div>

          {player.activeCase ? (
            <button
              onClick={() => {
                sound.playPaper();
                onResumeActiveCase();
              }}
              className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-[#C5A059] hover:bg-[#D4B475] text-[#0A0A0B] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#C5A059]/20 transition-all cursor-pointer transform active:scale-98 shrink-0 tracking-wide uppercase"
            >
              <Clock size={16} />
              <span>Continuar Caso em Andamento</span>
              <ArrowRight size={16} />
            </button>
          ) : null}
        </div>

        {needsOabExam && (
          <section className="rounded-2xl border border-[#C5A059]/45 bg-gradient-to-br from-[#C5A059]/[0.10] to-[#111113] p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl border border-[#C5A059]/35 bg-[#0D0D0F] text-[#C5A059] flex items-center justify-center shrink-0">
                  <BookOpenCheck size={27} />
                </div>
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="px-2 py-1 rounded-md bg-[#C5A059]/10 border border-[#C5A059]/25 text-[#C5A059] text-[9px] font-black uppercase tracking-wider font-mono">
                      Marco de carreira
                    </span>
                    <span className="px-2 py-1 rounded-md bg-[#60A5FA]/10 border border-[#60A5FA]/25 text-[#93C5FD] text-[9px] font-black uppercase tracking-wider font-mono">
                      Simulado real • 46º EOU • 2026
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-serif font-black text-[#F1EFE9]">
                    Exame da Ordem desbloqueado
                  </h3>
                  <p className="text-xs sm:text-sm text-[#C9C2B1] mt-2 max-w-2xl leading-relaxed">
                    Você atingiu o marco prático mínimo de Estagiário Sênior. Para avançar, realizará um
                    <strong className="text-[#F2DCA9]"> simulado baseado no 46º Exame de Ordem Unificado real, aplicado em 2026</strong>,
                    com 80 questões e correção automática.
                  </p>
                  <p className={`text-[11px] mt-2 max-w-2xl ${oabPreparation.ready ? 'text-[#7FC5A7]' : 'text-[#C2A96E]'}`}>
                    {oabPreparation.ready
                      ? 'Avaliação interna: o Dr. Roberto considera sua preparação profissional adequada para enfrentar a prova.'
                      : `Avaliação interna: preparação em ${oabPreparation.progressPercent}%. Você pode tentar o exame, mas o escritório recomenda concluir mais responsabilidades de Sênior.`}
                  </p>
                  <p className="text-[11px] text-[#8F8B81] mt-2 max-w-2xl">
                    A aprovação e a inscrição emitida existem somente dentro do personagem do Rota da Justiça e não equivalem a credencial profissional real.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  sound.playPaper();
                  onOpenOabExam();
                }}
                className="w-full lg:w-auto px-6 py-3.5 rounded-xl bg-[#C5A059] hover:bg-[#D6B66F] text-[#09090A] font-black uppercase tracking-wide text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-lg shadow-[#C5A059]/15"
              >
                <Scale size={17} />
                Realizar Exame da Ordem
              </button>
            </div>
          </section>
        )}

        {player.oabRegistration && (
          <section className="rounded-xl border border-[#34D399]/25 bg-[#34D399]/[0.05] p-4 flex items-start gap-3">
            <ShieldCheck size={20} className="text-[#34D399] shrink-0 mt-0.5" />
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#34D399] font-black font-mono">
                Inscrição profissional do personagem • fictícia
              </div>
              <div className="font-mono font-black text-[#D5FFF0] mt-1">{player.oabRegistration.code}</div>
              <p className="text-[10px] text-[#83B5A3] mt-1">
                Emitida após aprovação no simulado do {player.oabRegistration.examTitle}. Não corresponde a inscrição real perante a OAB.
              </p>
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => requestFeatureGuidance('career', 'CAREER')}
            className="p-4 bg-[#161618] hover:bg-[#1A1A1D] border border-[#2A2A2E] hover:border-[#C5A059]/50 rounded-xl text-left transition-all cursor-pointer shadow-md group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1A1A1D] border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059] mb-2 group-hover:scale-105 transition-transform">
              <Award size={18} />
            </div>
            <span className="text-[10px] text-[#888888] uppercase tracking-wider font-mono block">Progressão</span>
            <h4 className="font-bold text-xs sm:text-sm text-[#E0E0E0] group-hover:text-[#C5A059] transition-colors">
              Plano de Carreira
            </h4>
          </button>

          <button
            onClick={() => requestFeatureGuidance('academic', 'ACADEMIC')}
            className="p-4 bg-[#161618] hover:bg-[#1A1A1D] border border-[#2A2A2E] hover:border-[#60A5FA]/50 rounded-xl text-left transition-all cursor-pointer shadow-md group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1A1A1D] border border-[#60A5FA]/30 flex items-center justify-center text-[#60A5FA] mb-2 group-hover:scale-105 transition-transform">
              <GraduationCap size={18} />
            </div>
            <span className="text-[10px] text-[#888888] uppercase tracking-wider font-mono block">Titulação</span>
            <h4 className="font-bold text-xs sm:text-sm text-[#E0E0E0] group-hover:text-[#60A5FA] transition-colors">
              Carreira Acadêmica
            </h4>
          </button>

          <button
            onClick={() => requestFeatureGuidance('magistratura', 'MAGISTRATURA')}
            className="p-4 bg-[#161618] hover:bg-[#1A1A1D] border border-[#2A2A2E] hover:border-[#F87171]/50 rounded-xl text-left transition-all cursor-pointer shadow-md group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1A1A1D] border border-[#F87171]/30 flex items-center justify-center text-[#F87171] mb-2 group-hover:scale-105 transition-transform">
              <Landmark size={18} />
            </div>
            <span className="text-[10px] text-[#888888] uppercase tracking-wider font-mono block">Setor Público</span>
            <h4 className="font-bold text-xs sm:text-sm text-[#E0E0E0] group-hover:text-[#F87171] transition-colors">
              Magistratura
            </h4>
          </button>

          <button
            onClick={() => requestFeatureGuidance('office', 'OFFICE')}
            className="p-4 bg-[#161618] hover:bg-[#1A1A1D] border border-[#2A2A2E] hover:border-[#34D399]/50 rounded-xl text-left transition-all cursor-pointer shadow-md group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1A1A1D] border border-[#34D399]/30 flex items-center justify-center text-[#34D399] mb-2 group-hover:scale-105 transition-transform">
              <Building size={18} />
            </div>
            <span className="text-[10px] text-[#888888] uppercase tracking-wider font-mono block">Empreender</span>
            <h4 className="font-bold text-xs sm:text-sm text-[#E0E0E0] group-hover:text-[#34D399] transition-colors">
              Meu Escritório
            </h4>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Briefcase size={18} className="text-[#C5A059]" />
              <h3 className="text-base sm:text-lg font-bold font-serif text-[#E0E0E0]">
                Casos Jurídicos Disponíveis para Atendimento
              </h3>
            </div>
            <span className="text-xs text-[#888888] font-mono text-right">
              {availableCases.length} disponíveis • {GAME_CASES.length} no acervo
            </span>
          </div>

          {availableCases.length === 0 ? (
            <div className="p-5 rounded-xl border border-[#2A2A2E] bg-[#111113] text-sm text-[#AAAAAA]">
              {needsOabExam
                ? 'Você concluiu os atendimentos disponíveis como Estagiário Sênior. O Exame da Ordem já está disponível como próximo marco formal da carreira.'
                : 'Não há novos casos liberados para o seu nível neste momento. Consulte o histórico ou avance na carreira para desbloquear novos atendimentos.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableCases.map((c) => {
                const isActive = player.activeCase?.caseId === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => requestCaseGuidance(c)}
                    className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'bg-[#1A1A1D] border-[#C5A059] ring-1 ring-[#C5A059]/50 shadow-xl'
                        : 'bg-[#161618] hover:bg-[#1A1A1D] border-[#2A2A2E] hover:border-[#C5A059]/50 shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0A0A0B] text-[#C5A059] border border-[#2A2A2E]">
                          {c.code}
                        </span>
                        {isActive ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C5A059] text-[#0A0A0B] font-bold uppercase tracking-wider">
                            Em Diligência
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1A1A1D] text-[#888888] border border-[#2A2A2E]">
                            {c.difficulty}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm sm:text-base text-[#E0E0E0] mt-2.5 line-clamp-2 leading-snug">
                        {c.title}
                      </h4>
                      <span className="text-[11px] text-[#C5A059] font-mono block mt-1">
                        {c.area}
                      </span>

                      <p className="text-xs text-[#AAAAAA] mt-2 line-clamp-3 leading-relaxed">
                        {c.client.summary}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#2A2A2E] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-mono text-[#34D399] font-bold">
                        <span>R$ {c.honorariosReward.toLocaleString('pt-BR')}</span>
                        <span className="text-[#444]">•</span>
                        <span className="text-[#60A5FA] font-semibold">+{c.xpReward} XP</span>
                      </div>

                      <span className="text-[#C5A059] font-semibold flex items-center gap-1 text-[11px] tracking-wide">
                        Ver Dossiê →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {player.history.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <History size={16} className="text-[#888888]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#888888]">
                Histórico de Sentenças Julgadas:
              </h3>
            </div>

            <div className="space-y-2">
              {player.history.map((record, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#111113] rounded-xl border border-[#2A2A2E] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                          record.success
                            ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30'
                            : 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30'
                        }`}
                      >
                        {record.verdict}
                      </span>
                      <h5 className="font-bold text-[#E0E0E0]">{record.caseTitle}</h5>
                    </div>
                    <p className="text-[11px] text-[#888888] italic mt-0.5">"{record.judgeFeedback}"</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                    <span className="text-[#34D399] font-bold">+R$ {record.earnedMoney.toLocaleString('pt-BR')}</span>
                    <span className="text-[#60A5FA] font-bold">+{record.earnedXp} XP</span>
                    <span className="text-[#888888]">{record.completedDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
