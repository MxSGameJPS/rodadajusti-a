import { CAREER_TIERS } from '../data/careers';
import type { CaseHistoryRecord, CareerTierId, LegalCase, PlayerProfile } from '../types/game';
import { getCaseRepercussionLevel, getProceduralStage } from './caseMetadata';
import {
  getInternPromotionStatus,
  getOabPreparationStatus,
  normalizeOfficePerformance,
} from './internCareerEngine';

export interface CareerMomentumRequirement {
  id: string;
  label: string;
  current: string;
  met: boolean;
}

export interface CareerMomentumUnlock {
  id: string;
  title: string;
  description: string;
  hidden?: boolean;
}

export interface CareerMomentumSnapshot {
  currentTitle: string;
  nextTitle: string;
  eyebrow: string;
  progressPercent: number;
  progressLabel: string;
  narrative: string;
  npcName: string;
  npcRole: string;
  npcQuote: string;
  requirements: CareerMomentumRequirement[];
  unlocks: CareerMomentumUnlock[];
}

export interface CareerVerdictHook {
  title: string;
  message: string;
  npcName: string;
  npcQuote: string;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function progressBetween(value: number, start: number, target: number) {
  if (target <= start) return value >= target ? 100 : 0;
  return clampPercent(((value - start) / (target - start)) * 100);
}

function metricRequirement(id: string, label: string, current: number, target: number): CareerMomentumRequirement {
  return {
    id,
    label,
    current: `${Math.max(0, Math.floor(current))}/${target}`,
    met: current >= target,
  };
}

function careerIndicators(player: PlayerProfile, nextTierId: CareerTierId): CareerMomentumRequirement[] {
  const next = CAREER_TIERS[nextTierId];
  return [
    metricRequirement('cases', 'Casos vencidos', player.casesSolved, next.minCasesSolved),
    metricRequirement('xp', 'Experiência acumulada', player.xp, next.minXp),
    metricRequirement('reputation', 'Reputação profissional', player.reputation, next.minReputation),
  ];
}

const SHARED_MYSTERIES: CareerMomentumUnlock[] = [
  {
    id: 'life-upgrade',
    title: 'Padrão de vida',
    description: 'Seu sucesso profissional também vai começar a aparecer fora do escritório.',
    hidden: true,
  },
  {
    id: 'unknown-opportunity',
    title: 'Oportunidade ainda oculta',
    description: 'Algumas decisões e convites só aparecem quando sua carreira chega ao nível certo.',
    hidden: true,
  },
];

export function getCareerMomentum(player: PlayerProfile): CareerMomentumSnapshot {
  const current = CAREER_TIERS[player.careerTier] || CAREER_TIERS.ESTAGIARIO;
  const performance = normalizeOfficePerformance(player.officePerformance);

  if (player.careerTier === 'ESTAGIARIO') {
    const promotion = getInternPromotionStatus({
      casesSolved: player.casesSolved,
      xp: player.xp,
      performance,
      discipline: player.officeDiscipline,
    });

    return {
      currentTitle: current.title,
      nextTitle: 'Estagiário Sênior',
      eyebrow: 'Próxima grande conquista',
      progressPercent: promotion.progressPercent,
      progressLabel: 'Confiança crescente dentro do Ramos & Associados',
      narrative: 'Você ainda está aprendendo, mas já começou a deixar de ser apenas alguém que acompanha o trabalho dos outros.',
      npcName: 'Dr. Roberto Ramos',
      npcRole: 'Sócio fundador',
      npcQuote: promotion.progressPercent >= 70
        ? 'Continue nesse ritmo. Logo eu não vou precisar conferir cada passo seu antes de colocar uma responsabilidade maior na sua mesa.'
        : 'Quero ver consistência. Técnica, prazo e responsabilidade são o que transformam um estagiário em alguém em quem o escritório pode confiar.',
      requirements: promotion.requirements.map((item) => ({
        id: item.id,
        label: item.label,
        current: String(item.current),
        met: item.met,
      })),
      unlocks: [
        {
          id: 'senior-autonomy',
          title: 'Mais autonomia',
          description: 'Atividades mais complexas e menos dependência de supervisão a cada decisão.',
        },
        {
          id: 'oab-horizon',
          title: 'A OAB começa a aparecer no horizonte',
          description: 'A próxima grande barreira deixa de ser apenas o estágio e passa a ser a advocacia profissional.',
        },
        ...SHARED_MYSTERIES.slice(1),
      ],
    };
  }

  if (player.careerTier === 'ESTAGIARIO_SENIOR') {
    const preparation = getOabPreparationStatus({
      casesSolved: player.casesSolved,
      performance,
      discipline: player.officeDiscipline,
    });

    return {
      currentTitle: current.title,
      nextTitle: 'Advocacia • aprovação na OAB',
      eyebrow: 'O próximo capítulo está perto',
      progressPercent: preparation.progressPercent,
      progressLabel: preparation.ready ? 'Preparação interna considerada adequada' : 'Construindo maturidade para deixar o estágio',
      narrative: 'Você já conquistou espaço no escritório. Agora existe uma porta que muda completamente a sua carreira: deixar de auxiliar advogados e se tornar um deles.',
      npcName: 'Mariana Duarte',
      npcRole: 'Secretária do escritório',
      npcQuote: preparation.ready
        ? 'Você percebeu que o Dr. Roberto já fala com você de outro jeito? Acho que ele está esperando a sua OAB para conversar sobre o que vem depois.'
        : 'Você está bem mais perto da advocacia do que quando entrou aqui. Só não deixa a ansiedade fazer você pular etapas.',
      requirements: preparation.requirements.map((item) => ({
        id: item.id,
        label: item.label,
        current: String(item.current),
        met: item.met,
      })),
      unlocks: [
        {
          id: 'lawyer-contract',
          title: 'Contrato como advogado',
          description: 'Assinar peças, atuar com autonomia e assumir responsabilidade profissional real dentro do jogo.',
        },
        {
          id: 'professional-devices',
          title: 'Rotina profissional completa',
          description: 'Notebook, Social Jurídico, celular, CRM, clientes e prazos passam a fazer parte da sua rotina.',
        },
        ...SHARED_MYSTERIES,
      ],
    };
  }

  if (player.careerTier === 'ADVOGADO_CONTRATADO') {
    const target = CAREER_TIERS.ADVOGADO_SENIOR;
    const progress = progressBetween(player.casesSolved, CAREER_TIERS.ADVOGADO_CONTRATADO.minCasesSolved, target.minCasesSolved);
    return {
      currentTitle: current.title,
      nextTitle: 'Advogado Sênior',
      eyebrow: 'Sua carreira está chamando atenção',
      progressPercent: progress,
      progressLabel: `${player.casesSolved}/${target.minCasesSolved} vitórias rumo à próxima responsabilidade`,
      narrative: 'Você já é advogado. A pergunta agora não é mais se consegue atuar, mas até onde o escritório vai confiar em você quando os casos ficarem maiores.',
      npcName: 'Dr. Roberto Ramos',
      npcRole: 'Sócio responsável',
      npcQuote: progress >= 70
        ? 'Os casos que estão chegando na sua mesa já não são os mesmos do começo. Continue entregando resultado e vamos conversar sobre responsabilidades maiores.'
        : 'Construa uma sequência de bons trabalhos. Eu preciso saber quem aguenta pressão antes de entregar os processos que definem a reputação do escritório.',
      requirements: careerIndicators(player, 'ADVOGADO_SENIOR'),
      unlocks: [
        {
          id: 'high-impact',
          title: 'Casos de maior repercussão',
          description: 'Clientes mais importantes, conflitos mais difíceis e processos que podem mudar sua reputação de uma vez.',
        },
        {
          id: 'leadership',
          title: 'Liderança técnica',
          description: 'Você deixa de ser apenas executor e começa a influenciar estratégia e decisões internas.',
        },
        {
          id: 'office-path',
          title: 'Caminho para sociedade e escritório próprio',
          description: 'O nome na carteira pode, mais adiante, virar nome na porta.',
          hidden: true,
        },
        ...SHARED_MYSTERIES,
      ],
    };
  }

  if (player.careerTier === 'ADVOGADO_SENIOR') {
    const target = CAREER_TIERS.SOCIO_ESCRITORIO;
    const progress = progressBetween(player.casesSolved, CAREER_TIERS.ADVOGADO_SENIOR.minCasesSolved, target.minCasesSolved);
    return {
      currentTitle: current.title,
      nextTitle: 'Sócio do Escritório',
      eyebrow: 'Você já não é apenas funcionário',
      progressPercent: progress,
      progressLabel: `${player.casesSolved}/${target.minCasesSolved} vitórias antes da conversa mais importante da carreira`,
      narrative: 'Seu trabalho já influencia o escritório. A próxima mudança não é só salarial: é passar a participar do lugar onde as decisões são tomadas.',
      npcName: 'Mariana Duarte',
      npcRole: 'Secretária do escritório',
      npcQuote: progress >= 70
        ? 'Tem cliente pedindo para falar especificamente com você. E eu não sei se você percebeu, mas o Dr. Roberto anda comentando seu nome nas reuniões fechadas.'
        : 'Você já tem gente no escritório olhando para o seu trabalho como referência. Isso não acontecia quando você chegou aqui.',
      requirements: careerIndicators(player, 'SOCIO_ESCRITORIO'),
      unlocks: [
        {
          id: 'partnership',
          title: 'Participar das decisões do escritório',
          description: 'Sociedade, distribuição de resultados e influência institucional entram no jogo.',
        },
        {
          id: 'own-office',
          title: 'A pergunta inevitável',
          description: 'Continuar crescendo no Ramos & Associados ou construir algo com o seu próprio nome?',
          hidden: true,
        },
        ...SHARED_MYSTERIES,
      ],
    };
  }

  if (player.careerTier === 'SOCIO_ESCRITORIO') {
    const target = CAREER_TIERS.DONO_ESCRITORIO;
    const caseProgress = Math.max(75, progressBetween(player.casesSolved, target.minCasesSolved, Math.max(target.minCasesSolved + 6, 20)));
    return {
      currentTitle: current.title,
      nextTitle: 'Escritório Próprio',
      eyebrow: 'Seu nome pode ir para a fachada',
      progressPercent: caseProgress,
      progressLabel: 'A próxima decisão é estratégica, não apenas uma promoção',
      narrative: 'Você conquistou sociedade. A partir daqui, crescer também significa decidir quanto risco está disposto a assumir para construir patrimônio e uma marca própria.',
      npcName: 'Dr. Roberto Ramos',
      npcRole: 'Sócio fundador',
      npcQuote: 'Chega um momento em que todo bom advogado precisa decidir se quer ser parte de uma grande estrutura ou construir uma que carregue a própria visão.',
      requirements: [
        metricRequirement('money', 'Capital disponível', player.money, 50000),
        metricRequirement('reputation', 'Reputação profissional', player.reputation, target.minReputation),
        metricRequirement('xp', 'Experiência acumulada', player.xp, target.minXp),
      ],
      unlocks: [
        {
          id: 'own-brand',
          title: 'Marca própria',
          description: 'Nome, estrutura, equipe, custos e crescimento passam a depender diretamente das suas escolhas.',
        },
        {
          id: 'team',
          title: 'Sua própria equipe',
          description: 'Contratar profissionais, distribuir trabalho e transformar honorários em operação.',
        },
        ...SHARED_MYSTERIES,
      ],
    };
  }

  if (player.careerTier === 'DONO_ESCRITORIO') {
    const employees = player.officeFinances?.employees?.length || 0;
    const progress = clampPercent((Math.min(100, player.reputation) * 0.45) + (Math.min(10, employees) * 5.5));
    return {
      currentTitle: current.title,
      nextTitle: 'Escritório de referência',
      eyebrow: 'Agora o jogo é construir legado',
      progressPercent: progress,
      progressLabel: `${employees} profissionais na equipe • reputação ${player.reputation}/100`,
      narrative: 'Você já abriu a própria porta. O próximo desafio é fazer clientes, profissionais e mercado reconhecerem o nome do seu escritório antes mesmo de reconhecerem o seu rosto.',
      npcName: 'Mariana Duarte',
      npcRole: 'Contato de longa data',
      npcQuote: 'Lembra quando você esperava um caso aparecer no CRM? Agora tem gente esperando uma vaga para trabalhar com você.',
      requirements: [
        metricRequirement('team', 'Equipe formada', employees, 6),
        metricRequirement('reputation', 'Reputação', player.reputation, 90),
        metricRequirement('xp', 'Experiência', player.xp, 7000),
      ],
      unlocks: [
        {
          id: 'branches',
          title: 'Expansão e filiais',
          description: 'A operação deixa de caber em uma única sala e começa a virar estrutura empresarial.',
        },
        {
          id: 'national-clients',
          title: 'Clientes de alcance nacional',
          description: 'Seu escritório pode começar a disputar casos que antes pareciam reservados aos grandes nomes do mercado.',
        },
        ...SHARED_MYSTERIES,
      ],
    };
  }

  const magistrateNext: Partial<Record<CareerTierId, CareerTierId>> = {
    MAGISTRADO_SUBSTITUTO: 'JUIZ_TITULAR',
    JUIZ_TITULAR: 'DESEMBARGADOR',
    DESEMBARGADOR: 'MINISTRO_STF',
  };
  const nextMagistrateTier = magistrateNext[player.careerTier];

  if (nextMagistrateTier) {
    const next = CAREER_TIERS[nextMagistrateTier];
    const progress = clampPercent(
      (Math.min(1, player.casesSolved / Math.max(1, next.minCasesSolved)) * 45 +
        Math.min(1, player.xp / Math.max(1, next.minXp)) * 30 +
        Math.min(1, player.reputation / Math.max(1, next.minReputation)) * 25) * 100,
    );
    return {
      currentTitle: current.title,
      nextTitle: next.title,
      eyebrow: 'A carreira pública também tem um próximo degrau',
      progressPercent: progress,
      progressLabel: 'Experiência, reputação e decisões acumuladas',
      narrative: 'Na magistratura, cada avanço amplia o alcance das decisões e o peso institucional da sua trajetória.',
      npcName: 'Carreira da Magistratura',
      npcRole: 'Progressão institucional',
      npcQuote: 'Quanto mais alto o tribunal, menos uma decisão afeta apenas um processo. Ela pode orientar milhares deles.',
      requirements: careerIndicators(player, nextMagistrateTier),
      unlocks: [
        {
          id: 'higher-court',
          title: next.title,
          description: next.description,
        },
        ...SHARED_MYSTERIES,
      ],
    };
  }

  return {
    currentTitle: current.title,
    nextTitle: 'Legado jurídico',
    eyebrow: 'Você chegou ao topo — mas não ao fim',
    progressPercent: 100,
    progressLabel: 'Carreira máxima alcançada',
    narrative: 'A partir daqui, o objetivo deixa de ser subir de cargo e passa a ser construir os momentos que vão definir a biografia do personagem.',
    npcName: 'Rota da Justiça',
    npcRole: 'Trajetória',
    npcQuote: 'O cargo mais alto não encerra a história. Ele muda o tipo de história que você pode deixar para trás.',
    requirements: [],
    unlocks: [
      {
        id: 'legacy',
        title: 'Casos marcantes e legado',
        description: 'Repercussão, decisões históricas e patrimônio passam a representar o tamanho da trajetória construída.',
      },
      ...SHARED_MYSTERIES,
    ],
  };
}

export function getVerdictCareerHook(
  player: PlayerProfile,
  result: CaseHistoryRecord,
  currentCase: LegalCase,
  promotedToTier: CareerTierId | null,
): CareerVerdictHook {
  const momentum = getCareerMomentum(player);
  const stage = getProceduralStage(currentCase);
  const repercussion = getCaseRepercussionLevel(currentCase);

  if (promotedToTier) {
    return {
      title: 'Você abriu uma nova porta',
      message: `A promoção para ${CAREER_TIERS[promotedToTier]?.title || momentum.currentTitle} muda o tipo de oportunidade que pode aparecer a partir de agora. Nem tudo já está visível.`,
      npcName: momentum.npcName,
      npcQuote: momentum.npcQuote,
    };
  }

  if (result.success && (repercussion === 'GRANDE_REPERCUSSAO' || repercussion === 'NACIONAL')) {
    return {
      title: 'Esse resultado colocou seu nome em outra conversa',
      message: 'Casos de repercussão não rendem apenas XP. Eles aceleram a sensação de que clientes maiores, decisões mais difíceis e oportunidades raras estão começando a se aproximar.',
      npcName: 'Dr. Roberto Ramos',
      npcQuote: 'Ganhar um processo é bom. Ganhar quando todo mundo está olhando é outra coisa. Continue preparado para o que isso pode trazer.',
    };
  }

  if (result.success && stage !== 'PRIMEIRA_INSTANCIA') {
    return {
      title: 'Você está aprendendo a vencer onde o jogo fica mais difícil',
      message: 'Atuar em recurso muda o peso técnico da carreira. Quanto mais alto o processo sobe, mais raro fica encontrar advogados preparados para continuar.',
      npcName: 'Dr. Roberto Ramos',
      npcQuote: 'Primeira instância forma advogado. Recurso mostra quem consegue sustentar uma tese quando ela já foi atacada, julgada e precisa sobreviver de novo.',
    };
  }

  if (!result.success) {
    return {
      title: 'Uma derrota pode abrir o próximo capítulo',
      message: 'O caso não desaparece só porque a decisão foi desfavorável. Se houver caminho recursal, esta derrota pode voltar mais tarde como uma oportunidade de virar o processo em outra instância.',
      npcName: 'Mariana Duarte',
      npcQuote: 'Não apaga esse processo da cabeça. Dependendo da decisão e do prazo, ele pode voltar para a sua mesa de um jeito bem diferente.',
    };
  }

  return {
    title: 'Você ganhou esta etapa. Agora olhe um pouco mais adiante.',
    message: `A próxima grande conquista é ${momentum.nextTitle}. O jogo não vai revelar tudo agora, mas seus resultados já estão aproximando oportunidades que ainda aparecem bloqueadas.`,
    npcName: momentum.npcName,
    npcQuote: momentum.npcQuote,
  };
}
