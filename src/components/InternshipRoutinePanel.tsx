import React from 'react';
import { CalendarClock, CheckCircle2, Clock3, Coffee, DoorOpen, MessageSquareText, UserRoundCheck } from 'lucide-react';
import type { PlayerProfile } from '../types/game';
import { getDailyOfficeEvent, getOfficeEventChoices, getPeriodicReview, getTodayAttendance, getWorkSchedule, minuteLabel, readInternshipRoutine, type OfficeEventChoiceId } from '../lib/internshipRoutine';

interface Props {
  player: PlayerProfile;
  onRegisterArrival: () => void;
  onRegisterDeparture: () => void;
  onHandleOfficeEvent: (choiceId: OfficeEventChoiceId) => void;
  onOpenReview: () => void;
  onRequestAbsenceJustification: () => void;
}

export const InternshipRoutinePanel: React.FC<Props> = ({ player, onRegisterArrival, onRegisterDeparture, onHandleOfficeEvent, onOpenReview, onRequestAbsenceJustification }) => {
  const schedule = getWorkSchedule(player);
  const attendance = getTodayAttendance(player);
  const state = readInternshipRoutine(player);
  const event = getDailyOfficeEvent(player);
  const review = getPeriodicReview(player);
  const recent = state.attendance.filter((item) => item.status !== 'OFF_DAY').slice(-5).reverse();

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#111113] shadow-xl">
      <div className="border-b border-[#2A2A2E] bg-gradient-to-r from-[#171513] to-[#111113] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-[.18em] text-[#C5A059]">Rotina de estágio • Ramos & Associados</span>
            <h3 className="mt-1 font-serif text-xl font-black text-[#F1EFE9]">Expediente e vida no escritório</h3>
            <p className="mt-1 text-xs text-[#969188]">{schedule.weekdayLabel} • expediente {schedule.startLabel}–{schedule.endLabel} • tolerância de 10 min</p>
          </div>
          <div className="rounded-xl border border-[#2A2A2E] bg-[#09090B] px-4 py-3 text-right">
            <span className="block text-[9px] uppercase tracking-wider text-[#77736B]">Horário atual</span>
            <strong className="font-mono text-lg text-[#E9D6A4]">{minuteLabel(player.gameCurrentMinutes)}</strong>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[.9fr_1.1fr]">
        <div className="space-y-3">
          <div className="rounded-xl border border-[#29292E] bg-[#0B0B0D] p-4">
            <div className="flex items-center gap-2"><CalendarClock size={16} className="text-[#C5A059]" /><strong className="text-xs text-[#E4E1DA]">Ponto de hoje</strong></div>
            {!schedule.workday ? (
              <p className="mt-3 text-[11px] leading-relaxed text-[#8F8F96]">Hoje não há expediente regular. O escritório pode ser acessado, mas não há obrigação de presença.</p>
            ) : attendance ? (
              <div className="mt-3">
                <strong className={`text-sm ${attendance.status === 'PRESENT' ? 'text-[#6DD6AA]' : attendance.status === 'LATE' ? 'text-[#D8B66B]' : 'text-[#D57A72]'}`}>
                  {attendance.status === 'PRESENT' ? 'Presença regular' : attendance.status === 'LATE' ? `Atraso de ${attendance.lateMinutes} min` : 'Falta registrada'}
                </strong>
                <p className="mt-1 font-mono text-[10px] text-[#77777F]">Entrada {minuteLabel(attendance.arrivalMinute)} • Saída {minuteLabel(attendance.departureMinute)}</p>
                {attendance.status === 'ABSENT' && (
                  <button type="button" onClick={onRequestAbsenceJustification} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#6C83A7]/35 bg-[#6C83A7]/10 px-3 py-2 text-[10px] font-bold text-[#AFC0DA] hover:bg-[#6C83A7]/20">
                    <MessageSquareText size={14} /> Solicitar justificativa
                  </button>
                )}
                {!attendance.departureMinute && (
                  <button type="button" onClick={onRegisterDeparture} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#34343A] px-3 py-2 text-[10px] font-bold text-[#BDB9B0] hover:bg-[#19191D]">
                    <DoorOpen size={14} /> Registrar saída
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-[11px] leading-relaxed text-[#929298]">Sua presença ainda não foi registrada. Chegar depois de 08:10 conta como atraso; após 12:00, o dia é tratado como falta.</p>
                <button type="button" onClick={onRegisterArrival} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#C5A059]/35 bg-[#C5A059]/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#D9C184] hover:bg-[#C5A059]/20">
                  <UserRoundCheck size={14} /> Registrar entrada
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#29292E] bg-[#0B0B0D] p-4">
            <strong className="text-[9px] uppercase tracking-[.14em] text-[#88838A]">Últimos dias</strong>
            <div className="mt-3 space-y-2">
              {recent.length === 0 ? <span className="text-[10px] text-[#68686F]">Nenhum expediente registrado ainda.</span> : recent.map((item) => (
                <div key={item.date} className="flex items-center justify-between rounded-lg bg-[#111114] px-3 py-2">
                  <span className="font-mono text-[10px] text-[#99959A]">{item.date}</span>
                  <span className="text-[9px] font-black uppercase text-[#AAA59B]">{item.status === 'PRESENT' ? 'Presente' : item.status === 'LATE' ? `Atraso ${item.lateMinutes}m` : 'Falta'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {event && (
            <article className="rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/[0.055] p-4">
              <div className="flex items-center gap-2 text-[#CDB06F]"><Coffee size={16} /><span className="text-[9px] font-black uppercase tracking-[.15em]">Acontecimento no escritório</span></div>
              <h4 className="mt-2 text-sm font-bold text-[#E6E1D7]">{event.title}</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-[#A8A39A]">{event.text}</p>
              <div className="mt-3 grid gap-2">
                {getOfficeEventChoices(event.kind).map((choice) => (
                  <button key={choice.id} type="button" onClick={() => onHandleOfficeEvent(choice.id)} className="rounded-lg border border-[#C5A059]/25 bg-[#0D0D0F] px-3 py-2.5 text-left transition hover:bg-[#C5A059]/10">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-[#D7BC7A]">{choice.label} • {choice.minutes} min</span>
                    <span className="mt-1 block text-[10px] leading-relaxed text-[#88838A]">{choice.description}</span>
                  </button>
                ))}
              </div>
            </article>
          )}

          {review && (
            <article className="rounded-xl border border-[#6C83A7]/30 bg-[#6C83A7]/[0.06] p-4">
              <div className="flex items-center gap-2 text-[#91A8CB]"><MessageSquareText size={16} /><span className="text-[9px] font-black uppercase tracking-[.15em]">Dr. Roberto quer conversar</span></div>
              <h4 className="mt-2 text-sm font-bold text-[#E1E5EC]">{review.title}</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-[#A2AAB7]">Há uma avaliação periódica disponível com base na sua frequência e no desempenho acumulado.</p>
              <button type="button" onClick={onOpenReview} className="mt-3 rounded-lg border border-[#7188AB]/30 bg-[#0D0D0F] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#A9BAD4]">Ir à reunião</button>
            </article>
          )}

          {!event && !review && (
            <div className="flex min-h-36 items-center gap-3 rounded-xl border border-[#29292E] bg-[#0B0B0D] p-5">
              <CheckCircle2 size={21} className="text-[#557565]" />
              <div><strong className="text-xs text-[#C7C4BD]">Rotina sob controle</strong><p className="mt-1 text-[10px] leading-relaxed text-[#77777F]">Continue acompanhando tarefas, casos e compromissos. Nem todo dia terá um acontecimento extraordinário.</p></div>
            </div>
          )}

          <div className="rounded-xl border border-[#29292E] bg-[#0B0B0D] p-4">
            <div className="flex items-center gap-2"><Clock3 size={15} className="text-[#C5A059]" /><strong className="text-xs text-[#E0DDD6]">Como sua rotina é avaliada</strong></div>
            <p className="mt-2 text-[10px] leading-relaxed text-[#898990]">Avaliação a cada cinco dias registrados. A nota utiliza a média de Técnica, Diligência, Ética, Prazos e Confiança. Nos últimos dez registros, são descontados dois pontos por atraso e seis por falta não justificada.</p>
            <div className="mt-3 rounded-lg border border-[#333338] bg-[#09090B] p-3 text-[10px] leading-5 text-[#CCC7BD]">
              <strong className="block text-[#D9C184]">Entenda sua avaliação</strong>
              <span>Média dos cinco indicadores: {Math.round((player.officePerformance.technique + player.officePerformance.diligence + player.officePerformance.ethics + player.officePerformance.deadlineManagement + player.officePerformance.supervisorTrust) / 5)} pontos.</span>
              <span className="mt-1 block">A nota final considera também atrasos e faltas do ciclo recente. As reuniões concluídas ficam registradas no histórico.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
