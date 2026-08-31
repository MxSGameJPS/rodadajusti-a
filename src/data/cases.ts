import { LegalCase } from '../types/game';

export const GAME_CASES: LegalCase[] = [
  {
    id: 'CASO_01_LOCACAO_FANTASMA',
    code: 'PROC-2026/001-CIV',
    title: 'O Golpe do Contrato de Aluguel Fantasma',
    area: 'Direito Civil & Imobiliário',
    difficulty: 'Iniciante',
    difficultyStars: 1,
    deadlineHours: 48,
    honorariosReward: 2500,
    xpReward: 300,
    reputationReward: 15,
    minCareerTier: 'ESTAGIARIO',
    client: {
      name: 'Dona Marlene Silveira',
      occupation: 'Aposentada, 67 anos',
      summary: 'Dona Marlene recebeu uma intimação de cobrança extrajudicial ameaçando penhora de seus proventos de aposentadoria por suposta inadimplência de 6 meses de aluguel de um galpão comercial onde jamais esteve.',
      avatarBg: 'bg-amber-100 text-amber-900 border-amber-300'
    },
    briefing: {
      mentorName: 'Dr. Roberto Ramos (Sócio Fundador)',
      mentorQuote: 'Bem-vindo ao escritório, colega! Dona Marlene é uma pessoa idosa e muito simples. Alguém utilizou os documentos dela para fraudar uma locação comercial e a imobiliária está exigindo R$ 45.000,00 sob pena de execução. Seu papel como estagiário é apurar os fatos em campo: vá aos cartórios, fale com os envolvidos, recolha documentos comprobatórios e verifique a autenticidade dessa assinatura antes que o prazo de resposta se esgote!',
      facts: [
        'A cliente nunca alugou imóvel comercial na vida e reside no mesmo endereço residencial há 32 anos.',
        'A Imobiliária Delta Imóveis enviou notificação formal com cópia de contrato particular.',
        'O contrato possui um carimbo de reconhecimento de firma do 14º Cartório de Notas.',
        'Temos 48 horas úteis para protocolar a medida cabível antes da notificação vencer e o nome ir para protesto.'
      ],
      mainObjective: 'Descobrir a origem da fraude, comprovar que Dona Marlene não firmou o contrato e colher provas incontestáveis para anular a dívida e proteger seus bens.',
      legalContext: 'Negócio jurídico nulo por ausência de consentimento e falsidade de assinatura. Ação Anulatória com pedido de tutela de urgência.'
    },
    locations: [
      {
        id: 'LOC_ESCRITORIO_RAMOS',
        name: 'Escritório Ramos & Associados',
        category: 'escritorio',
        travelTimeHours: 0,
        travelCost: 0,
        description: 'Sua base de operações. Sala com mesa de pesquisa, computadores com acesso ao PJe e biblioteca jurídica.',
        address: 'Av. Paulista, 1200 - Conjunto 804',
        iconName: 'Building2',
        color: 'text-amber-500',
        unlockedByDefault: true,
        characters: [
          {
            id: 'CHAR_DR_ROBERTO',
            name: 'Dr. Roberto Ramos',
            role: 'Advogado Mentor e Sócio',
            avatarIcon: 'Briefcase',
            avatarBg: 'bg-slate-800 text-amber-400 border-amber-500',
            initialDialogue: 'O tempo está correndo! Recomendo que você comece entrevistando a Dona Marlene para checar onde ela guardava seus documentos e depois vá ao 14º Cartório averiguar esse reconhecimento de firma.',
            dialogueOptions: [
              {
                id: 'diag_roberto_dica',
                question: 'Dr. Roberto, qual a melhor forma de invalidar um contrato fraudulento?',
                answer: 'Em nosso ordenamento, a assinatura forjada invalida o consentimento, gerando nulidade de pleno direito. Mas juiz nenhum anula sem prova documental contundente: precisamos da ficha de firma do cartório ou comprovante pericial de divergência gráfica!',
                timeCostMinutes: 20
              },
              {
                id: 'diag_roberto_prazo',
                question: 'Quanto tempo temos antes do protesto do título?',
                answer: 'O cartório de protesto concedeu 48 horas. Se não protocolarmos a tutela de urgência a tempo, as contas bancárias da Dona Marlene podem sofrer bloqueio indevido.',
                timeCostMinutes: 10
              }
            ]
          }
        ],
        searchables: [
          {
            id: 'spot_pesquisa_jurisprudencia',
            name: 'Terminal de Consulta Jurisprudencial',
            description: 'Pesquisar acórdãos recentes sobre fraudes em locação e responsabilidade de cartórios e imobiliárias.',
            timeCostMinutes: 30,
            foundClueId: 'CLUE_SUMULA_RESPONSABILIDADE',
            inspectedMessage: 'Você localizou precedentes fixando que a imobiliária e o cartório respondem objetivamente por danos gerados por falha na conferência de documentos.'
          }
        ]
      },
      {
        id: 'LOC_CASA_DONA_MARLENE',
        name: 'Residência de Dona Marlene',
        category: 'residencia',
        travelTimeHours: 2,
        travelCost: 35,
        description: 'Casa modesta e acolhedora no bairro da Mooca. A cliente aguarda ansiosa com uma pasta de recibos.',
        address: 'Rua dos Trilhos, 412 - Mooca',
        iconName: 'Home',
        color: 'text-blue-400',
        unlockedByDefault: true,
        characters: [
          {
            id: 'CHAR_DONA_MARLENE',
            name: 'Dona Marlene Silveira',
            role: 'Cliente do Escritório',
            avatarIcon: 'User',
            avatarBg: 'bg-amber-100 text-amber-800 border-amber-300',
            initialDialogue: 'Meu filho, eu nunca pisei nesse galpão na Lapa! Vivo aqui há mais de 30 anos com minha pensão de R$ 1.800. Se bloquearem meu dinheiro, não compro nem meus remédios!',
            dialogueOptions: [
              {
                id: 'diag_marlene_documentos',
                question: 'A senhora perdeu ou teve seus documentos furtados recentemente?',
                answer: 'Agora que você falou... Há 8 meses perdi minha bolsa na feira com minha identidade antiga e cartão do SUS. Fiz um Boletim de Ocorrência na época! Guardei a folha aqui na gaveta.',
                revealsClueId: 'CLUE_BO_DOCUMENTO_PERDIDO',
                unlocksLocationId: 'LOC_DELEGACIA',
                timeCostMinutes: 25,
                attitude: 'cooperativo'
              },
              {
                id: 'diag_marlene_assinatura',
                question: 'A senhora já teve firma aberta no 14º Cartório de Notas?',
                answer: 'Nunca! Minha firma sempre foi no 3º Cartório da Sé, onde fiz minha certidão de casamento e a escritura dessa casinha.',
                revealsClueId: 'CLUE_CARTORIO_CORRETO',
                unlocksLocationId: 'LOC_CARTORIO',
                timeCostMinutes: 20
              }
            ]
          }
        ],
        searchables: [
          {
            id: 'spot_gaveta_marlene',
            name: 'Pasta de Documentos Antigos da Cliente',
            description: 'Examinar documentos oficiais autênticos para comparar a assinatura original.',
            timeCostMinutes: 40,
            foundClueId: 'CLUE_RG_ORIGINAL_MARLENE',
            inspectedMessage: 'Você encontrou a 2ª via do RG original e extratos de aposentadoria demonstrando que a assinatura autêntica possui traços cursivos totalmente distintos dos do contrato.'
          }
        ]
      },
      {
        id: 'LOC_CARTORIO',
        name: '14º Cartório de Notas da Capital',
        category: 'cartorio',
        travelTimeHours: 3,
        travelCost: 45,
        description: 'Tabelionato movimentado. Balcões de autenticação, caixas e arquivos de fichas de abertura de firma.',
        address: 'Rua Boa Vista, 89 - Centro',
        iconName: 'ScrollText',
        color: 'text-purple-400',
        unlockedByDefault: true,
        characters: [
          {
            id: 'CHAR_ESCREVENTE_VALDIR',
            name: 'Sr. Valdir Antunes',
            role: 'Escrevente Autorizado do Cartório',
            avatarIcon: 'Stamp',
            avatarBg: 'bg-slate-700 text-purple-300 border-purple-400',
            initialDialogue: 'Pois não, doutor? Em que o 14º Tabelionato pode colaborar com sua diligência?',
            dialogueOptions: [
              {
                id: 'diag_valdir_conferir_ficha',
                question: 'Preciso desarquivar a ficha de firma em nome de Marlene Silveira que consta no contrato de locação.',
                answer: 'Deixe-me consultar nosso sistema... Que estranho! A ficha de firma com esse CPF foi cadastrada há apenas 4 meses por meio de uma CNH digital com foto de outra pessoa e endereço falso! Isso é uma fraude evidente!',
                revealsClueId: 'CLUE_CERTIDAO_CARTORIO_FRAUDE',
                timeCostMinutes: 45,
                attitude: 'nervoso'
              },
              {
                id: 'diag_valdir_carimbo',
                question: 'O selo de autenticação constante na última folha do contrato é legítimo deste cartório?',
                answer: 'O número de autenticação sequencial pertence a um reconhecimento de firma por semelhança feito em balcão. Emitirei uma Certidão de Inconsistência de Titularidade para instruir seu processo imediatamente.',
                revealsClueId: 'CLUE_SELO_IRREGULAR',
                timeCostMinutes: 30
              }
            ]
          }
        ],
        searchables: [
          {
            id: 'spot_livro_firmas',
            name: 'Arquivo Físico de Cartões de Autógrafo',
            description: 'Inspecionar o cartão de firma suspeito utilizado pelos golpistas.',
            timeCostMinutes: 50,
            foundClueId: 'CLUE_CARTAO_FIRMA_FALSO',
            inspectedMessage: 'Você coletou a cópia autenticada do cartão de firma fraudado: a foto anexada é de uma mulher desconhecida de aproximadamente 35 anos, nada compatível com Dona Marlene.'
          }
        ]
      },
      {
        id: 'LOC_IMOBILIARIA_DELTA',
        name: 'Imobiliária Delta Imóveis',
        category: 'empresa',
        travelTimeHours: 2,
        travelCost: 40,
        description: 'Imobiliária em prédio envidraçado. O gerente jurídico e o corretor responsável pelo contrato atendem clientes.',
        address: 'Rua Clélia, 1500 - Lapa',
        iconName: 'Building',
        color: 'text-emerald-400',
        unlockedByDefault: true,
        characters: [
          {
            id: 'CHAR_CORRETOR_CLAUDIO',
            name: 'Cláudio Fagundes',
            role: 'Corretor Responsável pelo Galpão',
            avatarIcon: 'UserCheck',
            avatarBg: 'bg-emerald-950 text-emerald-300 border-emerald-500',
            initialDialogue: 'Nós intermediamos a locação de boa-fé! O galpão foi alugado e o inquilino sumiu sem pagar as chaves nem os 6 aluguéis. Alguém tem que pagar!',
            dialogueOptions: [
              {
                id: 'diag_claudio_quem_trouxe',
                question: 'Quem compareceu pessoalmente na imobiliária para entregar as vias assinadas e retirar as chaves?',
                answer: 'Foi um tal de Marcos Vinícius, que se dizia sobrinho e procurador da Dona Marlene. Ele entregou os documentos prontos e com o selo do cartório. Nós não pedimos procuração pública porque ele pagou a primeira taxa à vista em dinheiro.',
                revealsClueId: 'CLUE_DEPOIMENTO_CORRETOR_NEGLIGENCIA',
                timeCostMinutes: 35,
                attitude: 'suspeito'
              },
              {
                id: 'diag_claudio_vistoria',
                question: 'Vocês fizeram vistoria do imóvel e confirmaram o endereço residencial da suposta locatária?',
                answer: 'Bem... enviamos o mensageiro apenas no galpão. Para o endereço residencial só mandamos carta depois que a dívida acumulou...',
                timeCostMinutes: 20
              }
            ]
          }
        ],
        searchables: [
          {
            id: 'spot_pasta_contrato_original',
            name: 'Dossiê da Pasta de Locação nº 4022',
            description: 'Examinar o contrato original arquivado na pasta de negócios da imobiliária.',
            timeCostMinutes: 45,
            foundClueId: 'CLUE_CONTRATO_ORIGINAL_RASURADO',
            inspectedMessage: 'Você recolheu o contrato original: há emendas grosseiras nos dados bancários e ausência completa de procuração outorgando poderes ao terceiro!'
          },
          {
            id: 'spot_recibo_gaveta_imob',
            name: 'Recibo de Estacionamento Descartado',
            description: 'Papel amassado na mesa do corretor.',
            timeCostMinutes: 15,
            foundClueId: 'CLUE_RECIBO_IRRELEVANTE_ESTACIONAMENTO',
            inspectedMessage: 'É apenas um cupom fiscal de estacionamento de shopping do mês passado. Não possui valor probatório para o caso.'
          }
        ]
      },
      {
        id: 'LOC_DELEGACIA',
        name: '3º Distrito Policial — Delegacia de Polícia',
        category: 'delegacia',
        travelTimeHours: 2,
        travelCost: 30,
        description: 'Plantão policial civil. Arquivos de boletins de ocorrência e setor de investigações sobre estelionato.',
        address: 'Rua Aurora, 322 - Santa Ifigênia',
        iconName: 'ShieldAlert',
        color: 'text-red-400',
        unlockedByDefault: false,
        requiredClueOrDialogToUnlock: 'diag_marlene_documentos',
        characters: [
          {
            id: 'CHAR_ESCRIVAO_JORGE',
            name: 'Escrivão Jorge Macedo',
            role: 'Escrivão de Polícia Judiciária',
            avatarIcon: 'Badge',
            avatarBg: 'bg-red-950 text-red-300 border-red-500',
            initialDialogue: 'Advocacia? Pois não, doutor. Pode me informar o número do R.D.O. ou o nome da declarante?',
            dialogueOptions: [
              {
                id: 'diag_jorge_buscar_bo',
                question: 'Gostaria de certidão de registro do B.O. de perda de documentos de Marlene Silveira.',
                answer: 'Encontrei no sistema! B.O. nº 44102/2025 lavrado há 8 meses com declaração detalhada da perda de RG e CPF. Além disso, temos outros 3 inquéritos em andamento contra um indivíduo chamado Marcos Vinícius por golpe do aluguel!',
                revealsClueId: 'CLUE_CERTIDAO_BO_ESTELIONATO',
                timeCostMinutes: 30,
                attitude: 'cooperativo'
              }
            ]
          }
        ],
        searchables: [
          {
            id: 'spot_mural_golpistas',
            name: 'Mural de Informações de Investigações em Andamento',
            description: 'Verificar modus operandi da quadrilha investigada na região.',
            timeCostMinutes: 25,
            foundClueId: 'CLUE_RELATORIO_POLICIAL_MODUS_OPERANDI',
            inspectedMessage: 'Relatório de inteligência policial apontando que a quadrilha utiliza nomes de idosos para alugar galpões para receptação e depois abandona os débitos.'
          }
        ]
      }
    ],
    availableClues: [
      {
        id: 'CLUE_BO_DOCUMENTO_PERDIDO',
        title: 'B.O. Prévio de Furto/Perda de Documentos',
        type: 'registro_publico',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Boletim de ocorrência lavrado 8 meses antes da assinatura do contrato fraudulento.',
        fullDetail: 'Comprova cabalmente a boa-fé da cliente e a anterior perda de seus documentos pessoais antes de qualquer negociação imobiliária.',
        locationFoundId: 'LOC_CASA_DONA_MARLENE',
        legalSignificance: 'Demonstra a verossimilhança da alegação de fraude e afasta a presunção de veracidade da posse dos documentos pelo terceiro.',
        iconName: 'FileCheck'
      },
      {
        id: 'CLUE_CARTORIO_CORRETO',
        title: 'Informação do Cartório Real da Cliente',
        type: 'depoimento',
        relevance: 'complementar',
        isAuthentic: true,
        summary: 'Dona Marlene só possui cartão de firma no 3º Cartório da Sé, e nunca no 14º Tabelionato.',
        fullDetail: 'Declaração formal indicando onde se encontram os padrões gráficos originais e autênticos para confronto pericial.',
        locationFoundId: 'LOC_CASA_DONA_MARLENE',
        legalSignificance: 'Fundamenta o requerimento de comparação pericial com os padrões autênticos arquivados.',
        iconName: 'MapPin'
      },
      {
        id: 'CLUE_RG_ORIGINAL_MARLENE',
        title: 'Cópia Oficial do RG Autêntico e Padrão Gráfico',
        type: 'documento',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Documento original com assinatura cursiva legítima de Dona Marlene.',
        fullDetail: 'Exibe assinatura contínua e sem paradas forçadas, em contraste com a grafia trêmula e forjada do contrato de locação.',
        locationFoundId: 'LOC_CASA_DONA_MARLENE',
        legalSignificance: 'Prova pré-constituída de evidente divergência visual de assinaturas (falsidade grosseira).',
        iconName: 'FileText'
      },
      {
        id: 'CLUE_CERTIDAO_CARTORIO_FRAUDE',
        title: 'Certidão do 14º Cartório de Ficha de Firma Falsa',
        type: 'registro_publico',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Certidão oficial do Tabelião comprovando que a ficha de firma foi aberta com CNH falsa e foto de terceiro.',
        fullDetail: 'Documento dotado de fé pública emitido pelo escrevente atestando que a abertura da firma foi um ato eivado de nulidade e praticado por estelionatário.',
        locationFoundId: 'LOC_CARTORIO',
        legalSignificance: 'Prova irrefutável com presunção de veracidade pública da inexistência de consentimento da cliente.',
        iconName: 'Scroll'
      },
      {
        id: 'CLUE_SELO_IRREGULAR',
        title: 'Extrato de Autenticação Mecânica por Semelhança',
        type: 'registro_publico',
        relevance: 'complementar',
        isAuthentic: true,
        summary: 'Registro do selo comprovando que o reconhecimento foi feito sem a presença física da signatária.',
        fullDetail: 'Demonstra que a assinatura não foi feita por autenticidade (presencial), mas sim por simples confronto com ficha cadastral forjada.',
        locationFoundId: 'LOC_CARTORIO',
        legalSignificance: 'Reforça a falha na prestação do serviço e ausência de comparecimento pessoal.',
        iconName: 'Stamp'
      },
      {
        id: 'CLUE_CARTAO_FIRMA_FALSO',
        title: 'Cartão de Firma Falsificado com Foto de Terceiro',
        type: 'pericia',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Cópia reprográfica do cartão do cartório com fotografia de mulher jovem estranha aos autos.',
        fullDetail: 'A foto anexada ao cartão de autógrafo é de uma pessoa 30 anos mais jovem, comprovando a usurpação de identidade.',
        locationFoundId: 'LOC_CARTORIO',
        legalSignificance: 'Evidência definitiva de falsidade ideológica e documental.',
        iconName: 'Image'
      },
      {
        id: 'CLUE_DEPOIMENTO_CORRETOR_NEGLIGENCIA',
        title: 'Declaração do Corretor de Negligência na Contratação',
        type: 'depoimento',
        relevance: 'complementar',
        isAuthentic: true,
        summary: 'Corretor admite que entregou as chaves para terceiro sem exigir procuração por instrumento público.',
        fullDetail: 'Confissão de falha grave no dever de diligência profissional da imobiliária intermediadora.',
        locationFoundId: 'LOC_IMOBILIARIA_DELTA',
        legalSignificance: 'Fundamenta a legitimidade passiva da imobiliária e o dever de indenizar por culpa in eligendo / in vigilando.',
        iconName: 'MessageSquare'
      },
      {
        id: 'CLUE_CONTRATO_ORIGINAL_RASURADO',
        title: 'Via Original do Contrato com Emendas e Sem Procuração',
        type: 'documento',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Contrato físico recolhido na imobiliária demonstrando irregularidades formais.',
        fullDetail: 'Ausência de visto de advogado, dados bancários de pessoa jurídica estranha e ausência de mandato legal.',
        locationFoundId: 'LOC_IMOBILIARIA_DELTA',
        legalSignificance: 'Documento essencial para juntada aos autos a fim de sofrer declaração judicial de nulidade absoluta.',
        iconName: 'FileX'
      },
      {
        id: 'CLUE_RECIBO_IRRELEVANTE_ESTACIONAMENTO',
        title: 'Cupom de Estacionamento do Shopping',
        type: 'comprovante',
        relevance: 'irrelevante',
        isAuthentic: true,
        summary: 'Comprovante avulso sem nenhuma relação com o litígio ou as partes.',
        fullDetail: 'Cupom de R$ 18,00 de estacionamento do mês anterior.',
        locationFoundId: 'LOC_IMOBILIARIA_DELTA',
        legalSignificance: 'Sem valor probatório para a anulação da obrigação.',
        iconName: 'Receipt'
      },
      {
        id: 'CLUE_CERTIDAO_BO_ESTELIONATO',
        title: 'Certidão Policial de Inquérito de Estelionato',
        type: 'registro_publico',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Certidão da Polícia Civil identificando o investigado Marcos Vinícius como autor contumaz do golpe.',
        fullDetail: 'Informa que o intermediário da imobiliária já responde por fraudes idênticas na mesma região.',
        locationFoundId: 'LOC_DELEGACIA',
        legalSignificance: 'Fortalece o fumus boni iuris na concessão da medida liminar urgente de sustação de protesto.',
        iconName: 'Shield'
      },
      {
        id: 'CLUE_RELATORIO_POLICIAL_MODUS_OPERANDI',
        title: 'Relatório de Modus Operandi Policial',
        type: 'pericia',
        relevance: 'complementar',
        isAuthentic: true,
        summary: 'Esquema detalhado de como quadrilhas utilizam dados vazados de pensionistas.',
        fullDetail: 'Demonstra a vulnerabilidade de idosos e corrobora a hipossuficiência probatória da vítima.',
        locationFoundId: 'LOC_DELEGACIA',
        legalSignificance: 'Auxilia na fundamentação da tutela de urgência e inversão do ônus da prova.',
        iconName: 'Search'
      },
      {
        id: 'CLUE_SUMULA_RESPONSABILIDADE',
        title: 'Jurisprudência Consolidada sobre Fraude em Contratos',
        type: 'documento',
        relevance: 'complementar',
        isAuthentic: true,
        summary: 'Tese firmada pelos Tribunais Superiores sobre fortuito interno em fraudes praticadas por terceiros.',
        fullDetail: 'As empresas e prestadores de serviços respondem pelos danos causados pelo uso fraudulento de documentos de terceiros.',
        locationFoundId: 'LOC_ESCRITORIO_RAMOS',
        legalSignificance: 'Fundamentação jurídica basilar para a petição inicial.',
        iconName: 'Scale'
      }
    ],
    strategies: [
      {
        id: 'STRAT_AÇÃO_ANULATORIA_LIMINAR',
        title: 'Ação Declaratória de Nulidade de Negócio Jurídico c/c Tutela Provisória de Urgência e Indenização por Danos Morais',
        branch: 'Direito Processual Civil & Civil',
        description: 'Protocolar petição inicial fundamentada na ausência de consentimento (vício absoluto) e falsidade documental, com pedido liminar urgente para imediata sustação de qualquer protesto ou negativação e fixação de astreintes contra a imobiliária.',
        isOptimal: true,
        scoreWeight: 100,
        requiredCrucialClueIds: [
          'CLUE_CERTIDAO_CARTORIO_FRAUDE',
          'CLUE_CONTRATO_ORIGINAL_RASURADO',
          'CLUE_RG_ORIGINAL_MARLENE',
          'CLUE_BO_DOCUMENTO_PERDIDO'
        ],
        rationale: 'Estratégia perfeita e técnica segundo as normas processuais brasileiras: protege de imediato o patrimônio da aposentada e anula a obrigação contra todos os réus.'
      },
      {
        id: 'STRAT_NOTIFICACAO_EXTRAJUDICIAL_PASSIVA',
        title: 'Mera Notificação Extrajudicial Amigável à Imobiliária',
        branch: 'Extrajudicial',
        description: 'Enviar uma carta simples pedindo para a imobiliária cancelar a cobrança de bom grado e aguardar resposta.',
        isOptimal: false,
        scoreWeight: 35,
        requiredCrucialClueIds: ['CLUE_BO_DOCUMENTO_PERDIDO'],
        rationale: 'Inadequada para a gravidade do caso: não tem poder cogente, não impede a remessa do título ao Cartório de Protesto e deixa a cliente vulnerável à constrição judicial.'
      },
      {
        id: 'STRAT_CONTESTACAO_POSTERIOR',
        title: 'Aguardar a Imobiliária Executar a Dívida para só então opor Embargos à Execução',
        branch: 'Defensiva Passiva',
        description: 'Não ingressar com ação ativa e esperar o ajuizamento da execução de título extrajudicial pela imobiliária para apresentar defesa.',
        isOptimal: false,
        scoreWeight: 20,
        requiredCrucialClueIds: [],
        rationale: 'Estratégia temerária: permite que o nome da cliente seja protestado no SERASA/SPC e contas bancárias sofram penhora SISBAJUD antes de qualquer defesa.'
      }
    ],
    minimumPassingScore: 70
  },
  {
    id: 'CASO_02_NEGATIVACAO_INDEVIDA',
    code: 'PROC-2026/002-CON',
    title: 'A Negativação Abusiva e o Boleto Clonado',
    area: 'Direito do Consumidor & Bancário',
    difficulty: 'Iniciante',
    difficultyStars: 1,
    deadlineHours: 40,
    honorariosReward: 3200,
    xpReward: 350,
    reputationReward: 20,
    minCareerTier: 'ESTAGIARIO',
    client: {
      name: 'Lucas Mendes',
      occupation: 'Desenvolvedor de Software, 28 anos',
      summary: 'Lucas teve a aprovação do seu primeiro financiamento imobiliário cancelada no último minuto porque o Banco Finanza lançou seu nome indevidamente no cadastro de inadimplentes por uma fatura já quitada há 4 meses.',
      avatarBg: 'bg-blue-100 text-blue-900 border-blue-300'
    },
    briefing: {
      mentorName: 'Dr. Roberto Ramos',
      mentorQuote: 'Dano moral in re ipsa por inscrição indevida no SPC/SERASA! Mas temos um detalhe: o banco alega que o boleto pago pelo Lucas foi gerado por um malware ou intermediador fantasma. Você precisa rastrear o código de barras, conferir o comprovante de liquidação bancária e comprovar a falha de segurança na plataforma do banco!',
      facts: [
        'O cliente pagou a fatura emitida diretamente do aplicativo oficial do banco.',
        'O comprovante possui código de autenticação bancária de compensação nacional.',
        'O banco sustenta que não recebeu os valores e recusou-se a retirar a restrição cadastral.',
        'O prazo da proposta de compra do imóvel expira em 40 horas úteis.'
      ],
      mainObjective: 'Provar o pagamento tempestivo pelo canal disponibilizado pela instituição financeira, atestar o fortuito interno (Súmula 479 do STJ) e pleitear exclusão liminar do SPC e indenização.',
      legalContext: 'Responsabilidade objetiva das instituições bancárias em fraudes eletrônicas e dano moral in re ipsa.'
    },
    locations: [
      {
        id: 'LOC_ESCRITORIO_RAMOS_2',
        name: 'Escritório Ramos & Associados',
        category: 'escritorio',
        travelTimeHours: 0,
        travelCost: 0,
        description: 'Base de estudos e preparação das peças.',
        address: 'Av. Paulista, 1200 - Conjunto 804',
        iconName: 'Building2',
        color: 'text-amber-500',
        unlockedByDefault: true,
        characters: [
          {
            id: 'CHAR_DRA_CAROLINA',
            name: 'Dra. Carolina Freitas',
            role: 'Advogada Sênior de Contencioso',
            avatarIcon: 'Briefcase',
            avatarBg: 'bg-slate-800 text-blue-400 border-blue-500',
            initialDialogue: 'Em matéria bancária, a Súmula 479 do STJ é nossa principal aliada. Fraude cometida por terceiro no âmbito de operações bancárias configura fortuito interno!',
            dialogueOptions: [
              {
                id: 'diag_carol_juris',
                question: 'Dra. Carolina, como comprovar que o cliente não tem culpa pelo desvio do boleto?',
                answer: 'Precisamos do log de acesso ou e-mail original com os cabeçalhos, comprovante do aplicativo com o código de barras e a certidão do SERASA comprovando a recusa do financiamento.',
                timeCostMinutes: 20
              }
            ]
          }
        ],
        searchables: [
          {
            id: 'spot_sumula_479',
            name: 'Compêndio de Súmulas do STJ',
            description: 'Localizar a tese vinculante sobre segurança em canais bancários.',
            timeCostMinutes: 20,
            foundClueId: 'CLUE_SUMULA_STJ_479',
            inspectedMessage: 'Você fichou a Súmula 479 do STJ: "As instituições financeiras respondem objetivamente pelos danos gerados por fortuito interno relativo a fraudes e delitos praticados por terceiros".'
          }
        ]
      },
      {
        id: 'LOC_CLIENTE_LUCAS',
        name: 'Apartamento do Lucas Mendes',
        category: 'residencia',
        travelTimeHours: 2,
        travelCost: 30,
        description: 'Apartamento alugado onde o cliente trabalha em home office.',
        address: 'Rua Bela Cintra, 820 - Consolação',
        iconName: 'Laptop',
        color: 'text-blue-400',
        unlockedByDefault: true,
        characters: [
          {
            id: 'CHAR_LUCAS',
            name: 'Lucas Mendes',
            role: 'Cliente',
            avatarIcon: 'User',
            avatarBg: 'bg-blue-100 text-blue-900 border-blue-300',
            initialDialogue: 'Estava tudo pronto para assinar a escritura da minha casa própria. Quando o agente da Caixa puxou meu score, meu nome estava sujo por uma dívida de R$ 1.450 que eu paguei rigorosamente no dia do vencimento!',
            dialogueOptions: [
              {
                id: 'diag_lucas_comprovante',
                question: 'Você guardou o comprovante emitido pelo seu banco com o código de autenticação?',
                answer: 'Sim, exportei o PDF em alta resolução e o extrato da conta corrente de onde saíram os R$ 1.450 debitados na hora.',
                revealsClueId: 'CLUE_COMPROVANTE_PAGAMENTO_DEBITADO',
                timeCostMinutes: 20
              },
              {
                id: 'diag_lucas_negativa_financiamento',
                question: 'A Caixa Econômica te entregou o documento de recusa formal do crédito?',
                answer: 'Entregou sim! Tá aqui a declaração do gerente com a data de ontem comprovando que o motivo único foi o apontamento do Banco Finanza.',
                revealsClueId: 'CLUE_CARTA_RECUSA_FINANCIAMENTO',
                timeCostMinutes: 25
              }
            ]
          }
        ],
        searchables: [
          {
            id: 'spot_email_banco',
            name: 'Notebook com o E-mail e Log do Internet Banking',
            description: 'Conferir o e-mail oficial de envio do boleto emitido pelo domínio do banco.',
            timeCostMinutes: 35,
            foundClueId: 'CLUE_LOG_DOMINIO_BANCO',
            inspectedMessage: 'O log de IP comprova que o boleto foi gerado e baixado de dentro do servidor seguro oficial do Banco Finanza.'
          }
        ]
      },
      {
        id: 'LOC_AGENCIA_FINANZA',
        name: 'Agência Central do Banco Finanza',
        category: 'banco',
        travelTimeHours: 2,
        travelCost: 35,
        description: 'Agência bancária corporativa com setor de ouvidoria e atendimento a advogados.',
        address: 'Av. Brigadeiro Faria Lima, 3400',
        iconName: 'Landmark',
        color: 'text-indigo-400',
        unlockedByDefault: true,
        characters: [
          {
            id: 'CHAR_GERENTE_ALBERTO',
            name: 'Alberto Vasconcelos',
            role: 'Gerente Geral de Relacionamento',
            avatarIcon: 'ShieldAlert',
            avatarBg: 'bg-indigo-950 text-indigo-300 border-indigo-500',
            initialDialogue: 'Doutor, nosso sistema identificou que o valor foi creditado em uma conta de terceiro em outra instituição. Para nós, a fatura continua em aberto e o sistema negativou automaticamente.',
            dialogueOptions: [
              {
                id: 'diag_alberto_falha_sistema',
                question: 'Mas o boleto foi extraído de dentro do ambiente autenticado do aplicativo do próprio banco!',
                answer: 'Infelizmente nossos termos de uso dizem que a conferência dos dados do beneficiário é de responsabilidade do cliente. Se quiser tirar do SERASA, só com ordem judicial.',
                revealsClueId: 'CLUE_RECUSA_ADMINISTRATIVA_BANCO',
                timeCostMinutes: 30,
                attitude: 'suspeito'
              }
            ]
          }
        ],
        searchables: [
          {
            id: 'spot_extrato_serasa',
            name: 'Terminal de Consulta Cadastral CDL/SERASA',
            description: 'Obter o extrato oficial e atualizado da restrição cadastral com data e protocolo.',
            timeCostMinutes: 30,
            foundClueId: 'CLUE_EXTRATO_SERASA_OFICIAL',
            inspectedMessage: 'Extrato oficial detalhado comprovando a negativação de R$ 1.450,00 e o decréscimo drástico do score de crédito do cliente de 880 para 210 pontos.'
          }
        ]
      }
    ],
    availableClues: [
      {
        id: 'CLUE_COMPROVANTE_PAGAMENTO_DEBITADO',
        title: 'Comprovante Bancário de Débito em Conta com Autenticação Mecânica',
        type: 'comprovante',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Comprovante autêntico atestando o débito tempestivo de R$ 1.450,00 na conta do cliente.',
        fullDetail: 'Possui código de autenticação de 32 dígitos emitido pelo Sistema de Pagamentos Brasileiro (SPB).',
        locationFoundId: 'LOC_CLIENTE_LUCAS',
        legalSignificance: 'Prova irrefutável do adimplemento da obrigação pelo consumidor.',
        iconName: 'Receipt'
      },
      {
        id: 'CLUE_CARTA_RECUSA_FINANCIAMENTO',
        title: 'Declaração de Recusa de Financiamento Imobiliário',
        type: 'documento',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Documento da Caixa Econômica atestando a perda da linha de crédito devido ao apontamento.',
        fullDetail: 'Demonstra o dano material e moral concreto decorrente da ilicitude perpetrada pelo banco réu.',
        locationFoundId: 'LOC_CLIENTE_LUCAS',
        legalSignificance: 'Majora o quantum indenizatório a título de danos morais pela frustração do sonho da casa própria.',
        iconName: 'FileX'
      },
      {
        id: 'CLUE_LOG_DOMINIO_BANCO',
        title: 'Laudo de Log do Internet Banking e Cabeçalho do Boleto',
        type: 'pericia',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Registro técnico comprovando que o código foi gerado no ambiente criptografado do banco.',
        fullDetail: 'Atesta que a falha ocorreu nos servidores da própria instituição financeira ré.',
        locationFoundId: 'LOC_CLIENTE_LUCAS',
        legalSignificance: 'Caracteriza a responsabilidade objetiva por falha na segurança do serviço (art. 14 do CDC).',
        iconName: 'Laptop'
      },
      {
        id: 'CLUE_EXTRATO_SERASA_OFICIAL',
        title: 'Extrato Oficial do SPC/SERASA Experian',
        type: 'registro_publico',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Certidão negativação ativa inserida pelo Banco Finanza.',
        fullDetail: 'Prova documental indispensável da ocorrência da lesão ao nome do consumidor.',
        locationFoundId: 'LOC_AGENCIA_FINANZA',
        legalSignificance: 'Condição de procedibilidade e prova do dano moral in re ipsa.',
        iconName: 'FileCheck'
      },
      {
        id: 'CLUE_RECUSA_ADMINISTRATIVA_BANCO',
        title: 'Protocolo de Recusa da Ouvidoria do Banco',
        type: 'documento',
        relevance: 'complementar',
        isAuthentic: true,
        summary: 'Registro da negativa do banco em resolver a questão administrativamente.',
        fullDetail: 'Comprova a pretensão resistida e a necessidade de intervenção do Poder Judiciário.',
        locationFoundId: 'LOC_AGENCIA_FINANZA',
        legalSignificance: 'Demonstra a resistência injustificada e a desídia do fornecedor de serviços.',
        iconName: 'ShieldAlert'
      },
      {
        id: 'CLUE_SUMULA_STJ_479',
        title: 'Súmula 479 do Superior Tribunal de Justiça',
        type: 'documento',
        relevance: 'complementar',
        isAuthentic: true,
        summary: 'Verbete sumular consolidado sobre fraudes e fortuito interno bancário.',
        fullDetail: 'Fundamenta o julgamento procedente da ação sob a ótica jurisprudencial dominante.',
        locationFoundId: 'LOC_ESCRITORIO_RAMOS_2',
        legalSignificance: 'Baliza teórica pacificada.',
        iconName: 'Scale'
      }
    ],
    strategies: [
      {
        id: 'STRAT_ACAO_OBRIGACAO_FAZER_DANOS',
        title: 'Ação Declaratória de Inexistência de Débito c/c Obrigação de Fazer (Baixa Imediata no SERASA em 24h sob pena de multa diária) e Reparação por Danos Morais',
        branch: 'Direito do Consumidor & Bancário',
        description: 'Ingressar perante a Vara Cível requerendo tutela de urgência inaudita altera parte para expedição de ofício ao SERASA/SPC com prazo de 24 horas sob pena de multa cominatória de R$ 1.000/dia, além de indenização de R$ 20.000 por danos morais e materiais decorrentes da perda da linha de financiamento imobiliário.',
        isOptimal: true,
        scoreWeight: 100,
        requiredCrucialClueIds: [
          'CLUE_COMPROVANTE_PAGAMENTO_DEBITADO',
          'CLUE_EXTRATO_SERASA_OFICIAL',
          'CLUE_CARTA_RECUSA_FINANCIAMENTO',
          'CLUE_LOG_DOMINIO_BANCO'
        ],
        rationale: 'Estratégia impecável que assegura a desconstituição imediata do gravame, salvando a compra do imóvel do cliente e punindo exemplarmente o abuso bancário.'
      },
      {
        id: 'STRAT_RECLAMACAO_PROCON_APENAS',
        title: 'Mera Reclamação no PROCON / Consumidor.gov',
        branch: 'Administrativa',
        description: 'Registrar ocorrência nos órgãos de defesa do consumidor e esperar a resposta em 30 dias úteis.',
        isOptimal: false,
        scoreWeight: 30,
        requiredCrucialClueIds: ['CLUE_COMPROVANTE_PAGAMENTO_DEBITADO'],
        rationale: 'O prazo do financiamento imobiliário é de 40 horas. O PROCON não tem poder de tutela de urgência jurisdicional nem arbitra danos morais, fazendo o cliente perder a aquisição do imóvel.'
      }
    ],
    minimumPassingScore: 70
  },
  {
    id: 'CASO_03_DISPUTA_SOCIETARIA',
    code: 'PROC-2026/003-EMP',
    title: 'O Desvio de Ativos da Startup NexaTech',
    area: 'Direito Empresarial & Societário',
    difficulty: 'Intermediário',
    difficultyStars: 2,
    deadlineHours: 56,
    honorariosReward: 6500,
    xpReward: 600,
    reputationReward: 25,
    minCareerTier: 'ESTAGIARIO_SENIOR',
    client: {
      name: 'Camila Albuquerque',
      occupation: 'Sócia Fundadora & CTO',
      summary: 'Camila descobriu que seu sócio administrador transferiu secretamente as marcas, patentes de software e o faturamento principal da empresa para uma holding paralela criada em nome da cunhada.',
      avatarBg: 'bg-emerald-100 text-emerald-900 border-emerald-300'
    },
    briefing: {
      mentorName: 'Dr. Roberto Ramos',
      mentorQuote: 'Caso clássico de quebra do dever de lealdade societária e desvio de clientela! Como Estagiário Sênior, você deve coletar a certidão de inteiro teor na Junta Comercial (JUCESP), a ata notarial do código-fonte e os extratos fiscais para embasar a exclusão do sócio desleal e bloqueio de bens.',
      facts: [
        'A empresa foi avaliada em R$ 2,5 milhões em rodada seed.',
        'O sócio alterou os acessos aos repositórios e contas da empresa.',
        'Uma empresa clone com nome idêntico foi aberta na mesma semana.',
        'Temos 56 horas antes da transferência internacional do faturamento.'
      ],
      mainObjective: 'Comprovar a confusão patrimonial, o desvio de finalidade societária e obter a tutela cautelar de arresto de bens e afastamento do administrador.',
      legalContext: 'Desconsideração da personalidade jurídica (art. 50 do Código Civil) e exclusão judicial de sócio por falta grave.'
    },
    locations: [
      {
        id: 'LOC_ESCRITORIO_RAMOS_3',
        name: 'Escritório Ramos & Associados',
        category: 'escritorio',
        travelTimeHours: 0,
        travelCost: 0,
        description: 'Sala de reuniões corporativas.',
        address: 'Av. Paulista, 1200 - Conjunto 804',
        iconName: 'Building2',
        color: 'text-amber-500',
        unlockedByDefault: true,
        characters: [
          {
            id: 'CHAR_DR_ROBERTO_3',
            name: 'Dr. Roberto Ramos',
            role: 'Sócio Fundador',
            avatarIcon: 'Briefcase',
            avatarBg: 'bg-slate-800 text-amber-400 border-amber-500',
            initialDialogue: 'Na Junta Comercial você encontrará o contrato social original e as alterações fraudulentas não assinadas pela Camila.',
            dialogueOptions: [
              {
                id: 'diag_roberto_sociedade',
                question: 'Como comprovar a fraude na Junta Comercial?',
                answer: 'A certidão simplificada e a ficha cadastral completa mostrarão o endereço cruzado da empresa clone e os sócios laranjas!',
                timeCostMinutes: 20
              }
            ]
          }
        ],
        searchables: [
          {
            id: 'spot_lei_sociedades',
            name: 'Tratado de Direito Comercial e Falimentar',
            description: 'Pesquisar art. 1.030 do Código Civil sobre exclusão de sócio.',
            timeCostMinutes: 25,
            foundClueId: 'CLUE_DOUTRINA_EXCLUSAO_SOCIO',
            inspectedMessage: 'O art. 1.030 do CC autoriza a exclusão judicial do sócio por justa causa diante do cometimento de falta grave no cumprimento de suas obrigações.'
          }
        ]
      },
      {
        id: 'LOC_SEDE_NEXATECH',
        name: 'Sede da Startup NexaTech (Vila Olímpia)',
        category: 'empresa',
        travelTimeHours: 3,
        travelCost: 50,
        description: 'Escritório moderno em espaço de coworking de alto padrão.',
        address: 'Rua Funchal, 418 - 14º andar',
        iconName: 'Briefcase',
        color: 'text-emerald-400',
        unlockedByDefault: true,
        characters: [
          {
            id: 'CHAR_CAMILA_CTO',
            name: 'Camila Albuquerque',
            role: 'Cliente & CTO',
            avatarIcon: 'User',
            avatarBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
            initialDialogue: 'Meu sócio Rodrigo bloqueou meu login de administradora na AWS e nos bancos. Descobri que os contratos de clientes foram todos reemitidos com o CNPJ da empresa Nexa Global!',
            dialogueOptions: [
              {
                id: 'diag_camila_ata_notarial',
                question: 'Você conseguiu fazer ata notarial do desvio dos clientes e mensagens?',
                answer: 'Sim! Fui ao cartório e registrei a ata notarial de todas as conversas do Slack e WhatsApp onde ele confessa a manobra!',
                revealsClueId: 'CLUE_ATA_NOTARIAL_MENSAGENS',
                timeCostMinutes: 30
              }
            ]
          }
        ],
        searchables: [
          {
            id: 'spot_servidor_logs',
            name: 'Servidor Local e Backup de E-mails',
            description: 'Recolher os e-mails com as ordens de pagamento direcionadas à conta paralela.',
            timeCostMinutes: 45,
            foundClueId: 'CLUE_EMAILS_DESVIO_FATURAMENTO',
            inspectedMessage: 'E-mails comprovando a ordem do sócio para que clientes de grande porte fizessem PIX para a empresa espelho da cunhada.'
          }
        ]
      },
      {
        id: 'LOC_JUNTA_COMERCIAL',
        name: 'Junta Comercial do Estado de São Paulo (JUCESP)',
        category: 'cartorio',
        travelTimeHours: 3,
        travelCost: 60,
        description: 'Órgão de registro público de empresas mercantis.',
        address: 'Rua Guaicurus, 1344 - Lapa',
        iconName: 'FolderCheck',
        color: 'text-purple-400',
        unlockedByDefault: true,
        characters: [
          {
            id: 'CHAR_ANALISTA_JUNTA',
            name: 'Dra. Denise Matos',
            role: 'Analista de Registros da JUCESP',
            avatarIcon: 'Stamp',
            avatarBg: 'bg-purple-950 text-purple-300 border-purple-500',
            initialDialogue: 'Temos os assentamentos de ambas as sociedades arquivados digitalmente.',
            dialogueOptions: [
              {
                id: 'diag_junta_cruzamento',
                question: 'Pode emitir a certidão de inteiro teor das duas sociedades para cruzamento de dados?',
                answer: 'Aqui está. A empresa Nexa Global foi constituída com endereço idêntico, objeto social idêntico e a sócia administradora é a Sra. Fernanda (cunhada do sócio Rodrigo).',
                revealsClueId: 'CLUE_CERTIDAO_JUCESP_EMPRESA_ESPELHO',
                timeCostMinutes: 40
              }
            ]
          }
        ],
        searchables: [
          {
            id: 'spot_contrato_social_original',
            name: 'Contrato Social Primitivo da NexaTech',
            description: 'Verificar cláusula de exclusividade e dever de não concorrência.',
            timeCostMinutes: 30,
            foundClueId: 'CLUE_CONTRATO_SOCIAL_CLAUSULA_LEALDADE',
            inspectedMessage: 'O Contrato Social possui cláusula expressa de dedicação exclusiva e proibição categórica de concorrência com penalidade de perda das quotas.'
          }
        ]
      }
    ],
    availableClues: [
      {
        id: 'CLUE_ATA_NOTARIAL_MENSAGENS',
        title: 'Ata Notarial com Fé Pública de Conversas de WhatsApp e Slack',
        type: 'registro_publico',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Ata notarial lavrada em tabelionato comprovando o plano deliberado de desvio dos ativos.',
        fullDetail: 'Prova documental pré-constituída dotada de presunção de autenticidade sobre a comunicação dos sócios.',
        locationFoundId: 'LOC_SEDE_NEXATECH',
        legalSignificance: 'Comprova de plano a intenção fraudulenta e quebra do dever fiduciário de lealdade.',
        iconName: 'MessageSquare'
      },
      {
        id: 'CLUE_EMAILS_DESVIO_FATURAMENTO',
        title: 'E-mails Corporativos e Comprovantes de PIX para Conta Paralela',
        type: 'comprovante',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Comprovação contábil de R$ 420.000 em pagamentos de clientes desviados para a empresa clone.',
        fullDetail: 'Demonstra o esvaziamento patrimonial iminente e perigo na demora.',
        locationFoundId: 'LOC_SEDE_NEXATECH',
        legalSignificance: 'Justifica a concessão inaudita altera parte do arresto cautelar de contas bancárias.',
        iconName: 'Receipt'
      },
      {
        id: 'CLUE_CERTIDAO_JUCESP_EMPRESA_ESPELHO',
        title: 'Certidão de Inteiro Teor da JUCESP da Sociedade Espelho',
        type: 'registro_publico',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Documento público demonstrando a simulação e o uso de pessoa interposta (laranja).',
        fullDetail: 'Cruza os dados societários e o vínculo familiar da administradora formal.',
        locationFoundId: 'LOC_JUNTA_COMERCIAL',
        legalSignificance: 'Fundamenta a extensão dos efeitos da responsabilidade e desconsideração da personalidade jurídica.',
        iconName: 'Scroll'
      },
      {
        id: 'CLUE_CONTRATO_SOCIAL_CLAUSULA_LEALDADE',
        title: 'Contrato Social Registrado com Cláusula de Não-Concorrência',
        type: 'documento',
        relevance: 'crucial',
        isAuthentic: true,
        summary: 'Estatuto original contendo vedação absoluta de atividade concorrente pelos sócios.',
        fullDetail: 'Estabelece a obrigação de indenizar e a perda de direitos de gestão.',
        locationFoundId: 'LOC_JUNTA_COMERCIAL',
        legalSignificance: 'Caracteriza o inadimplemento contratual grave.',
        iconName: 'FileText'
      },
      {
        id: 'CLUE_DOUTRINA_EXCLUSAO_SOCIO',
        title: 'Fundamentação Doutrinária do Art. 1.030 do Código Civil',
        type: 'documento',
        relevance: 'complementar',
        isAuthentic: true,
        summary: 'Dispositivo legal que autoriza a exclusão judicial de sócio faltoso.',
        fullDetail: 'Base legal estrutural da pretensão.',
        locationFoundId: 'LOC_ESCRITORIO_RAMOS_3',
        legalSignificance: 'Alinhamento com a legislação substantiva.',
        iconName: 'Scale'
      }
    ],
    strategies: [
      {
        id: 'STRAT_DISSOLUCAO_PARCIAL_ARRESTO',
        title: 'Ação de Exclusão Judicial de Sócio por Falta Grave c/c Dissolução Parcial de Sociedade, Apuração de Haveres e Tutela Cautelar de Arresto de Bens',
        branch: 'Direito Empresarial & Processo Civil',
        description: 'Ajuizar ação perante a Vara Empresarial Especializada com pedido de liminar urgente para: 1) Afastar imediatamente o sócio infiel da administração; 2) Bloquear via SISBAJUD as contas da sociedade clone e da administradora de fachada; 3) Reestabelecer o acesso da cliente aos servidores e contas da empresa.',
        isOptimal: true,
        scoreWeight: 100,
        requiredCrucialClueIds: [
          'CLUE_ATA_NOTARIAL_MENSAGENS',
          'CLUE_EMAILS_DESVIO_FATURAMENTO',
          'CLUE_CERTIDAO_JUCESP_EMPRESA_ESPELHO',
          'CLUE_CONTRATO_SOCIAL_CLAUSULA_LEALDADE'
        ],
        rationale: 'Estratégia cirúrgica que impede a dilapidação do patrimônio tecnológico e recupera a gestão legítima da startup.'
      },
      {
        id: 'STRAT_NOTIFICACAO_SOCIETARIA_SIMPLES',
        title: 'Convocação de Reunião de Sócios sem Medida Judicial',
        branch: 'Societária Amigável',
        description: 'Enviar carta convocando reunião para deliberar a prestação de contas no prazo legal de 15 dias.',
        isOptimal: false,
        scoreWeight: 25,
        requiredCrucialClueIds: [],
        rationale: 'Permite que o sócio golpista conclua a remessa dos recursos ao exterior antes de qualquer provimento cautelar.'
      }
    ],
    minimumPassingScore: 75
  }
];
