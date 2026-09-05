export interface LegacyNpcAssignmentTemplate {
  caseId: string;
  npcKeys: string[];
  roleInCase: string;
  isRequired: boolean;
  sortOrder: number;
  configuration: Record<string, unknown>;
}

/**
 * Compatibilidade para casos publicados antes da criação de `case_npcs`.
 *
 * Essas associações são deliberadamente específicas por caso/local. Elas não
 * transformam profissão em regra automática: apenas materializam, no runtime,
 * os vínculos que já fazem sentido na narrativa dos casos legados.
 *
 * Quando o rota-admin passar a salvar a mesma associação em `case_npcs`, a
 * relação persistida ganha prioridade e esta camada deixa de interferir.
 */
const LEGACY_NPC_ASSIGNMENTS: LegacyNpcAssignmentTemplate[] = [
  {
    caseId: 'CASO_01_LOCACAO_FANTASMA',
    npcKeys: ['henrique-vasconcelos', 'delegado-henrique-vasconcelos'],
    roleInCase: 'Delegado responsável pelo setor de estelionato',
    isRequired: false,
    sortOrder: 10,
    configuration: {
      locationId: 'LOC_DELEGACIA',
      initialDialogue: 'Doutor, estou acompanhando os registros ligados a fraudes de locação. Posso esclarecer o que consta formalmente na investigação.',
      dialogueOptions: [
        {
          id: 'outros-inqueritos-marcos',
          question: 'Há outros inquéritos relacionados ao nome Marcos Vinícius?',
          answer: 'Sim. Há outros três inquéritos em andamento envolvendo o nome Marcos Vinícius e golpes de locação. O dado aparece junto ao registro da ocorrência de Marlene.',
          revealsClueId: 'CLUE_CERTIDAO_BO_ESTELIONATO',
          timeCostMinutes: 20,
          attitude: 'cooperativo',
        },
        {
          id: 'cronologia-perda-documentos',
          question: 'O registro da perda dos documentos é anterior à fraude?',
          answer: 'É anterior. O boletim de ocorrência foi lavrado há oito meses e registra a perda de RG e CPF. Essa cronologia é relevante para confrontar a abertura posterior da firma utilizada no contrato.',
          timeCostMinutes: 15,
          attitude: 'cooperativo',
        },
      ],
    },
  },
  {
    caseId: 'CASO_01_LOCACAO_FANTASMA',
    npcKeys: ['luana-martins'],
    roleInCase: 'Investigadora do setor de estelionato',
    isRequired: false,
    sortOrder: 20,
    configuration: {
      locationId: 'LOC_DELEGACIA',
      initialDialogue: 'Eu levantei os registros ligados à perda dos documentos e às ocorrências de fraude. Pode perguntar, doutor.',
      dialogueOptions: [
        {
          id: 'documentos-registrados-no-bo',
          question: 'Quais documentos constam como perdidos no boletim de ocorrência?',
          answer: 'O registro detalha a perda do RG e do CPF de Marlene Silveira. O boletim é o nº 44102/2025 e foi lavrado meses antes do contrato questionado.',
          revealsClueId: 'CLUE_CERTIDAO_BO_ESTELIONATO',
          timeCostMinutes: 20,
          attitude: 'cooperativo',
        },
        {
          id: 'padrao-das-ocorrencias',
          question: 'Os outros registros indicam algum padrão de golpe?',
          answer: 'Os registros relacionados ao mesmo nome investigado também tratam de golpe de locação. Isso permite comparar o modo de atuação sem presumir autoria apenas pela coincidência do nome.',
          timeCostMinutes: 15,
          attitude: 'cooperativo',
        },
      ],
    },
  },
  {
    caseId: 'CASO_06_RECONHECIMENTO_FALHO',
    npcKeys: ['henrique-vasconcelos', 'delegado-henrique-vasconcelos'],
    roleInCase: 'Delegado responsável pelo inquérito',
    isRequired: false,
    sortOrder: 10,
    configuration: {
      locationId: 'C06_DELEGACIA',
      initialDialogue: 'O inquérito está sob responsabilidade desta unidade. Posso esclarecer o procedimento adotado e os elementos formalmente reunidos.',
      dialogueOptions: [
        {
          id: 'procedimento-reconhecimento',
          question: 'Como foi conduzido o reconhecimento fotográfico de André?',
          answer: 'Foi apresentada à vítima uma única fotografia de André, sem um conjunto de pessoas semelhantes para comparação. Esse foi o procedimento registrado nos autos.',
          revealsClueId: 'C06_CLUE_RECON_SUGESTIVO',
          timeCostMinutes: 20,
          attitude: 'cooperativo',
        },
        {
          id: 'elementos-alem-reconhecimento',
          question: 'Além do reconhecimento, quais elementos materiais vinculam André ao roubo?',
          answer: 'Não houve apreensão de bem da vítima, arma ou roupa descrita com André. Também existe apenas uma denúncia anônima genérica como elemento anterior ao reconhecimento.',
          revealsClueId: 'C06_CLUE_SEM_APREENSAO',
          timeCostMinutes: 20,
          attitude: 'neutro',
        },
      ],
    },
  },
  {
    caseId: 'CASO_06_RECONHECIMENTO_FALHO',
    npcKeys: ['luana-martins'],
    roleInCase: 'Investigadora da equipe do inquérito',
    isRequired: false,
    sortOrder: 20,
    configuration: {
      locationId: 'C06_DELEGACIA',
      initialDialogue: 'Eu participei do levantamento operacional deste inquérito. Posso detalhar o que a equipe conseguiu — e o que não conseguiu — confirmar.',
      dialogueOptions: [
        {
          id: 'dados-denuncia-anonima',
          question: 'A denúncia anônima trouxe algum dado verificável?',
          answer: 'Só informava o primeiro nome e descrevia uma moto preta. Não havia placa, endereço ou outro dado individualizador que pudesse ser confirmado de forma independente.',
          revealsClueId: 'C06_CLUE_DENUNCIA_FRACA',
          timeCostMinutes: 20,
          attitude: 'cooperativo',
        },
        {
          id: 'objetos-apreendidos',
          question: 'Algum objeto da vítima, arma ou roupa descrita foi encontrado com André?',
          answer: 'Não. A equipe não localizou bem da vítima, arma nem a roupa descrita no roubo entre os pertences de André.',
          revealsClueId: 'C06_CLUE_SEM_APREENSAO',
          timeCostMinutes: 15,
          attitude: 'cooperativo',
        },
        {
          id: 'contradicoes-investigacao',
          question: 'Qual contradição da investigação merece mais atenção?',
          answer: 'O ponto mais sensível é a distância entre a força do reconhecimento e a ausência de confirmação material. A denúncia é genérica e as apreensões não corroboram a identificação.',
          timeCostMinutes: 15,
          attitude: 'neutro',
        },
      ],
    },
  },
];

export function getLegacyNpcAssignmentTemplates(caseId: string): LegacyNpcAssignmentTemplate[] {
  return LEGACY_NPC_ASSIGNMENTS.filter((assignment) => assignment.caseId === caseId);
}
