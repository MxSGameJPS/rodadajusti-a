import React from 'react';
import { AlertTriangle, BriefcaseBusiness, FileWarning, ShieldAlert, X } from 'lucide-react';
import type { SupervisorReview } from '../types/game';
import { sound } from '../utils/sound';

interface SupervisorReviewModalProps {
  isOpen: boolean;
  review: SupervisorReview | null;
  onClose: () => void;
}

const SEVERITY_LABEL: Record<SupervisorReview['severity'], string> = {
  ORIENTACAO: 'Orientação profissional',
  ADVERTENCIA: 'Advertência de desempenho',
  GRAVE: 'Ocorrência grave',
};

const SEVERITY_STYLES: Record<SupervisorReview['severity'], string> = {
  ORIENTACAO: 'border-[#C5A059]/35 bg-[#C5A059]/10 text-[#E8CA82]',
  ADVERTENCIA: 'border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FBC56B]',
  GRAVE: 'border-[#F87171]/45 bg-[#F87171]/10 text-[#FCA5A5]',
};

export function SupervisorReviewModal({ isOpen, review, onClose }: SupervisorReviewModalProps) {
  if (!isOpen || !review) return null;

  const Icon = review.severity === 'GRAVE' ? ShieldAlert : review.severity === 'ADVERTENCIA' ? FileWarning : BriefcaseBusiness;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#050607]/90 p-4 backdrop-blur-lg">
      <div className="my-6 w-full max-w-3xl overflow-hidden rounded-2xl border border-[#2B2B30] bg-[#101114] text-[#ECE8DE] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#292A30] bg-[#15161A] px-5 py-4 sm:px-6">
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.22em] text-[#9D8350]">Ramos & Associados</span>
            <h2 className="mt-1 font-serif text-lg font-bold sm:text-xl">Dr. Roberto Ramos pediu para falar com você</h2>
          </div>
          <button
            type="button"
            onClick={() => { sound.playClick(); onClose(); }}
            className="rounded-lg border border-[#303138] bg-[#1A1B20] p-2 text-[#8D9098] hover:text-white"
            aria-label="Fechar"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-0 md:grid-cols-[250px_1fr]">
          <div className="relative min-h-[300px] overflow-hidden border-b border-[#292A30] bg-[radial-gradient(circle_at_50%_20%,rgba(197,160,89,.16),transparent_45%),linear-gradient(180deg,#17181C,#090A0C)] md:border-b-0 md:border-r">
            <img
              src="/personagens/dr-roberto-ramos.png"
              alt="Dr. Roberto Ramos"
              className="absolute inset-x-0 bottom-0 mx-auto max-h-[95%] w-auto max-w-[95%] object-contain object-bottom drop-shadow-[0_18px_30px_rgba(0,0,0,.65)]"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#090A0C] to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-[#C5A059]">Supervisor responsável</span>
              <strong className="mt-1 block font-serif text-lg">Dr. Roberto Ramos</strong>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] ${SEVERITY_STYLES[review.severity]}`}>
              <Icon size={15} />
              {SEVERITY_LABEL[review.severity]}
            </div>

            <div>
              <h3 className="font-serif text-xl font-bold text-white">{review.title}</h3>
              <p className="mt-1 text-xs text-[#8E929C]">Caso: {review.caseTitle}</p>
            </div>

            <div className="rounded-xl border border-[#2A2B31] bg-[#0A0B0D] p-4">
              <p className="font-serif text-sm italic leading-7 text-[#D8D5CE]">“{review.message}”</p>
            </div>

            {review.warningIssued && !review.contractTerminated && (
              <div className="flex items-start gap-3 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/[0.08] p-4 text-[#F4C66F]">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-xs uppercase tracking-[0.12em]">Advertência formal {review.warningNumber}/2</strong>
                  <p className="mt-1 text-xs leading-relaxed text-[#D8B873]">Uma segunda advertência formal por falha profissional grave encerra seu vínculo com o escritório.</p>
                </div>
              </div>
            )}

            {review.contractTerminated && (
              <div className="flex items-start gap-3 rounded-xl border border-[#F87171]/45 bg-[#F87171]/[0.09] p-4 text-[#FCA5A5]">
                <ShieldAlert size={19} className="mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-xs uppercase tracking-[0.12em]">Contrato encerrado</strong>
                  <p className="mt-1 text-xs leading-relaxed text-[#E7A1A1]">Esta foi sua segunda advertência formal. O vínculo com Ramos & Associados foi encerrado e o fato ficou registrado em seu histórico profissional.</p>
                </div>
              </div>
            )}

            {!review.warningIssued && (
              <div className="rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/[0.06] p-3.5 text-xs leading-relaxed text-[#CFC4AA]">
                Esta conversa é uma orientação de desempenho. Não houve advertência formal, mas a ocorrência ficará registrada para acompanhar sua evolução profissional.
              </div>
            )}

            <button
              type="button"
              onClick={() => { sound.playClick(); onClose(); }}
              className="w-full rounded-xl bg-[#C5A059] px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#0A0A0B] hover:bg-[#D5B66E]"
            >
              Entendi a avaliação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
