import type { LegalCase, PlayerProfile } from '../types/game';
import { GAME_CASES } from '../data/cases';
import {
  applyProfessionalConsequence,
  getProfessionalOwnerKey,
  loadProfessionalProfile,
  saveProfessionalProfile,
  type ProfessionalAttributeId,
  type ProfessionalConsequence,
  type ProfessionalModifier,
  type ProfessionalRpgProfile,
  type ProfessionalTrait,
} from './professionalRpg';
import {
  isProfessionalPracticeBlocked,
  loadDisciplinaryState,
  registerDisciplinaryIncident,
  type RegisterDisciplinaryIncidentInput,
} from './disciplinarySystem';

export type EthicalChoiceTone = 'ethical' | 'gray' | 'corrupt';

export interface EthicalDilemmaChoice {
  id: string;
  label: string;
  description: string;
  tone: EthicalChoiceTone;
  consequence: ProfessionalConsequence;
  visibleSummary: string[];
  primaryAttribute?: ProfessionalAttributeId;
  immediateRisk?: number;
  incident?: RegisterDisciplinaryIncidentInput;
  outcomeText: string;
}

export interface EthicalDilemmaDefinition {
  id: string;
  title: string;
  kicker: string;
  narrative: string;
  warning: string;
  minSlot?: number;
  matches: (caseData: LegalCase) => boolean;
  choices: EthicalDilemmaChoice[];
}

export interface EthicalDilemmaRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  caseId: string;
  caseTitle: string;
  slot: number;
  choiceId: string;
  choiceLabel: string;
  tone: EthicalChoiceTone;
  complication: boolean;
  resolvedAt: string;
}

export interface PendingEthicalDilemma {
  eventId: string;
  caseId: string;
  slot: number;
  openedAt: string;
}

export interface EthicalDilemmaState {
  version: 1;
  ownerKey: string;
  pending: PendingEthicalDilemma | null;
  records: EthicalDilemmaRecord[];
  resolvedSlots: Record<string, number[]>;
}

export interface EthicalChoiceResolution {
  state: EthicalDilemmaState;
  profile: ProfessionalRpgProfile;
  record: EthicalDilemmaRecord;
  event: EthicalDilemmaDefinition;
  choice: EthicalDilemmaChoice;
  complication: boolean;
  resultText: string;
}

const STORAGE_PREFIX = 'rota_ethical_dilemmas_v1:';
const LAWYER_TIERS = new Set([
  'ADVOGADO_CONTRATADO',
  'ADVOGADO_SENIOR',
  'SOCIO_ESCRITORIO',
  'DONO_ESCRITORIO',
]);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function storageKey(player: Pick<PlayerProfile, 'cloudCareerId' | 'name'>) {
  return `${STORAGE_PREFIX}${getProfessionalOwnerKey(player)}`;
}

function emptyState(player: Pick<PlayerProfile, 'cloudCareerId' | 'name'>): EthicalDilemmaState {
  return {
    version: 1,
    ownerKey: getProfessionalOwnerKey(player),
    pending: null,
    records: [],
    resolvedSlots: {},
  };
}

function makeTrait(
  id: string,
  name: string,
  description: string,
  polarity: ProfessionalTrait['polarity'],
  source: string,
): ProfessionalTrait {
  return { id, name, description, polarity, source, acquiredAt: new Date().toISOString() };
}

function makeModifier(
  id: string,
  attributeId: ProfessionalAttributeId,
  amount: number,
  label: string,
  remainingCases: number,
): ProfessionalModifier {
  return { id, attributeId, amount, label, remainingCases };
}

const generic = () => true;
const hasLocationCategory = (category: string) => (caseData: LegalCase) =>
  caseData.locations.some((location) => location.category === category);
const areaIncludes = (...tokens: string[]) => (caseData: LegalCase) => {
  const haystack = `${caseData.area} ${caseData.title}`.toLowerCase();
  return tokens.some((token) => haystack.includes(token.toLowerCase()));
};
const anyMatch = (...matchers: Array<(caseData: LegalCase) => boolean>) => (caseData: LegalCase) =>
  matchers.some((matcher) => matcher(caseData));

const ETHICAL_DILEMMAS: EthicalDilemmaDefinition[] = [
  {
    id: 'police-evidence-adjustment',
    title: 'A proposta do policial',
    kicker: 'Delegacia • Bastidores da investigação',
    narrative: 'Um policial envolvido nas diligências insinua que poderia “ajustar” uma informação relevante do registro para tornar a narrativa do seu cliente mais favorável. Ele não promete resultado e deixa claro que a conversa não deve constar oficialmente.',
    warning: 'Manipular informação oficial pode gerar consequências disciplinares e criminais no universo do jogo.',
    minSlot: 1,
    matches: anyMatch(hasLocationCategory('delegacia'), areaIncludes('penal', 'criminal')),
    choices: [
      {
        id: 'refuse-and-document',
        label: 'Recusar e registrar a abordagem',
        description: 'Encerrar a conversa e preservar internamente um relato do ocorrido.',
        tone: 'ethical',
        consequence: {
          ethicsDelta: 2,
          characterDelta: 1,
          attributeXpDeltas: { SELF_CONTROL: 25, PERCEPTION: 25 },
        },
        visibleSummary: ['Ética +2', 'Autocontrole +25 XP', 'Percepção +25 XP'],
        outcomeText: 'Você encerra a conversa sem aceitar qualquer interferência no registro. A prova do processo continua exatamente como estava.',
      },
      {
        id: 'hear-without-commitment',
        label: 'Ouvir até o fim sem assumir compromisso',
        description: 'Você permite que ele explique a oferta, sem pedir alteração nem aceitar vantagem.',
        tone: 'gray',
        consequence: {
          ethicsDelta: -1,
          characterDelta: -1,
          exposureDelta: 3,
          attributeXpDeltas: { PERCEPTION: 25 },
        },
        visibleSummary: ['Ética -1', 'Índole afetada', 'Percepção +25 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'PERCEPTION',
        immediateRisk: 12,
        outcomeText: 'Você entende melhor o que estava sendo insinuado, mas a simples permanência nessa conversa cria um rastro desnecessário.',
      },
      {
        id: 'accept-adjustment',
        label: 'Aceitar o “ajuste” do registro',
        description: 'Você aceita que a informação oficial seja manipulada para favorecer a linha do caso.',
        tone: 'corrupt',
        consequence: {
          ethicsDelta: -18,
          characterDelta: -12,
          exposureDelta: 28,
          attributeXpDeltas: { INFLUENCE: 75 },
          addTraits: [makeTrait(
            'conhecido-nos-bastidores',
            'Conhecido nos Bastidores',
            'Pessoas dispostas a agir fora das regras passaram a enxergar seu personagem como alguém acessível a esse tipo de proposta.',
            'mixed',
            'Decisão questionável durante um caso',
          )],
        },
        visibleSummary: ['Ética -18', 'Índole fortemente afetada', 'Influência +75 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'INFLUENCE',
        immediateRisk: 58,
        incident: {
          title: 'Possível manipulação de registro oficial',
          description: 'Há indícios de que o advogado aceitou interferência indevida em informação produzida durante investigação policial.',
          severity: 5,
          evidenceWeight: 62,
        },
        outcomeText: 'Você aceita a proposta. Isso não adiciona pontos ao processo nem garante qualquer vitória; apenas cria uma nova camada de risco na trajetória do personagem.',
      },
    ],
  },
  {
    id: 'evidence-for-sale',
    title: 'A prova que apareceu “do nada”',
    kicker: 'Prova • Origem duvidosa',
    narrative: 'Um intermediário afirma possuir um documento muito conveniente para sua tese e oferece acesso mediante pagamento informal. Ele se recusa a explicar como obteve o material ou quem mais teve contato com ele.',
    warning: 'Material sem origem confiável pode ser falso, ilícito ou uma armadilha. O jogo não garante que ele ajude o caso.',
    matches: generic,
    choices: [
      {
        id: 'reject-suspicious-evidence',
        label: 'Recusar o material',
        description: 'Manter a investigação apenas em fontes cuja origem possa ser verificada.',
        tone: 'ethical',
        consequence: { ethicsDelta: 1, attributeXpDeltas: { INVESTIGATION: 25 } },
        visibleSummary: ['Ética +1', 'Investigação +25 XP'],
        outcomeText: 'Você rejeita o atalho. Nada muda automaticamente no conjunto de provas do caso.',
      },
      {
        id: 'inspect-without-using',
        label: 'Examinar sem utilizar no processo',
        description: 'Você verifica o conteúdo, mas decide não incorporar o material à estratégia enquanto a origem não puder ser confirmada.',
        tone: 'gray',
        consequence: {
          ethicsDelta: -1,
          exposureDelta: 4,
          attributeXpDeltas: { INVESTIGATION: 40, PERCEPTION: 20 },
        },
        visibleSummary: ['Ética -1', 'Investigação +40 XP', 'Percepção +20 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'INVESTIGATION',
        immediateRisk: 15,
        outcomeText: 'Você conhece o conteúdo, mas não o transforma em prova do caso. Ainda assim, o contato com a fonte deixa um pequeno rastro.',
      },
      {
        id: 'buy-and-use-evidence',
        label: 'Comprar e usar o material',
        description: 'Você aceita o documento mesmo sem conseguir comprovar a origem.',
        tone: 'corrupt',
        consequence: {
          ethicsDelta: -12,
          characterDelta: -7,
          exposureDelta: 22,
          attributeXpDeltas: { INVESTIGATION: 60 },
        },
        visibleSummary: ['Ética -12', 'Índole afetada', 'Investigação +60 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'INVESTIGATION',
        immediateRisk: 46,
        incident: {
          title: 'Aquisição de prova de origem ilícita ou desconhecida',
          description: 'O advogado teria aceitado material probatório sem cadeia de origem verificável, mediante vantagem informal.',
          severity: 4,
          evidenceWeight: 52,
        },
        outcomeText: 'Você aceita o material. O jogo registra a decisão, mas não transforma isso em vitória automática nem altera o placar do processo.',
      },
    ],
  },
  {
    id: 'witness-coaching',
    title: 'A testemunha “perfeita”',
    kicker: 'Testemunha • Pressão do cliente',
    narrative: 'Seu cliente sugere orientar uma testemunha a apresentar uma versão mais conveniente dos fatos. A pessoa conhece parte da história, mas não presenciou tudo que o cliente quer que ela confirme.',
    warning: 'Transformar uma testemunha em instrumento de narrativa falsa pode gerar exposição futura.',
    matches: generic,
    choices: [
      {
        id: 'prepare-truthful-testimony',
        label: 'Preparar apenas para relatar a verdade',
        description: 'Explicar o rito, mas deixar claro que a testemunha deve se limitar ao que efetivamente sabe.',
        tone: 'ethical',
        consequence: { ethicsDelta: 2, attributeXpDeltas: { PERSUASION: 25, SELF_CONTROL: 20 } },
        visibleSummary: ['Ética +2', 'Persuasão +25 XP', 'Autocontrole +20 XP'],
        outcomeText: 'Você prepara a testemunha para a situação processual sem alterar os fatos que ela conhece.',
      },
      {
        id: 'suggest-emphasis',
        label: 'Sugerir que ela “enfatize” alguns pontos',
        description: 'Você não inventa fatos diretamente, mas conduz a preparação até a fronteira do que a pessoa realmente lembra.',
        tone: 'gray',
        consequence: {
          ethicsDelta: -4,
          characterDelta: -2,
          exposureDelta: 8,
          attributeXpDeltas: { PERSUASION: 40 },
        },
        visibleSummary: ['Ética -4', 'Índole afetada', 'Persuasão +40 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'PERSUASION',
        immediateRisk: 24,
        outcomeText: 'A preparação fica agressiva e arriscada. Se a versão entrar em contradição, isso poderá reaparecer no futuro.',
      },
      {
        id: 'fabricate-testimony',
        label: 'Construir uma versão falsa com a testemunha',
        description: 'Você aceita que ela confirme fatos que não presenciou.',
        tone: 'corrupt',
        consequence: {
          ethicsDelta: -16,
          characterDelta: -10,
          exposureDelta: 25,
          attributeXpDeltas: { PERSUASION: 75 },
        },
        visibleSummary: ['Ética -16', 'Índole fortemente afetada', 'Persuasão +75 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'PERSUASION',
        immediateRisk: 54,
        incident: {
          title: 'Possível indução de testemunho falso',
          description: 'A investigação disciplinar pode apurar se o advogado participou da construção deliberada de versão testemunhal incompatível com os fatos conhecidos.',
          severity: 5,
          evidenceWeight: 58,
        },
        outcomeText: 'Você escolhe manipular a narrativa testemunhal. O processo não recebe bônus automático e o risco disciplinar cresce significativamente.',
      },
    ],
  },
  {
    id: 'hide-unfavorable-document',
    title: 'O documento que prejudica seu cliente',
    kicker: 'Estratégia • Dever profissional',
    narrative: 'Durante a preparação, surge um documento autêntico que enfraquece parte da versão apresentada pelo seu cliente. Ele pede que você “esqueça” que viu o material e continue sustentando a narrativa anterior.',
    warning: 'A forma como você lida com um fato desfavorável também compõe a identidade profissional do personagem.',
    matches: generic,
    choices: [
      {
        id: 'rebuild-strategy-honestly',
        label: 'Reformular a estratégia com base nos fatos',
        description: 'Reconstruir a tese sem fingir que o documento não existe.',
        tone: 'ethical',
        consequence: { ethicsDelta: 2, attributeXpDeltas: { LEGAL_KNOWLEDGE: 30, SELF_CONTROL: 20 } },
        visibleSummary: ['Ética +2', 'Conhecimento Jurídico +30 XP', 'Autocontrole +20 XP'],
        outcomeText: 'Você aceita que uma boa defesa também precisa sobreviver aos fatos ruins do próprio cliente.',
      },
      {
        id: 'avoid-mentioning',
        label: 'Evitar mencionar o documento enquanto puder',
        description: 'Você não falsifica o material, mas escolhe uma estratégia deliberadamente evasiva.',
        tone: 'gray',
        consequence: {
          ethicsDelta: -5,
          characterDelta: -2,
          exposureDelta: 7,
          attributeXpDeltas: { LEGAL_KNOWLEDGE: 25 },
        },
        visibleSummary: ['Ética -5', 'Índole afetada', 'Conhecimento Jurídico +25 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'LEGAL_KNOWLEDGE',
        immediateRisk: 22,
        outcomeText: 'Você escolhe uma postura evasiva. Ela pode não gerar problema imediato, mas passa a integrar o histórico moral da carreira.',
      },
      {
        id: 'alter-document-context',
        label: 'Manipular deliberadamente o contexto do documento',
        description: 'Você aceita apresentar uma versão enganosa sobre o significado do material autêntico.',
        tone: 'corrupt',
        consequence: {
          ethicsDelta: -13,
          characterDelta: -8,
          exposureDelta: 21,
          attributeXpDeltas: { LEGAL_KNOWLEDGE: 50 },
        },
        visibleSummary: ['Ética -13', 'Índole afetada', 'Conhecimento Jurídico +50 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'LEGAL_KNOWLEDGE',
        immediateRisk: 44,
        incident: {
          title: 'Possível fraude processual por distorção deliberada de prova',
          description: 'Há registro de decisão consciente de apresentar conteúdo probatório de forma enganosa ao processo.',
          severity: 4,
          evidenceWeight: 50,
        },
        outcomeText: 'Você cruza a linha entre estratégia e fraude. Isso não melhora automaticamente a decisão judicial do caso.',
      },
    ],
  },
  {
    id: 'expert-report-offer',
    title: 'O laudo sob encomenda',
    kicker: 'Perícia • Resultado conveniente',
    narrative: 'Um profissional ligado à perícia afirma que poderia produzir uma conclusão “mais alinhada” à tese do seu cliente, mesmo que os dados técnicos não sustentem integralmente aquela versão.',
    warning: 'O jogo trata laudos fraudulentos como infrações graves e não como uma habilidade especial.',
    minSlot: 1,
    matches: anyMatch(areaIncludes('prova digital', 'médic', 'trabalh', 'ambiental', 'empresarial'), (caseData) => caseData.availableClues.some((clue) => clue.type === 'pericia')),
    choices: [
      {
        id: 'demand-independent-report',
        label: 'Exigir conclusão técnica independente',
        description: 'Contratar ou aceitar apenas análise que possa ser sustentada pelos dados.',
        tone: 'ethical',
        consequence: { ethicsDelta: 2, attributeXpDeltas: { INVESTIGATION: 30, LEGAL_KNOWLEDGE: 20 } },
        visibleSummary: ['Ética +2', 'Investigação +30 XP', 'Conhecimento Jurídico +20 XP'],
        outcomeText: 'Você mantém a perícia independente, mesmo sem saber se ela ajudará a tese do cliente.',
      },
      {
        id: 'pressure-expert-language',
        label: 'Pressionar por linguagem mais favorável',
        description: 'Sem inventar dados, você tenta levar o profissional a escrever as conclusões de forma mais conveniente.',
        tone: 'gray',
        consequence: {
          ethicsDelta: -4,
          characterDelta: -2,
          exposureDelta: 7,
          attributeXpDeltas: { PERSUASION: 35 },
        },
        visibleSummary: ['Ética -4', 'Índole afetada', 'Persuasão +35 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'PERSUASION',
        immediateRisk: 22,
        outcomeText: 'Você pressiona a redação do laudo. A linha entre argumentação e interferência técnica fica mais tênue.',
      },
      {
        id: 'commission-false-report',
        label: 'Aceitar um laudo conscientemente falso',
        description: 'Você concorda com uma conclusão técnica que não corresponde aos dados conhecidos.',
        tone: 'corrupt',
        consequence: {
          ethicsDelta: -18,
          characterDelta: -11,
          exposureDelta: 30,
          attributeXpDeltas: { INFLUENCE: 60, INVESTIGATION: 40 },
        },
        visibleSummary: ['Ética -18', 'Índole fortemente afetada', 'Influência +60 XP', 'Investigação +40 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'INFLUENCE',
        immediateRisk: 62,
        incident: {
          title: 'Possível produção ou uso consciente de laudo falso',
          description: 'O advogado pode ter participado da obtenção de conclusão técnica incompatível com os dados reais do caso.',
          severity: 5,
          evidenceWeight: 68,
        },
        outcomeText: 'Você aceita o laudo. Ele não concede vitória automática e passa a ser uma das decisões mais perigosas da trajetória do personagem.',
      },
    ],
  },
  {
    id: 'court-backchannel',
    title: 'O contato no gabinete',
    kicker: 'Tribunal • Influência indevida',
    narrative: 'Um conhecido afirma ter acesso informal a alguém ligado ao gabinete responsável por uma decisão importante e sugere que poderia “fazer o processo ser olhado de outro jeito”. Não há garantia alguma de resultado.',
    warning: 'Tentar influenciar uma autoridade por via imprópria é uma escolha de altíssimo risco no jogo.',
    minSlot: 1,
    matches: anyMatch(hasLocationCategory('tribunal'), generic),
    choices: [
      {
        id: 'reject-backchannel',
        label: 'Recusar qualquer contato impróprio',
        description: 'Manter toda atuação nos canais processuais normais.',
        tone: 'ethical',
        consequence: { ethicsDelta: 2, characterDelta: 1, attributeXpDeltas: { SELF_CONTROL: 25 } },
        visibleSummary: ['Ética +2', 'Autocontrole +25 XP'],
        outcomeText: 'Você rejeita o contato. A decisão do processo continuará dependendo do que existe nos autos.',
      },
      {
        id: 'map-contact-network',
        label: 'Descobrir quem está por trás da oferta',
        description: 'Você não pede influência sobre a decisão, mas investiga a rede de relações que originou a proposta.',
        tone: 'gray',
        consequence: {
          ethicsDelta: -1,
          exposureDelta: 4,
          attributeXpDeltas: { PERCEPTION: 35, INFLUENCE: 20 },
        },
        visibleSummary: ['Ética -1', 'Percepção +35 XP', 'Influência +20 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'PERCEPTION',
        immediateRisk: 16,
        outcomeText: 'Você entende melhor a rede de influência, mas permanece próximo de um ambiente que pode gerar consequências futuras.',
      },
      {
        id: 'accept-improper-influence',
        label: 'Aceitar a tentativa de influência',
        description: 'Você autoriza o intermediário a tentar interferir informalmente na decisão.',
        tone: 'corrupt',
        consequence: {
          ethicsDelta: -20,
          characterDelta: -14,
          exposureDelta: 34,
          attributeXpDeltas: { INFLUENCE: 100 },
          addTraits: [makeTrait(
            'rede-de-influencia-questionavel',
            'Rede de Influência Questionável',
            'Seu personagem passou a circular por contatos que oferecem acesso impróprio a decisões e autoridades.',
            'negative',
            'Decisão questionável durante um caso',
          )],
        },
        visibleSummary: ['Ética -20', 'Índole severamente afetada', 'Influência +100 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'INFLUENCE',
        immediateRisk: 70,
        incident: {
          title: 'Possível tentativa de influenciar autoridade judicial',
          description: 'Há indícios de uso de intermediário para buscar interferência indevida em decisão relacionada a processo patrocinado pelo personagem.',
          severity: 5,
          evidenceWeight: 72,
        },
        outcomeText: 'Você aceita o contato. Nenhum bônus é aplicado ao placar do processo e não existe garantia de que a tentativa produza qualquer efeito.',
      },
    ],
  },
  {
    id: 'sealed-information',
    title: 'Informação que ainda não deveria estar com você',
    kicker: 'Sigilo • Informação privilegiada',
    narrative: 'Chega até você uma informação sigilosa relacionada ao conflito. A fonte pede anonimato e não existe, naquele momento, uma forma regular de comprovar como o dado foi obtido.',
    warning: 'Conhecer uma informação não significa que ela possa ser usada legitimamente.',
    matches: generic,
    choices: [
      {
        id: 'discard-leak',
        label: 'Não utilizar a informação',
        description: 'Preservar a estratégia apenas com elementos obtidos regularmente.',
        tone: 'ethical',
        consequence: { ethicsDelta: 1, attributeXpDeltas: { SELF_CONTROL: 20 } },
        visibleSummary: ['Ética +1', 'Autocontrole +20 XP'],
        outcomeText: 'Você não incorpora o vazamento à atuação profissional.',
      },
      {
        id: 'use-as-investigation-lead',
        label: 'Usar apenas como pista para buscar fonte legítima',
        description: 'Você não apresenta o vazamento, mas procura confirmar a informação por meios regulares.',
        tone: 'gray',
        consequence: {
          ethicsDelta: -2,
          exposureDelta: 5,
          attributeXpDeltas: { INVESTIGATION: 45 },
        },
        visibleSummary: ['Ética -2', 'Investigação +45 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'INVESTIGATION',
        immediateRisk: 18,
        outcomeText: 'Você trata o vazamento apenas como uma pista. Se conseguir uma fonte legítima depois, a prova ainda precisará existir por si mesma.',
      },
      {
        id: 'exploit-sealed-info',
        label: 'Explorar diretamente a informação sigilosa',
        description: 'Você passa a agir como se o vazamento fosse uma vantagem válida da defesa.',
        tone: 'corrupt',
        consequence: {
          ethicsDelta: -9,
          characterDelta: -5,
          exposureDelta: 17,
          attributeXpDeltas: { INVESTIGATION: 50, INFLUENCE: 25 },
        },
        visibleSummary: ['Ética -9', 'Índole afetada', 'Investigação +50 XP', 'Influência +25 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'INVESTIGATION',
        immediateRisk: 38,
        incident: {
          title: 'Possível uso indevido de informação sigilosa',
          description: 'A conduta do advogado pode ter explorado informação obtida fora dos canais regulares e protegida por sigilo.',
          severity: 3,
          evidenceWeight: 42,
        },
        outcomeText: 'Você decide explorar o vazamento. O risco existe mesmo que a informação nunca se transforme em uma prova utilizável.',
      },
    ],
  },
  {
    id: 'conflict-of-interest',
    title: 'O cliente que você não deveria aceitar',
    kicker: 'Honorários • Conflito de interesses',
    narrative: 'Uma nova oportunidade comercial relacionada ao caso pode colocar seus interesses financeiros em conflito com o dever que você assumiu perante o cliente atual. Ninguém parece ter percebido a conexão ainda.',
    warning: 'Conflitos ocultos podem reaparecer muito tempo depois da decisão.',
    matches: generic,
    choices: [
      {
        id: 'disclose-conflict',
        label: 'Declarar o conflito e recusar a vantagem',
        description: 'Preservar independência profissional e transparência com o cliente.',
        tone: 'ethical',
        consequence: { ethicsDelta: 2, characterDelta: 1, attributeXpDeltas: { SELF_CONTROL: 20 } },
        visibleSummary: ['Ética +2', 'Autocontrole +20 XP'],
        outcomeText: 'Você abre mão da oportunidade e preserva a independência da atuação.',
      },
      {
        id: 'manage-quietly',
        label: 'Tentar administrar o conflito em silêncio',
        description: 'Você mantém a relação paralela sem explicar tudo ao cliente, acreditando que conseguirá separar os interesses.',
        tone: 'gray',
        consequence: {
          ethicsDelta: -5,
          characterDelta: -2,
          exposureDelta: 8,
          attributeXpDeltas: { INFLUENCE: 35 },
        },
        visibleSummary: ['Ética -5', 'Índole afetada', 'Influência +35 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'INFLUENCE',
        immediateRisk: 24,
        outcomeText: 'Você tenta equilibrar interesses incompatíveis sem transparência. A situação passa a depender de ninguém descobrir a conexão.',
      },
      {
        id: 'profit-from-conflict',
        label: 'Priorizar o benefício pessoal',
        description: 'Você mantém o conflito oculto e toma decisões profissionais influenciado pela vantagem paralela.',
        tone: 'corrupt',
        consequence: {
          ethicsDelta: -11,
          characterDelta: -7,
          exposureDelta: 16,
          attributeXpDeltas: { INFLUENCE: 60 },
        },
        visibleSummary: ['Ética -11', 'Índole afetada', 'Influência +60 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'INFLUENCE',
        immediateRisk: 40,
        incident: {
          title: 'Possível conflito de interesses ocultado do cliente',
          description: 'A atuação profissional pode ter sido influenciada por benefício paralelo incompatível com o dever assumido no caso.',
          severity: 3,
          evidenceWeight: 44,
        },
        outcomeText: 'Você coloca o interesse pessoal acima da transparência com o cliente. O benefício profissional não garante qualquer vantagem no processo.',
      },
    ],
  },
  {
    id: 'media-leak',
    title: 'A imprensa quer uma exclusiva',
    kicker: 'Reputação • Sigilo do cliente',
    narrative: 'Um jornalista oferece grande visibilidade em troca de detalhes internos do caso. Parte das informações ainda não é pública e pertence à relação de confiança com o cliente.',
    warning: 'Visibilidade pode parecer poder, mas sigilo quebrado também pode virar prova contra o próprio advogado.',
    matches: generic,
    choices: [
      {
        id: 'protect-client-confidentiality',
        label: 'Proteger integralmente o sigilo',
        description: 'Falar apenas sobre informações já públicas ou não comentar o caso.',
        tone: 'ethical',
        consequence: { ethicsDelta: 2, attributeXpDeltas: { SELF_CONTROL: 20 } },
        visibleSummary: ['Ética +2', 'Autocontrole +20 XP'],
        outcomeText: 'Você preserva a confiança do cliente e evita transformar o processo em moeda de exposição pessoal.',
      },
      {
        id: 'controlled-public-comment',
        label: 'Dar uma declaração pública controlada',
        description: 'Você usa apenas fatos públicos para posicionar a tese sem revelar conteúdo confidencial.',
        tone: 'gray',
        consequence: { ethicsDelta: 0, attributeXpDeltas: { PERSUASION: 30, INFLUENCE: 20 } },
        visibleSummary: ['Persuasão +30 XP', 'Influência +20 XP'],
        primaryAttribute: 'PERSUASION',
        immediateRisk: 8,
        outcomeText: 'Você usa a comunicação pública com cuidado. Não há bônus automático de reputação ou processo.',
      },
      {
        id: 'leak-confidential-info',
        label: 'Vazar informação confidencial por visibilidade',
        description: 'Você entrega detalhes protegidos para aumentar sua projeção pessoal.',
        tone: 'corrupt',
        consequence: {
          ethicsDelta: -10,
          characterDelta: -5,
          exposureDelta: 18,
          attributeXpDeltas: { INFLUENCE: 70, PERSUASION: 40 },
        },
        visibleSummary: ['Ética -10', 'Índole afetada', 'Influência +70 XP', 'Persuasão +40 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'INFLUENCE',
        immediateRisk: 48,
        incident: {
          title: 'Possível violação de sigilo profissional',
          description: 'Informações confidenciais do cliente podem ter sido compartilhadas deliberadamente em busca de exposição pública.',
          severity: 4,
          evidenceWeight: 55,
        },
        outcomeText: 'Você troca sigilo por visibilidade. O ganho de influência não significa melhora da reputação formal nem vantagem judicial.',
      },
    ],
  },
  {
    id: 'public-servant-priority',
    title: '“Posso colocar seu pedido na frente”',
    kicker: 'Serviço público • Favorecimento',
    narrative: 'Um servidor insinua que pode dar prioridade informal a uma providência ligada ao caso. A oferta parece pequena perto de outras fraudes, mas exige um benefício fora do procedimento normal.',
    warning: 'Pequenas concessões também moldam a índole do personagem e podem abrir portas para propostas piores.',
    matches: anyMatch(hasLocationCategory('cartorio'), hasLocationCategory('tribunal'), generic),
    choices: [
      {
        id: 'follow-normal-queue',
        label: 'Seguir a tramitação normal',
        description: 'Recusar qualquer favorecimento fora das regras do serviço.',
        tone: 'ethical',
        consequence: { ethicsDelta: 1, attributeXpDeltas: { SELF_CONTROL: 15 } },
        visibleSummary: ['Ética +1', 'Autocontrole +15 XP'],
        outcomeText: 'Você mantém o pedido na fila regular. O caso continua sem atalho artificial.',
      },
      {
        id: 'ask-only-legal-priority',
        label: 'Verificar se existe prioridade legal',
        description: 'Você tenta encontrar uma justificativa formal para acelerar o procedimento sem aceitar benefício pessoal.',
        tone: 'gray',
        consequence: { ethicsDelta: 0, attributeXpDeltas: { LEGAL_KNOWLEDGE: 25 } },
        visibleSummary: ['Conhecimento Jurídico +25 XP'],
        outcomeText: 'Você procura uma solução institucional. Se não houver fundamento, nada é acelerado.',
      },
      {
        id: 'accept-improper-priority',
        label: 'Aceitar a prioridade informal',
        description: 'Você concorda com o favorecimento mesmo sabendo que ele não segue o procedimento normal.',
        tone: 'corrupt',
        consequence: {
          ethicsDelta: -7,
          characterDelta: -4,
          exposureDelta: 12,
          attributeXpDeltas: { INFLUENCE: 35 },
        },
        visibleSummary: ['Ética -7', 'Índole afetada', 'Influência +35 XP', 'Exposição alterada (oculto)'],
        primaryAttribute: 'INFLUENCE',
        immediateRisk: 32,
        incident: {
          title: 'Possível obtenção de favorecimento indevido em serviço público',
          description: 'O advogado pode ter aceitado tratamento privilegiado fora do fluxo regular de atendimento.',
          severity: 2,
          evidenceWeight: 34,
        },
        outcomeText: 'Você aceita o favorecimento. Ele não altera automaticamente o prazo real nem o resultado do caso na mecânica processual.',
      },
    ],
  },
];

export function getEthicalDilemmaDefinition(id: string): EthicalDilemmaDefinition | null {
  return ETHICAL_DILEMMAS.find((item) => item.id === id) ?? null;
}

export function loadEthicalDilemmaState(player: Pick<PlayerProfile, 'cloudCareerId' | 'name'>): EthicalDilemmaState {
  try {
    const raw = localStorage.getItem(storageKey(player));
    if (!raw) return emptyState(player);
    const parsed = JSON.parse(raw) as EthicalDilemmaState;
    if (parsed?.version !== 1) return emptyState(player);
    return {
      ...emptyState(player),
      ...parsed,
      records: Array.isArray(parsed.records) ? parsed.records : [],
      resolvedSlots: parsed.resolvedSlots && typeof parsed.resolvedSlots === 'object' ? parsed.resolvedSlots : {},
    };
  } catch {
    return emptyState(player);
  }
}

export function saveEthicalDilemmaState(
  player: Pick<PlayerProfile, 'cloudCareerId' | 'name'>,
  state: EthicalDilemmaState,
) {
  localStorage.setItem(storageKey(player), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('rota:ethical-dilemma-state-updated', { detail: state }));
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function currentCaseData(player: PlayerProfile): LegalCase | null {
  const caseId = player.activeCase?.caseId;
  if (!caseId) return null;
  return GAME_CASES.find((item) => item.id === caseId) ?? null;
}

function progressScore(player: PlayerProfile) {
  const active = player.activeCase;
  if (!active) return 0;
  return (
    active.discoveredClueIds.length +
    active.askedDialogueIds.length +
    active.inspectedSpotIds.length +
    Math.floor(active.hoursSpent / 2)
  );
}

function slotThreshold(slot: number) {
  return slot === 0 ? 2 : 6;
}

function selectEvent(player: PlayerProfile, caseData: LegalCase, slot: number, state: EthicalDilemmaState) {
  const previousEventIds = new Set(
    state.records.filter((record) => record.caseId === caseData.id).map((record) => record.eventId),
  );
  let candidates = ETHICAL_DILEMMAS.filter(
    (event) => (event.minSlot ?? 0) <= slot && event.matches(caseData) && !previousEventIds.has(event.id),
  );
  if (!candidates.length) {
    candidates = ETHICAL_DILEMMAS.filter((event) => (event.minSlot ?? 0) <= slot && !previousEventIds.has(event.id));
  }
  if (!candidates.length) return null;
  const seed = `${getProfessionalOwnerKey(player)}:${caseData.id}:${slot}`;
  return candidates[hashString(seed) % candidates.length];
}

export function evaluateAndOpenEthicalDilemma(player: PlayerProfile): EthicalDilemmaState {
  const state = loadEthicalDilemmaState(player);
  if (state.pending || !player.oabRegistration || !LAWYER_TIERS.has(player.careerTier) || !player.activeCase) return state;

  const profile = loadProfessionalProfile(player);
  if (!profile) return state;

  const disciplinary = loadDisciplinaryState(player);
  if (isProfessionalPracticeBlocked(disciplinary.professionalStatus) || disciplinary.activeProceeding) return state;

  const caseData = currentCaseData(player);
  if (!caseData) return state;

  const resolved = new Set(state.resolvedSlots[caseData.id] || []);
  const progress = progressScore(player);
  const slot = [0, 1].find((candidate) => !resolved.has(candidate) && progress >= slotThreshold(candidate));
  if (slot == null) return state;

  const event = selectEvent(player, caseData, slot, state);
  if (!event) return state;

  const next: EthicalDilemmaState = {
    ...state,
    pending: {
      eventId: event.id,
      caseId: caseData.id,
      slot,
      openedAt: new Date().toISOString(),
    },
  };
  saveEthicalDilemmaState(player, next);
  window.dispatchEvent(new CustomEvent('rota:ethical-dilemma-opened', { detail: next.pending }));
  return next;
}

function applyImmediateComplication(
  profile: ProfessionalRpgProfile,
  choice: EthicalDilemmaChoice,
): { profile: ProfessionalRpgProfile; complication: boolean; extraEvidenceWeight: number } {
  if (!choice.immediateRisk || choice.tone === 'ethical') {
    return { profile, complication: false, extraEvidenceWeight: 0 };
  }

  const attributeLevel = choice.primaryAttribute ? profile.attributes[choice.primaryAttribute]?.level ?? 1 : 1;
  const detectionChance = clamp(
    choice.immediateRisk + profile.exposure * 0.22 - attributeLevel * 1.4,
    8,
    88,
  );
  const complication = Math.random() * 100 < detectionChance;
  if (!complication) return { profile, complication: false, extraEvidenceWeight: 0 };

  const modifier = makeModifier(
    `sob-pressao-${Date.now()}`,
    'SELF_CONTROL',
    -1,
    'Sob pressão por uma decisão arriscada',
    2,
  );
  const next = applyProfessionalConsequence(profile, {
    exposureDelta: choice.tone === 'corrupt' ? 10 : 5,
    addModifiers: [modifier],
  });
  return { profile: next, complication: true, extraEvidenceWeight: choice.tone === 'corrupt' ? 15 : 8 };
}

export function resolveEthicalDilemmaChoice(
  player: PlayerProfile,
  choiceId: string,
): EthicalChoiceResolution | null {
  const state = loadEthicalDilemmaState(player);
  if (!state.pending) return null;

  const event = getEthicalDilemmaDefinition(state.pending.eventId);
  const caseData = GAME_CASES.find((item) => item.id === state.pending?.caseId);
  const choice = event?.choices.find((item) => item.id === choiceId);
  const profile = loadProfessionalProfile(player);
  if (!event || !caseData || !choice || !profile) return null;

  let updatedProfile = applyProfessionalConsequence(profile, choice.consequence);
  const immediate = applyImmediateComplication(updatedProfile, choice);
  updatedProfile = immediate.profile;
  saveProfessionalProfile(player, updatedProfile);

  if (choice.incident) {
    registerDisciplinaryIncident(player, {
      ...choice.incident,
      sourceCaseId: caseData.id,
      evidenceWeight: clamp((choice.incident.evidenceWeight ?? 35) + immediate.extraEvidenceWeight, 0, 100),
    });
  }

  const record: EthicalDilemmaRecord = {
    id: `decision-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    eventId: event.id,
    eventTitle: event.title,
    caseId: caseData.id,
    caseTitle: caseData.title,
    slot: state.pending.slot,
    choiceId: choice.id,
    choiceLabel: choice.label,
    tone: choice.tone,
    complication: immediate.complication,
    resolvedAt: new Date().toISOString(),
  };

  const currentSlots = state.resolvedSlots[caseData.id] || [];
  const nextState: EthicalDilemmaState = {
    ...state,
    pending: null,
    records: [record, ...state.records],
    resolvedSlots: {
      ...state.resolvedSlots,
      [caseData.id]: [...new Set([...currentSlots, record.slot])],
    },
  };
  saveEthicalDilemmaState(player, nextState);

  const resultText = immediate.complication
    ? `${choice.outcomeText} Além disso, alguma parte da movimentação deixou um rastro perceptível. Seu risco oculto aumentou ainda mais.`
    : choice.tone === 'ethical'
      ? choice.outcomeText
      : `${choice.outcomeText} Nada acontece de imediato, mas isso não significa que a escolha ficará sem consequências.`;

  window.dispatchEvent(new CustomEvent('rota:ethical-dilemma-resolved', { detail: record }));
  return {
    state: nextState,
    profile: updatedProfile,
    record,
    event,
    choice,
    complication: immediate.complication,
    resultText,
  };
}

export function dismissPendingEthicalDilemma(player: PlayerProfile): EthicalDilemmaState {
  const state = loadEthicalDilemmaState(player);
  if (!state.pending) return state;
  // O dilema não pode ser apagado para fugir da decisão. Apenas permanece pendente.
  return state;
}

export function getPendingEthicalDilemma(player: PlayerProfile) {
  const state = loadEthicalDilemmaState(player);
  if (!state.pending) return null;
  const event = getEthicalDilemmaDefinition(state.pending.eventId);
  const caseData = GAME_CASES.find((item) => item.id === state.pending?.caseId) ?? null;
  return event && caseData ? { state, event, caseData } : null;
}
