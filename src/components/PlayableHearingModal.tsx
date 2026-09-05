import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Gavel, Scale, UserRound, X } from 'lucide-react';
import type { ActiveCaseState, Clue, LegalCase } from '../types/game';
import {
  getCaseSpecificHearingConfig,
  type PlayableHearingAnswer,
  type PlayableHearingResult,
} from '../lib/reactiveWorldStore';
import { sound } from '../utils/sound';

interface HearingChoice {
  id: string;
  label: string;
  explanation: string;
  impact: number;
  correct: boolean;
}

interface HearingRound {
  id: string;
  speaker: string;
  title: string;
  prompt: string;
  choices: HearingChoice[];
}

interface PlayableHearingModalProps {
  isOpen: boolean;
  currentCase: LegalCase;
  activeState: ActiveCaseState;
  selectedEvidenceIds: string[];
  onCancel: () => void;
  onComplete: (result: PlayableHearingResult) => void;
}

function strongestSelectedClue(currentCase: LegalCase, selectedEvidenceIds: string[]) {
  const selected = currentCase.availableClues.filter((clue) => selectedEvidenceIds.includes(clue.id));
  return (
    selected.find((clue) => clue.isAuthentic && clue.relevance === 'crucial') ||
    selected.find((clue) => clue.isAuthentic && clue.relevance === 'complementar') ||
    null
  );
}

function firstQuestionedCharacter(currentCase: LegalCase, activeState: ActiveCaseState) {
  for (const location of currentCase.locations) {
    for (const character of location.characters) {
      if (character.dialogueOptions.some((option) => activeState.askedDialogueIds.includes(option.id))) {
        return character;
      }
    }
  }
  return currentCase.locations.flatMap((location) => location.characters)[0] || null;
}

function buildEvidenceChoices(bestClue: Clue | null, selectedClues: Clue[]): HearingChoice[] {
  if (!bestClue) {
    return [
      {
        id: 'admit-gap',
        label: 'Reconhecer que a instrução não trouxe suporte suficiente para esse ponto',
        explanation: 'Na audiência, inventar uma prova que não está nos autos costuma ser pior do que reconhecer uma lacuna probatória.',
        impact: 2,
        correct: true,
      },
      {
        id: 'invent-support',
        label: 'Afirmar que existem documentos que ainda não foram juntados',
        explanation: 'Você não pode sustentar o pedido em material que não integra os autos.',
        impact: -2,
        correct: false,
      },
      {
        id: 'oral-only',
        label: 'Dizer que o relato do cliente, sozinho, já comprova integralmente o fato',
        explanation: 'A força do relato depende do caso, mas não substitui automaticamente a prova necessária.',
        impact: -1,
        correct: false,
      },
    ];
  }

  const distractors = selectedClues.filter((clue) => clue.id !== bestClue.id).slice(0, 2);
  const choices: HearingChoice[] = [
    {
      id: `clue-${bestClue.id}`,
      label: bestClue.title,
      explanation: `Esse elemento é ${bestClue.relevance} e autêntico, por isso é o suporte mais consistente entre as provas efetivamente anexadas.`,
      impact: 2,
      correct: true,
    },
    ...distractors.map((clue) => ({
      id: `clue-${clue.id}`,
      label: clue.title,
      explanation: clue.isAuthentic
        ? 'Essa prova pode ter utilidade, mas não é o melhor fundamento entre os elementos selecionados para esse ponto.'
        : 'Esse material tem problema de autenticidade e não deveria ser apresentado como principal suporte da tese.',
      impact: clue.isAuthentic ? 0 : -2,
      correct: false,
    })),
  ];

  if (choices.length < 3) {
    choices.push({
      id: 'generic-claim',
      label: 'A própria narrativa da petição já basta como prova',
      explanation: 'Alegação e prova são coisas diferentes. O juiz está perguntando pelo elemento probatório que sustenta o fato.',
      impact: -1,
      correct: false,
    });
  }

  return choices;
}

function buildRounds(currentCase: LegalCase, activeState: ActiveCaseState, selectedEvidenceIds: string[]): HearingRound[] {
  const specific = getCaseSpecificHearingConfig(currentCase);
  if (specific?.rounds?.length) {
    return specific.rounds.map((round) => {
      const relatedClue = round.relatedClueId
        ? currentCase.availableClues.find((clue) => clue.id === round.relatedClueId) || null
        : null;
      const relatedClueMissing = relatedClue && !selectedEvidenceIds.includes(relatedClue.id);
      return {
        id: `admin-${round.id}`,
        speaker: round.speaker,
        title: round.title,
        prompt: relatedClueMissing
          ? `${round.prompt} Atenção: “${relatedClue.title}” existe na investigação, mas não foi anexada aos autos por você.`
          : round.prompt,
        choices: round.choices.map((choice) => ({
          id: choice.id,
          label: choice.label,
          explanation: choice.explanation,
          impact: choice.impact,
          correct: choice.impact > 0,
        })),
      };
    });
  }

  const selectedClues = currentCase.availableClues.filter((clue) => selectedEvidenceIds.includes(clue.id));
  const bestClue = strongestSelectedClue(currentCase, selectedEvidenceIds);
  const questionedCharacter = firstQuestionedCharacter(currentCase, activeState);
  const falseSelected = selectedClues.find((clue) => !clue.isAuthentic) || null;

  return [
    {
      id: 'hearing-evidence-foundation',
      speaker: 'Juízo',
      title: 'Fundamentação probatória',
      prompt: 'O magistrado pede que você indique qual elemento dos autos melhor sustenta o fato central da tese apresentada. O que você destaca?',
      choices: buildEvidenceChoices(bestClue, selectedClues),
    },
    {
      id: 'hearing-contradiction',
      speaker: questionedCharacter?.name || 'Testemunha',
      title: 'Contradição em audiência',
      prompt: `${questionedCharacter?.name || 'Uma pessoa ouvida'} apresenta uma versão diferente daquela registrada anteriormente. Como você conduz a situação?`,
      choices: [
        {
          id: 'confront-objectively',
          label: 'Apontar a divergência de forma objetiva e pedir esclarecimento sobre o ponto específico',
          explanation: 'Confrontar versões com precisão ajuda o juiz a avaliar credibilidade sem transformar a audiência em intimidação.',
          impact: 2,
          correct: true,
        },
        {
          id: 'accuse-lying',
          label: 'Acusar imediatamente a pessoa de estar mentindo e exigir que confirme sua versão anterior',
          explanation: 'A postura agressiva pode prejudicar a credibilidade da condução e contaminar o depoimento.',
          impact: -2,
          correct: false,
        },
        {
          id: 'ignore-contradiction',
          label: 'Ignorar a divergência para não criar tensão na audiência',
          explanation: 'Uma contradição relevante não tratada pode permanecer contra sua própria tese.',
          impact: -1,
          correct: false,
        },
      ],
    },
    {
      id: 'hearing-authenticity',
      speaker: 'Parte contrária',
      title: 'Impugnação de autenticidade',
      prompt: falseSelected
        ? `A parte contrária questiona a autenticidade de “${falseSelected.title}”, uma das provas que você anexou. Como responde?`
        : 'A parte contrária tenta desqualificar um documento autêntico dos autos sem apresentar elemento concreto de falsidade. Como responde?',
      choices: falseSelected
        ? [
            {
              id: 'withdraw-false',
              label: 'Reconhecer a inconsistência, deixar de sustentar a tese nesse material e concentrar a defesa nas provas autênticas',
              explanation: 'Persistir em prova inidônea agrava o problema. Reconhecer a falha não apaga o erro, mas evita aprofundá-lo.',
              impact: 1,
              correct: true,
            },
            {
              id: 'insist-false',
              label: 'Insistir que o documento é verdadeiro porque favorece o cliente',
              explanation: 'A utilidade do documento para a tese não substitui a verificação de autenticidade.',
              impact: -3,
              correct: false,
            },
            {
              id: 'attack-opponent',
              label: 'Atacar a parte contrária por levantar a dúvida e evitar discutir o documento',
              explanation: 'A resposta não enfrenta o problema probatório apresentado ao Juízo.',
              impact: -2,
              correct: false,
            },
          ]
        : [
            {
              id: 'defend-authenticity',
              label: 'Demonstrar origem, contexto e coerência do documento com o restante do conjunto probatório',
              explanation: 'A resposta enfrenta tecnicamente a impugnação e conecta o documento ao restante dos autos.',
              impact: 2,
              correct: true,
            },
            {
              id: 'say-obvious',
              label: 'Dizer apenas que o documento “parece verdadeiro”',
              explanation: 'Aparência não substitui fundamentação sobre origem e contexto.',
              impact: -1,
              correct: false,
            },
            {
              id: 'refuse-discussion',
              label: 'Recusar-se a discutir o tema porque o documento já foi juntado',
              explanation: 'A juntada não impede que a outra parte questione autenticidade ou valor probatório.',
              impact: -1,
              correct: false,
            },
          ],
    },
    {
      id: 'hearing-closing',
      speaker: 'Juízo',
      title: 'Encerramento da instrução',
      prompt: 'Ao final da audiência, o juiz concede uma manifestação breve sobre o que ficou demonstrado. Qual postura você adota?',
      choices: [
        {
          id: 'close-on-record',
          label: 'Sustentar somente os pontos que encontram apoio efetivo nas provas produzidas',
          explanation: 'Uma conclusão coerente com os autos preserva credibilidade e permite ao juiz identificar com clareza o que foi demonstrado.',
          impact: 2,
          correct: true,
        },
        {
          id: 'expand-facts',
          label: 'Acrescentar fatos novos que não foram investigados para fortalecer a narrativa',
          explanation: 'Criar fatos no encerramento rompe a coerência da instrução e pode prejudicar toda a tese.',
          impact: -3,
          correct: false,
        },
        {
          id: 'personal-attack',
          label: 'Concentrar a fala em críticas pessoais à parte contrária',
          explanation: 'A decisão judicial deve ser convencida por fatos, prova e direito, não por ataques pessoais.',
          impact: -2,
          correct: false,
        },
      ],
    },
  ];
}

export const PlayableHearingModal: React.FC<PlayableHearingModalProps> = ({
  isOpen,
  currentCase,
  activeState,
  selectedEvidenceIds,
  onCancel,
  onComplete,
}) => {
  const hearingConfig = getCaseSpecificHearingConfig(currentCase);
  const rounds = useMemo(
    () => buildRounds(currentCase, activeState, selectedEvidenceIds),
    [currentCase, activeState, selectedEvidenceIds],
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [answers, setAnswers] = useState<PlayableHearingAnswer[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<HearingChoice | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  if (!isOpen) return null;

  const round = rounds[roundIndex];
  const runningImpact = answers.reduce((sum, answer) => sum + answer.impact, 0) + (selectedChoice?.impact || 0);
  const correctAnswers = answers.filter((answer) => answer.impact > 0).length + (selectedChoice?.correct ? 1 : 0);

  const choose = (choice: HearingChoice) => {
    if (selectedChoice || isFinished) return;
    sound.playPaper();
    setSelectedChoice(choice);
  };

  const continueRound = () => {
    if (!selectedChoice) return;
    const nextAnswers = [...answers, { roundId: round.id, choiceId: selectedChoice.id, impact: selectedChoice.impact }];

    if (roundIndex >= rounds.length - 1) {
      setAnswers(nextAnswers);
      setSelectedChoice(null);
      setIsFinished(true);
      sound.playGavel();
      return;
    }

    setAnswers(nextAnswers);
    setSelectedChoice(null);
    setRoundIndex((current) => current + 1);
  };

  const finish = () => {
    const totalImpact = answers.reduce((sum, answer) => sum + answer.impact, 0);
    const positive = answers.filter((answer) => answer.impact > 0).length;
    const minPossible = rounds.reduce((sum, item) => sum + Math.min(...item.choices.map((choice) => choice.impact)), 0);
    const maxPossible = rounds.reduce((sum, item) => sum + Math.max(...item.choices.map((choice) => choice.impact)), 0);
    const range = Math.max(1, maxPossible - minPossible);
    const performancePercent = Math.max(0, Math.min(100, Math.round(((totalImpact - minPossible) / range) * 100)));
    const summary = performancePercent >= 75
      ? 'Sua condução foi técnica, objetiva e coerente com o que realmente estava nos autos.'
      : performancePercent >= 55
        ? 'A audiência foi conduzida de forma razoável, embora algumas decisões tenham reduzido a força da apresentação oral.'
        : performancePercent >= 35
          ? 'A audiência teve oscilações importantes. Parte da estratégia foi preservada, mas houve respostas que enfraqueceram a apresentação.'
          : 'A condução da audiência criou riscos adicionais e reduziu a credibilidade da tese perante o Juízo.';

    onComplete({
      caseId: currentCase.id,
      scoreModifier: Math.max(-8, Math.min(8, totalImpact)),
      performancePercent,
      correctAnswers: positive,
      totalRounds: rounds.length,
      summary,
      answers,
      completedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-[#060607]/95 p-3 backdrop-blur-md sm:p-6">
      <div className="my-4 w-full max-w-4xl overflow-hidden rounded-2xl border border-[#C5A059]/35 bg-[#111113] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#2A2A2E] bg-gradient-to-r from-[#181613] to-[#101012] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#C5A059]/35 bg-[#C5A059]/10 text-[#C5A059]"><Gavel size={22} /></div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C5A059]">Audiência de instrução • {currentCase.code}</span>
              <h2 className="mt-1 font-serif text-xl font-black text-[#F1EEE7]">{hearingConfig?.title || currentCase.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#8F8A83]">{hearingConfig?.intro || 'Suas decisões em audiência passam a integrar a avaliação do magistrado.'}</p>
            </div>
          </div>

          {!isFinished && roundIndex === 0 && answers.length === 0 && (
            <button type="button" onClick={onCancel} className="rounded-lg border border-[#2A2A2E] bg-[#171719] p-2 text-[#888] hover:text-[#EEE]" aria-label="Voltar à preparação"><X size={17} /></button>
          )}
        </div>

        {!isFinished ? (
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#C5A059]"><Scale size={14} /> Momento {roundIndex + 1} de {rounds.length}</div>
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[#242428]"><div className="h-full bg-[#C5A059] transition-all" style={{ width: `${((roundIndex + 1) / rounds.length) * 100}%` }} /></div>
            </div>

            <div className="rounded-xl border border-[#2A2A2E] bg-[#0C0C0D] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#8F8A83]"><UserRound size={14} className="text-[#C5A059]" /> {round.speaker}</div>
              <h3 className="mt-2 text-base font-bold text-[#E8E4DB]">{round.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[#B9B4AC]">{round.prompt}</p>
            </div>

            <div className="space-y-3">
              {round.choices.map((choice) => {
                const isSelected = selectedChoice?.id === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={!!selectedChoice}
                    onClick={() => choose(choice)}
                    className={`w-full rounded-xl border p-4 text-left transition ${isSelected ? 'border-[#C5A059] bg-[#C5A059]/10' : 'border-[#2A2A2E] bg-[#161618] hover:border-[#C5A059]/45 hover:bg-[#1A1A1D]'} disabled:cursor-default`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-[#C5A059] bg-[#C5A059] text-[#0A0A0B]' : 'border-[#47474D]'}`}>{isSelected && <CheckCircle2 size={13} />}</div>
                      <div>
                        <strong className="text-sm text-[#E5E1D8]">{choice.label}</strong>
                        {isSelected && <p className="mt-2 text-xs leading-6 text-[#AAA49B]">{choice.explanation}</p>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedChoice && (
              <button type="button" onClick={continueRound} className="w-full rounded-xl bg-[#C5A059] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#0A0A0B] hover:bg-[#D4B475]">
                {roundIndex >= rounds.length - 1 ? 'Encerrar audiência' : 'Prosseguir na audiência'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5 p-5 sm:p-6">
            <div className={`rounded-xl border p-5 ${runningImpact >= 4 ? 'border-[#34D399]/30 bg-[#34D399]/[0.06]' : runningImpact <= -3 ? 'border-[#F87171]/30 bg-[#F87171]/[0.06]' : 'border-[#C5A059]/25 bg-[#C5A059]/[0.05]'}`}>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#C5A059]"><Gavel size={15} /> Audiência encerrada</div>
              <h3 className="mt-2 font-serif text-xl font-black text-[#F0ECE3]">O processo segue para decisão</h3>
              <p className="mt-2 text-sm leading-7 text-[#AAA49B]">A qualidade da sua atuação oral será considerada junto com tese, provas, investigação e prazo.</p>
            </div>

            {runningImpact <= -3 && (
              <div className="flex items-start gap-2 rounded-xl border border-[#F87171]/25 bg-[#F87171]/[0.05] p-4 text-xs leading-relaxed text-[#F1A6A6]"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> Algumas decisões tomadas em audiência criaram risco adicional para a tese. Isso não significa derrota automática, mas terá peso na sentença.</div>
            )}

            <button type="button" onClick={finish} className="w-full rounded-xl bg-[#C5A059] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#0A0A0B] hover:bg-[#D4B475]">Receber decisão judicial</button>
          </div>
        )}
      </div>
    </div>
  );
};
