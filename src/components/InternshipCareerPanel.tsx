import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Coins,
  Scale,
  ShieldCheck,
  Star,
  Target,
} from 'lucide-react';
import type { PlayerProfile } from '../types/game';
import { CAREER_TIERS } from '../data/careers';
import {
  getInternPromotionStatus,
  getOabPreparationStatus,
  getTasksForTier,
  normalizeOfficePerformance,
  type OfficeStageTask,
} from '../lib/internCareerEngine';
import { sound } from '../utils/sound';
import { InternOfficeTaskModal } from './InternOfficeTaskModal';
import { NpcGuidanceDialog, type NpcGuidanceStep } from './NpcGuidanceDialog';

interface InternshipCareerPanelProps {
  player: PlayerProfile;
  onCompleteTask: (taskId: string) => void;
}

const METRICS = [
  { key: 'technique', label: 'Técnica', icon: Scale },
  { key: 'diligence', label: 'Diligência', icon: ClipboardCheck },
  { key: 'ethics', label: 'Ética', icon: ShieldCheck },
  { key: 'deadlineManagement', label: 'Prazos', icon: Clock3 },
  { key: 'supervisorTrust', label: 'Confiança', icon: Star },
] as const;

const TASK_GUIDANCE_PREFIX = 'rota_intern_tasks_guidance_v1:';

function guidanceOwner(player: PlayerProfile) {
  if (player.cloudCareerId) return `career-${player.cloudCareerId}`;
  const normalized = (player.name || 'personagem')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'personagem';
}

function guidanceKey(player: PlayerProfile) {
  return `${TASK_GUIDANCE_PREFIX}${guidanceOwner(player)}:${player.careerTier}`;
}

function buildMarianaTaskGuidance(isSenior: boolean): NpcGuidanceStep[] {
  if (isSenior) {
    return [
      {
        eyebrow: 'Novas responsabilidades',
        text: 'Agora que você é Estagiário Sênior, o Dr. Roberto liberou atividades com mais autonomia. Elas continuam supervisionadas, mas já exigem análise de prova, preparação de audiência e raciocínio jurídico mais completo.',
      },
      {
        eyebrow: 'Não é tarefa automática',
        text: 'Quando você clicar em uma responsabilidade, o trabalho vai abrir de verdade. Você terá que analisar a situação e tomar decisões. Só depois de concluir corretamente a atividade ela será registrada na sua avaliação.',
      },
      {
        eyebrow: 'Reta final do estágio',
        text: 'Essas atividades também ajudam o escritório a medir sua preparação para o Exame da Ordem. Técnica, confiança e responsabilidade agora pesam tanto quanto a quantidade de casos concluídos.',
      },
    ];
  }

  return [
    {
      eyebrow: 'Uma nova rotina no escritório',
      text: 'Antes de o Dr. Roberto aumentar sua autonomia nos casos, ele quer observar como você trabalha nas tarefas do dia a dia. Por isso organizei uma rotina supervisionada aqui no escritório.',
    },
    {
      eyebrow: 'Você precisa executar a atividade',
      text: 'Não basta apertar um botão. Cada tarefa abre uma situação prática: conferir um risco de prazo, selecionar uma pesquisa útil, organizar documentos ou preparar uma minuta. Você precisa tomar as decisões corretas para concluir.',
    },
    {
      eyebrow: 'Sua avaliação muda com o trabalho',
      text: 'Quando você entrega uma atividade corretamente, o Dr. Roberto registra evolução em Técnica, Diligência, Prazos ou Confiança. Essas avaliações fazem parte dos requisitos para a promoção a Estagiário Sênior.',
    },
  ];
}

export const InternshipCareerPanel: React.FC<InternshipCareerPanelProps> = ({ player, onCompleteTask }) => {
  const [selectedTask, setSelectedTask] = useState<OfficeStageTask | null>(null);
  const [isTaskGuidanceOpen, setIsTaskGuidanceOpen] = useState(false);

  const isInternStage = player.careerTier === 'ESTAGIARIO' || player.careerTier === 'ESTAGIARIO_SENIOR';
  const isSenior = player.careerTier === 'ESTAGIARIO_SENIOR';
  const taskGuidance = useMemo(() => buildMarianaTaskGuidance(isSenior), [isSenior]);

  useEffect(() => {
    if (!isInternStage) return;
    try {
      const key = guidanceKey(player);
      if (localStorage.getItem(key) !== '1') {
        const timer = window.setTimeout(() => setIsTaskGuidanceOpen(true), 350);
        return () => window.clearTimeout(timer);
      }
    } catch {
      const timer = window.setTimeout(() => setIsTaskGuidanceOpen(true), 350);
      return () => window.clearTimeout(timer);
    }
  }, [isInternStage, player.careerTier, player.cloudCareerId, player.name]);

  if (!isInternStage) return null;

  const performance = normalizeOfficePerformance(player.officePerformance);
  const tasks = getTasksForTier(player.careerTier);
  const internPromotion = getInternPromotionStatus({
    casesSolved: player.casesSolved,
    xp: player.xp,
    performance,
    discipline: player.officeDiscipline,
  });
  const oabPreparation = getOabPreparationStatus({
    casesSolved: player.casesSolved,
    performance,
    discipline: player.officeDiscipline,
  });
  const currentTier = CAREER_TIERS[player.careerTier];
  const progress = isSenior ? oabPreparation : internPromotion;

  const handleGuidanceComplete = () => {
    try {
      localStorage.setItem(guidanceKey(player), '1');
    } catch {
      // A apresentação continua funcional mesmo sem persistência local.
    }
    setIsTaskGuidanceOpen(false);
  };

  return (
    <>
      {isTaskGuidanceOpen && (
        <NpcGuidanceDialog
          isOpen
          npcName="Mariana Duarte"
          npcRole="Secretária do Escritório"
          portraitSrc="/personagens/mariana-duarte.png"
          portraitAlt="Mariana Duarte, secretária do escritório Ramos & Associados"
          contextLabel={isSenior ? 'Rotina de Estagiário Sênior' : 'Rotina supervisionada do estágio'}
          dialogues={taskGuidance}
          finalActionLabel="Conhecer minhas tarefas"
          onComplete={handleGuidanceComplete}
        />
      )}

      <InternOfficeTaskModal
        isOpen={!!selectedTask}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onComplete={onCompleteTask}
      />

      <section className="mb-6 overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#111113] shadow-xl">
        <div className="border-b border-[#2A2A2E] bg-gradient-to-r from-[#171513] to-[#111113] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#C5A059]/35 bg-[#C5A059]/10 text-[#C5A059]">
                <Award size={23} />
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C5A059]">Ramos & Associados • Avaliação profissional</div>
                <h3 className="mt-1 font-serif text-lg font-black text-[#F1EFE9] sm:text-xl">Minha Avaliação no Escritório</h3>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#A9A49A]">
                  {isSenior
                    ? 'Você já recebe mais autonomia. O Dr. Roberto acompanha agora sua consistência técnica, responsabilidade e preparação para deixar o estágio.'
                    : 'Sua promoção não depende apenas de vencer casos. O escritório acompanha técnica, diligência, prazos, ética e a confiança conquistada no trabalho diário.'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#C5A059]/20 bg-[#0B0B0D] px-4 py-3 text-right">
              <span className="block text-[9px] uppercase tracking-wider text-[#77736B]">Cargo atual</span>
              <strong className="block text-sm text-[#E9D6A4]">{currentTier.title}</strong>
              {currentTier.salaryBaseMonthly > 0 && (
                <span className="mt-1 block font-mono text-[10px] text-[#8A9C90]">
                  Base: R$ {currentTier.salaryBaseMonthly.toLocaleString('pt-BR')}/mês
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {METRICS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="rounded-xl border border-[#26262B] bg-[#0B0B0D] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#76767D]">{label}</span>
                  <Icon size={14} className="text-[#C5A059]" />
                </div>
                <strong className="mt-1.5 block font-mono text-lg text-[#E7E3DA]">{performance[key]}</strong>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1B1B1F]">
                  <div className="h-full rounded-full bg-[#C5A059]" style={{ width: `${performance[key]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-[#2A2A2E] bg-[#0B0B0D] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#C5A059]">
                    {isSenior ? 'Preparação para a OAB' : 'Promoção para Estagiário Sênior'}
                  </span>
                  <h4 className="mt-1 text-sm font-bold text-[#E4E1DA]">
                    {progress.progressPercent}% dos requisitos profissionais cumpridos
                  </h4>
                </div>
                <Target size={19} className="text-[#C5A059]" />
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#1C1C20]">
                <div className="h-full rounded-full bg-[#C5A059] transition-all" style={{ width: `${progress.progressPercent}%` }} />
              </div>

              <div className="mt-4 space-y-2">
                {progress.requirements.map((requirement) => (
                  <div key={requirement.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#242429] bg-[#111114] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {requirement.met ? <CheckCircle2 size={14} className="shrink-0 text-[#34D399]" /> : <Clock3 size={14} className="shrink-0 text-[#8A8A91]" />}
                      <span className="truncate text-[11px] text-[#BCB9B1]">{requirement.label}</span>
                    </div>
                    <strong className={`shrink-0 font-mono text-[10px] ${requirement.met ? 'text-[#7DE0B7]' : 'text-[#8A8A91]'}`}>
                      {requirement.current}
                    </strong>
                  </div>
                ))}
              </div>

              {isSenior && (
                <div className={`mt-4 rounded-lg border p-3 text-[11px] leading-relaxed ${oabPreparation.ready ? 'border-[#34D399]/30 bg-[#34D399]/[0.06] text-[#A9E4CB]' : 'border-[#C5A059]/25 bg-[#C5A059]/[0.05] text-[#BEB394]'}`}>
                  {oabPreparation.ready
                    ? 'Dr. Roberto considera sua preparação interna adequada. O próximo marco é a aprovação no Exame da Ordem do jogo.'
                    : 'O exame pode aparecer como marco da carreira, mas o escritório ainda recomenda fortalecer sua preparação prática antes de encará-lo.'}
                </div>
              )}
            </div>

            {performance.evaluations.length > 0 && (
              <div className="rounded-xl border border-[#2A2A2E] bg-[#0B0B0D] p-4">
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness size={15} className="text-[#C5A059]" />
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#A9A49A]">Última avaliação registrada</span>
                </div>
                <strong className="mt-2 block text-xs text-[#E1DED6]">{performance.evaluations[0].title}</strong>
                <span className="mt-1 block font-mono text-[10px] text-[#74747B]">{performance.evaluations[0].date}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#2A2A2E] bg-[#0B0B0D] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#C5A059]">Rotina supervisionada</span>
                <h4 className="mt-1 text-sm font-bold text-[#E4E1DA]">
                  {isSenior ? 'Responsabilidades de Estagiário Sênior' : 'Tarefas próprias do estágio'}
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-[#8E8E95]">
                  Abra a atividade, analise a situação e tome as decisões corretas. A recompensa só é registrada depois da entrega ao Dr. Roberto.
                </p>
              </div>
              <BookOpenCheck size={19} className="shrink-0 text-[#C5A059]" />
            </div>

            <div className="mt-4 space-y-3">
              {tasks.map((task) => {
                const completed = performance.completedTaskIds.includes(task.id);
                const unavailable = !!player.activeCase;
                return (
                  <div key={task.id} className={`rounded-xl border p-3.5 ${completed ? 'border-[#34D399]/20 bg-[#34D399]/[0.04]' : 'border-[#27272C] bg-[#111114]'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {completed ? <CheckCircle2 size={15} className="shrink-0 text-[#34D399]" /> : <ClipboardCheck size={15} className="shrink-0 text-[#C5A059]" />}
                          <strong className="text-xs text-[#E1DED6]">{task.title}</strong>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-[#919198]">{task.description}</p>
                        <p className="mt-2 border-l-2 border-[#C5A059]/30 pl-2 text-[10px] italic leading-relaxed text-[#AFA58D]">“{task.supervisorNote}” — Dr. Roberto Ramos</p>
                        <div className="mt-2 flex flex-wrap gap-2 font-mono text-[9px] text-[#7F817F]">
                          <span>{task.challengeSteps.length} decisões práticas</span>
                          <span>•</span>
                          <span>+{task.xpReward} XP</span>
                          {task.moneyReward > 0 && <span className="flex items-center gap-1"><Coins size={10} /> +R$ {task.moneyReward}</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={completed || unavailable}
                        onClick={() => {
                          sound.playPaper();
                          setSelectedTask(task);
                        }}
                        className="shrink-0 rounded-lg border border-[#C5A059]/35 bg-[#C5A059]/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#D9C184] transition hover:bg-[#C5A059]/20 disabled:cursor-not-allowed disabled:border-[#2A2A2E] disabled:bg-[#17171A] disabled:text-[#66666D]"
                      >
                        {completed ? 'Concluída' : unavailable ? 'Finalize o caso atual' : 'Abrir atividade'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
