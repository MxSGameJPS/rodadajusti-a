import React, { useState } from 'react';
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
import { getEarlyCareerSnapshot } from '../lib/earlyCareerEngine';
import { InternOfficeTaskModal } from './InternOfficeTaskModal';
import { NpcGuidanceDialog, type NpcGuidanceStep } from './NpcGuidanceDialog';
import { InternshipRoutinePanel } from './InternshipRoutinePanel';
import { getDailyTaskIds, type OfficeEventChoiceId } from '../lib/internshipRoutine';

interface InternshipCareerPanelProps {
  player: PlayerProfile;
  onCompleteTask: (taskId: string) => void;
  onRegisterArrival: () => void;
  onRegisterDeparture: () => void;
  onHandleOfficeEvent: (choiceId: OfficeEventChoiceId) => void;
  onOpenReview: () => void;
  onRequestAbsenceJustification: () => void;
}

const METRICS = [
  { key: 'technique', label: 'Técnica', icon: Scale },
  { key: 'diligence', label: 'Diligência', icon: ClipboardCheck },
  { key: 'ethics', label: 'Ética', icon: ShieldCheck },
  { key: 'deadlineManagement', label: 'Prazos', icon: Clock3 },
  { key: 'supervisorTrust', label: 'Confiança', icon: Star },
] as const;

function buildMarianaTaskGuidance(task: OfficeStageTask, isSenior: boolean): NpcGuidanceStep[] {
  return [
    {
      eyebrow: isSenior ? 'Responsabilidade de Estagiário Sênior' : 'Atividade supervisionada',
      text: `O Dr. Roberto separou esta atividade para você: ${task.title}. ${task.description}`,
    },
    {
      eyebrow: 'Como funciona',
      text: `Você vai enfrentar ${task.challengeSteps.length} decisões práticas. Leia a situação com atenção e escolha como agir. A atividade só será concluída quando as decisões estiverem corretas e você entregar o trabalho ao Dr. Roberto.`,
    },
    {
      eyebrow: 'Avaliação do escritório',
      text: isSenior
        ? 'Como Estagiário Sênior, o escritório espera mais autonomia e raciocínio jurídico. O resultado desta atividade entra na sua avaliação profissional e na preparação para a próxima etapa da carreira.'
        : 'O resultado desta atividade entra na sua avaliação profissional. Técnica, diligência, prazos e a confiança do Dr. Roberto ajudam a definir quando você estará pronto para ser promovido.',
    },
  ];
}

export const InternshipCareerPanel: React.FC<InternshipCareerPanelProps> = ({ player, onCompleteTask, onRegisterArrival, onRegisterDeparture, onHandleOfficeEvent, onOpenReview }) => {
  const [selectedTask, setSelectedTask] = useState<OfficeStageTask | null>(null);
  const [pendingTask, setPendingTask] = useState<OfficeStageTask | null>(null);
  const [isTaskGuidanceOpen, setIsTaskGuidanceOpen] = useState(false);
  const [showActOneDetails, setShowActOneDetails] = useState(false);

  const isInternStage = player.careerTier === 'ESTAGIARIO' || player.careerTier === 'ESTAGIARIO_SENIOR';
  const isSenior = player.careerTier === 'ESTAGIARIO_SENIOR';

  if (!isInternStage) return null;

  const performance = normalizeOfficePerformance(player.officePerformance);
  const tasks = getTasksForTier(player.careerTier);
  const dailyTaskIds = getDailyTaskIds(player, tasks.map((task) => task.id));
  const dailyTasks = tasks.filter((task) => dailyTaskIds.includes(task.id));
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
  const actOne = getEarlyCareerSnapshot(player);

  const openTask = (task: OfficeStageTask) => {
    sound.playPaper();
    setPendingTask(task);
    setIsTaskGuidanceOpen(true);
  };

  const handleGuidanceComplete = () => {
    const taskToOpen = pendingTask;
    setIsTaskGuidanceOpen(false);
    setPendingTask(null);
    if (taskToOpen) {
      window.setTimeout(() => setSelectedTask(taskToOpen), 120);
    }
  };

  return (
    <>
      {isTaskGuidanceOpen && pendingTask && (
        <NpcGuidanceDialog
          isOpen
          npcName="Mariana Duarte"
          npcRole="Secretária do Escritório"
          portraitSrc="/personagens/mariana-duarte.png"
          portraitAlt="Mariana Duarte, secretária do escritório Ramos & Associados"
          contextLabel={pendingTask.title}
          dialogues={buildMarianaTaskGuidance(pendingTask, isSenior)}
          finalActionLabel="Iniciar atividade"
          onComplete={handleGuidanceComplete}
        />
      )}

      <InternOfficeTaskModal
        isOpen={!!selectedTask}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onComplete={onCompleteTask}
      />

      <section className="mb-5 overflow-hidden rounded-2xl border border-[#C5A059]/30 bg-[#0D0D0F] shadow-xl">
        <div className="border-b border-[#2A2A2E] bg-gradient-to-r from-[#1A1712] via-[#111113] to-[#0D0D0F] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C5A059]">Ato 1 • Formação</span>
              <h3 className="mt-1 font-serif text-xl font-black text-[#F1EFE9] sm:text-2xl">{actOne.title}</h3>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[#AAA59B]">{actOne.objective}</p>
            </div>
            <div className="min-w-[210px] rounded-xl border border-[#C5A059]/20 bg-[#09090B] px-4 py-3">
              <span className="block text-[9px] uppercase tracking-wider text-[#77736B]">Perfil em formação</span>
              <strong className="mt-1 block font-serif text-sm text-[#E9D6A4]">{actOne.professionalIdentity}</strong>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1D1D21]">
                <div className="h-full rounded-full bg-[#C5A059]" style={{ width: `${actOne.progressPercent}%` }} />
              </div>
              <span className="mt-1.5 block text-right font-mono text-[9px] text-[#817B70]">{actOne.progressPercent}% do Ato 1</span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid gap-2 md:grid-cols-7">
            {actOne.milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className={`relative rounded-xl border p-3 ${milestone.current
                  ? 'border-[#C5A059]/55 bg-[#C5A059]/10'
                  : milestone.completed
                    ? 'border-[#34D399]/20 bg-[#34D399]/[0.035]'
                    : 'border-[#25252A] bg-[#111114]'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-mono text-[9px] ${milestone.current ? 'text-[#D8BC7B]' : 'text-[#66666D]'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {milestone.completed && <CheckCircle2 size={13} className="text-[#34D399]" />}
                </div>
                <strong className={`mt-2 block text-[10px] ${milestone.current ? 'text-[#E9D6A4]' : 'text-[#B6B2AA]'}`}>{milestone.title}</strong>
                <span className="mt-1 block text-[9px] leading-relaxed text-[#77777F]">{milestone.description}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowActOneDetails((value) => !value)}
              className="rounded-lg border border-[#C5A059]/25 bg-[#C5A059]/[0.06] px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#CDB06F] transition hover:bg-[#C5A059]/10"
            >
              {showActOneDetails ? 'Ocultar leitura do supervisor' : 'Ver leitura do supervisor'}
            </button>
          </div>

          {showActOneDetails && (actOne.strengths.length > 0 || actOne.risks.length > 0) && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#34D399]/15 bg-[#34D399]/[0.025] p-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#70CDA8]">Pontos que o escritório reconhece</span>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[#9FAEA7]">
                  {actOne.strengths.length ? actOne.strengths.join(' • ') : 'Seu perfil ainda está sendo formado pelas primeiras entregas.'}
                </p>
              </div>
              <div className="rounded-xl border border-[#D0A85D]/15 bg-[#D0A85D]/[0.025] p-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#D0B478]">Pontos de atenção</span>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[#AAA08B]">
                  {actOne.risks.length ? actOne.risks.join(' • ') : 'Nenhum risco relevante identificado neste momento.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <InternshipRoutinePanel
        player={player}
        onRegisterArrival={onRegisterArrival}
        onRegisterDeparture={onRegisterDeparture}
        onHandleOfficeEvent={onHandleOfficeEvent}
        onOpenReview={onOpenReview}
        onRequestAbsenceJustification={onRequestAbsenceJustification}
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
                  {isSenior ? 'Responsabilidades de hoje • Estagiário Sênior' : 'Tarefas de hoje entregues pela Mariana'}
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-[#8E8E95]">
                  Mariana organiza apenas as prioridades deste expediente. Analise cada atividade e entregue o resultado ao Dr. Roberto; novas prioridades surgem em outros dias.
                </p>
              </div>
              <BookOpenCheck size={19} className="shrink-0 text-[#C5A059]" />
            </div>

            <div className="mt-4 space-y-3">
              {dailyTasks.map((task) => {
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
                        onClick={() => openTask(task)}
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
