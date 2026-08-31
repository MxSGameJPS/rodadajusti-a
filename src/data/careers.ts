import { CareerTier, CareerTierId, AcademicCourse, ConcursoPhase } from '../types/game';

export const CAREER_TIERS: Record<CareerTierId, CareerTier> = {
  ESTAGIARIO: {
    id: 'ESTAGIARIO',
    title: 'Estagiário de Direito',
    category: 'advocacia',
    minCasesSolved: 0,
    minXp: 0,
    minReputation: 10,
    salaryBaseMonthly: 1200,
    description: 'Nível inicial da carreira jurídica. Realiza pesquisas de campo, diligências em cartórios e atende os primeiros clientes sob supervisão.',
    perks: [
      'Bolsa-estágio mensal de R$ 1.200',
      'Supervisão direta do Dr. Roberto Ramos',
      'Acesso a casos cíveis e de direito do consumidor'
    ],
    badgeColor: 'from-amber-600 to-amber-800'
  },
  ESTAGIARIO_SENIOR: {
    id: 'ESTAGIARIO_SENIOR',
    title: 'Estagiário Sênior',
    category: 'advocacia',
    minCasesSolved: 2,
    minXp: 400,
    minReputation: 30,
    salaryBaseMonthly: 2100,
    description: 'Estagiário de alta confiança. Conduz investigações mais autônomas e tem liberdade para formular teses iniciais.',
    perks: [
      'Bolsa-estágio ampliada para R$ 2.100',
      'Desconto de 15% no tempo de viagens e diligências',
      'Acesso a casos de direito imobiliário e bancário'
    ],
    badgeColor: 'from-blue-600 to-blue-800'
  },
  ADVOGADO_CONTRATADO: {
    id: 'ADVOGADO_CONTRATADO',
    title: 'Advogado Contratado',
    category: 'advocacia',
    minCasesSolved: 4,
    minXp: 1000,
    minReputation: 50,
    salaryBaseMonthly: 5500,
    description: 'Aprovado no Exame da OAB! Agora possui carteira regular e assina petições, sustenta em audiências e recebe participação em honorários.',
    perks: [
      'Salário fixo de R$ 5.500 + 20% de honorários de êxito',
      'Poder de requerer certidões com fé pública',
      'Desbloqueia inscrição em Pós-Graduação e Concursos'
    ],
    badgeColor: 'from-emerald-600 to-emerald-800'
  },
  ADVOGADO_SENIOR: {
    id: 'ADVOGADO_SENIOR',
    title: 'Advogado Sênior',
    category: 'advocacia',
    minCasesSolved: 9,
    minXp: 2600,
    minReputation: 70,
    salaryBaseMonthly: 12000,
    description: 'Líder técnico do escritório. Comanda casos complexos corporativos, contratuais e defesas de grande vulto.',
    perks: [
      'Remuneração de R$ 12.000 + 35% de honorários',
      'Acesso a casos de alta complexidade e repercussão',
      'Opção para abrir o próprio escritório ou postular sociedade'
    ],
    badgeColor: 'from-purple-600 to-purple-800'
  },
  SOCIO_ESCRITORIO: {
    id: 'SOCIO_ESCRITORIO',
    title: 'Sócio do Escritório',
    category: 'advocacia',
    minCasesSolved: 14,
    minXp: 5000,
    minReputation: 85,
    salaryBaseMonthly: 28000,
    description: 'Sócio cotista pleno no Ramos & Associados. Participação direta na distribuição semestral de lucros e decisões institucionais.',
    perks: [
      'Pró-labore de R$ 28.000 + dividendos',
      'Respeito máximo no meio jurídico regional',
      'Capacidade de alocar estagiários para coletar pistas preliminares'
    ],
    badgeColor: 'from-amber-400 to-yellow-600'
  },
  DONO_ESCRITORIO: {
    id: 'DONO_ESCRITORIO',
    title: 'Titular de Escritório Próprio',
    category: 'gestao',
    minCasesSolved: 9,
    minXp: 3000,
    minReputation: 75,
    salaryBaseMonthly: 0, // depende do caixa
    description: 'Fundador e gestor do seu próprio escritório de advocacia. Administra receitas, contratações, aluguel e despesas.',
    perks: [
      '100% dos honorários revertidos para o escritório',
      'Gestão completa de equipe (estagiários e advogados)',
      'Possibilidade de expandir para filiais'
    ],
    badgeColor: 'from-cyan-600 to-blue-700'
  },
  MAGISTRADO_SUBSTITUTO: {
    id: 'MAGISTRADO_SUBSTITUTO',
    title: 'Juiz de Direito Substituto',
    category: 'magistratura',
    minCasesSolved: 6,
    minXp: 3500,
    minReputation: 80,
    salaryBaseMonthly: 33000,
    description: 'Aprovado no rigoroso concurso público de provas e títulos. Julga processos e atua em varas cíveis e criminais do interior/capital.',
    perks: [
      'Subsídio constitucional de R$ 33.000',
      'Independência funcional e poder de decisão judicial',
      'Progressão na carreira da magistratura estadual/federal'
    ],
    badgeColor: 'from-red-700 to-rose-900'
  },
  JUIZ_TITULAR: {
    id: 'JUIZ_TITULAR',
    title: 'Juiz de Direito Titular',
    category: 'magistratura',
    minCasesSolved: 12,
    minXp: 6000,
    minReputation: 90,
    salaryBaseMonthly: 37500,
    description: 'Titular de Vara Cível Estratégica. Responsável pela gestão de sua vara e julgamento de litígios complexos.',
    perks: [
      'Gabinete próprio e equipe de assessores',
      'Imunidades e prerrogativas da magistratura plena'
    ],
    badgeColor: 'from-red-800 to-stone-900'
  },
  DESEMBARGADOR: {
    id: 'DESEMBARGADOR',
    title: 'Desembargador do Tribunal',
    category: 'magistratura',
    minCasesSolved: 18,
    minXp: 9500,
    minReputation: 95,
    salaryBaseMonthly: 41000,
    description: 'Membro do Tribunal de Justiça / TRF. Julga recursos em colegiado e edita enunciados jurisprudenciais.',
    perks: [
      'Voto em câmaras julgadoras especializadas',
      'Reconhecimento doutrinário de alcance nacional'
    ],
    badgeColor: 'from-amber-600 to-red-950'
  },
  MINISTRO_STF: {
    id: 'MINISTRO_STF',
    title: 'Ministro do Supremo Tribunal Federal',
    category: 'magistratura',
    minCasesSolved: 25,
    minXp: 15000,
    minReputation: 99,
    salaryBaseMonthly: 46000,
    description: 'Guardião da Constituição da República Federativa do Brasil. Conquista lendária de final de jogo reservada a notável saber jurídico e reputação ilibada.',
    perks: [
      'Julgamento com repercussão geral e controle concentrado de constitucionalidade',
      'Assento supremo na mais alta corte do país'
    ],
    badgeColor: 'from-amber-300 via-amber-500 to-yellow-700'
  }
};

export const ACADEMIC_COURSES: AcademicCourse[] = [
  {
    id: 'POS_CIVIL',
    degree: 'ESPECIALISTA',
    title: 'Especialização em Direito Civil e Teoria dos Contratos',
    institution: 'Escola Superior de Advocacia (ESA)',
    cost: 4500,
    durationMonths: 6,
    requiredDegree: 'BACHAREL',
    minXpRequired: 800,
    xpReward: 350,
    reputationReward: 8,
    description: 'Aprofunda a análise da validade do negócio jurídico, vícios do consentimento e boa-fé objetiva.',
    skillsUnlocked: ['Identificação imediata de cláusulas nulas em contratos', '+10% de precisão em teses cíveis']
  },
  {
    id: 'POS_PROCESSO',
    degree: 'ESPECIALISTA',
    title: 'Especialização em Direito Processual e Provas',
    institution: 'Fundação Getúlio Vargas / IDP',
    cost: 6200,
    durationMonths: 6,
    requiredDegree: 'BACHAREL',
    minXpRequired: 1200,
    xpReward: 450,
    reputationReward: 10,
    description: 'Foco intensivo na teoria geral da prova, ônus dinâmico, tutela provisória e perícia grafotécnica.',
    skillsUnlocked: ['Desconto de 20% no tempo de análise de documentos', 'Detecção aprimorada de falsidades']
  },
  {
    id: 'MESTRADO_DIREITO',
    degree: 'MESTRE',
    title: 'Mestrado Acadêmico em Direito das Relações Sociais',
    institution: 'Universidade de São Paulo (USP) / UnB',
    cost: 14000,
    durationMonths: 12,
    requiredDegree: 'ESPECIALISTA',
    minXpRequired: 2500,
    xpReward: 900,
    reputationReward: 18,
    description: 'Dissertação orientada com defesa pública. Concede o grau de Mestre em Direito e pontuação valiosa em títulos para concursos.',
    skillsUnlocked: ['Título de Mestre em Direito nos autos', '+5 Pontos na fase de títulos de concursos', '+15% de respeito de juízes e clientes']
  },
  {
    id: 'DOUTORADO_DIREITO',
    degree: 'DOUTOR',
    title: 'Doutorado em Direito Constitucional e Jurisdição',
    institution: 'Faculdade de Direito do Largo de São Francisco',
    cost: 26000,
    durationMonths: 18,
    requiredDegree: 'MESTRE',
    minXpRequired: 6000,
    xpReward: 2000,
    reputationReward: 25,
    description: 'Tese inédita com publicação de livro doutrinário. Notável saber jurídico reconhecido em todo o território nacional.',
    skillsUnlocked: ['Grau máximo acadêmico (Doutor em Direito)', 'Citação doutrinária aceita como autoridade em acórdãos', 'Habilitação para indicação aos tribunais superiores']
  }
];

export const CONCURSO_MAGISTRATURA_PHASES: ConcursoPhase[] = [
  {
    id: 'FASE_1_OBJETIVA',
    title: '1ª Fase: Prova Objetiva Seletiva (100 Questões)',
    description: 'Avaliação de conhecimentos em Direito Civil, Processo Civil, Constitucional, Administrativo, Penal e Empresarial.',
    cost: 380,
    requiredPraticaAnos: 3,
    requiredXp: 2000,
    questions: [
      {
        id: 'q1',
        enunciado: 'Nos termos do Código Civil brasileiro, o negócio jurídico nulo por vício de simulação:',
        options: [
          { id: 'a', text: 'Pode ser convalidado pelo decurso do tempo de 2 anos.', isCorrect: false, explanation: 'A nulidade absoluta não convalesce com o tempo.' },
          { id: 'b', text: 'Não é suscetível de confirmação, nem convalesce pelo decurso do tempo.', isCorrect: true, explanation: 'Correto. Os negócios nulos não convalescem pelo decurso do tempo.' },
          { id: 'c', text: 'Pode ser alegado apenas pela parte prejudicada, nunca de ofício pelo juiz.', isCorrect: false, explanation: 'A nulidade absoluta pode ser pronunciada de ofício pelo juiz quando conhecer do negócio.' }
        ]
      },
      {
        id: 'q2',
        enunciado: 'Sobre a tutela provisória de urgência de natureza antecipada, é correto afirmar:',
        options: [
          { id: 'a', text: 'Exige probabilidade do direito e perigo de dano ou risco ao resultado útil do processo.', isCorrect: true, explanation: 'Correto. São os requisitos cumulativos do art. 300 do CPC.' },
          { id: 'b', text: 'Pode ser concedida mesmo quando houver perigo de irreversibilidade do provimento.', isCorrect: false, explanation: 'Não será concedida quando houver perigo de irreversibilidade.' },
          { id: 'c', text: 'Independe de qualquer comprovação de urgência se houver manifestação da parte contrária.', isCorrect: false, explanation: 'A urgência exige perigo de dano demonstrado.' }
        ]
      }
    ]
  },
  {
    id: 'FASE_2_SENTENCA',
    title: '2ª Fase: Prova Discursiva e Prática de Sentença Cível',
    description: 'Elaboração de uma sentença judicial completa contendo relatório, fundamentação e dispositivo com base em caso prático real.',
    cost: 0,
    requiredPraticaAnos: 3,
    requiredXp: 3200,
    questions: [
      {
        id: 'q3',
        enunciado: 'Em ação declaratória de inexistência de débito com contrato fraudado por terceiro, ao proferir a sentença o juiz deve:',
        options: [
          { id: 'a', text: 'Julgar extinto o processo por ilegitimidade passiva do banco beneficiário.', isCorrect: false, explanation: 'A instituição responde pelos riscos de sua atividade.' },
          { id: 'b', text: 'Declarar a inexistência da dívida, determinar a baixa de eventuais inscrições e analisar os danos morais.', isCorrect: true, explanation: 'Correto. A sentença deve declarar a nulidade e sanar os gravames gerados pelo ilícito.' },
          { id: 'c', text: 'Obrigar o autor a pagar metade do valor como taxa conciliatória.', isCorrect: false, explanation: 'Inexiste previsão legal para tal cobrança da vítima.' }
        ]
      }
    ]
  },
  {
    id: 'FASE_3_ORAL',
    title: '3ª Fase: Prova Oral perante a Banca Examinadora',
    description: 'Sustentação oral e arguição pública pelos desembargadores e representantes da OAB sobre temas de repercussão geral.',
    cost: 0,
    requiredPraticaAnos: 3,
    requiredXp: 4500,
    questions: [
      {
        id: 'q4',
        enunciado: 'Candidato, como se distingue a boa-fé subjetiva da boa-fé objetiva na interpretação contratual?',
        options: [
          { id: 'a', text: 'A boa-fé subjetiva refere-se ao estado psicológico de crença da parte; a objetiva é um padrão ético de conduta e lealdade imposto a todos.', isCorrect: true, explanation: 'Excelente resposta. Distinção clássica consolidada na doutrina brasileira.' },
          { id: 'b', text: 'Ambas tratam unicamente da intenção secreta das partes sem reflexo probatório.', isCorrect: false, explanation: 'A boa-fé objetiva é uma cláusula geral de comportamento leal e cooperativo.' }
        ]
      }
    ]
  }
];
