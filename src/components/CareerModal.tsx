import React from 'react';
import { PlayerProfile, CareerTierId } from '../types/game';
import { CAREER_TIERS } from '../data/careers';
import {
  ACADEMIC_TRACKS,
  CAREER_LEVEL_SUMMARY,
  PUBLIC_EXAM_RULES,
  SPECIAL_CAREER_RULES,
  isPublicExamEligible,
  isSpecialCareerEligible,
} from '../lib/progressionRules';
import { getInternPromotionStatus, normalizeOfficePerformance } from '../lib/internCareerEngine';
import { usePlayerDisplayName } from '../lib/playerTreatment';
import { X, Award, CheckCircle2, Lock, Scale, Landmark, GraduationCap, Crown, ClipboardCheck } from 'lucide-react';
import { sound } from '../utils/sound';

interface CareerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onSelectCareerPath?: (tierId: CareerTierId) => void;
}

export const CareerModal: React.FC<CareerModalProps> = ({ isOpen, onClose, player }) => {
  const displayName = usePlayerDisplayName(player);
  if (!isOpen) return null;

  const tiers = Object.values(CAREER_TIERS);
  const currentTier = CAREER_TIERS[player.careerTier];
  const extendedPlayer = player as PlayerProfile & { masterLevel?: number; doctorateLevel?: number };
  const masterLevel = Number(extendedPlayer.masterLevel || 0);
  const doctorateLevel = Number(extendedPlayer.doctorateLevel || 0);
  const performance = normalizeOfficePerformance(player.officePerformance);
  const internPromotion = getInternPromotionStatus({
    casesSolved: player.casesSolved,
    xp: player.xp,
    performance,
    discipline: player.officeDiscipline,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-6 flex flex-col max-h-[92vh]">
        <div className="bg-[#111113] px-6 py-4 border-b border-[#2A2A2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1A1A1D] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059]"><Award size={20}/></div>
            <div><h2 className="text-lg sm:text-xl font-bold font-serif">Plano de Carreira Jurídica Nacional</h2><p className="text-xs text-[#888888]">Progressão profissional e acadêmica de <strong className="text-[#C5A059]">{displayName}</strong></p></div>
          </div>
          <button onClick={() => { sound.playClick(); onClose(); }} className="p-2 rounded-lg bg-[#1A1A1D] hover:bg-[#222226] text-[#888888] border border-[#2A2A2E]"><X size={18}/></button>
        </div>

        <div className="p-4 bg-[#0D0D0E] border-b border-[#222226] grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
          <StatusCard label="Cargo Atual" value={currentTier.title}/>
          <StatusCard label="Reputação" value={`${player.reputation}%`}/>
          <StatusCard label="Casos" value={`${player.casesSolved}`}/>
          <StatusCard label="Mestrado" value={`${masterLevel}/5`}/>
          <StatusCard label="Doutorado" value={`${doctorateLevel}/5`}/>
        </div>

        <div className="p-6 overflow-y-auto space-y-7 flex-1 bg-[#0A0A0B]">
          <section className="space-y-3">
            <SectionTitle icon={<Scale size={14}/>} title="Estágio & Advocacia" color="text-[#C5A059]"/>
            <div className="p-4 rounded-xl border border-[#2A2A2E] bg-[#111113] text-xs text-[#AAAAAA]">
              <strong className="text-[#E0E0E0]">Estrutura:</strong> {CAREER_LEVEL_SUMMARY.internship.levels.length} níveis de estágio e {CAREER_LEVEL_SUMMARY.advocacy.levels.length} níveis principais de advocacia.
              <div className="mt-2 flex flex-wrap gap-2">{[...CAREER_LEVEL_SUMMARY.internship.levels, ...CAREER_LEVEL_SUMMARY.advocacy.levels].map((label) => <span key={label} className="px-2 py-1 rounded border border-[#2A2A2E] bg-[#161618]">{label}</span>)}</div>
            </div>

            {player.careerTier === 'ESTAGIARIO' && (
              <div className="rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/[0.06] p-4">
                <div className="flex items-start gap-3">
                  <ClipboardCheck size={18} className="mt-0.5 shrink-0 text-[#C5A059]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#C5A059]">Avaliação para Estagiário Sênior</span>
                        <h4 className="mt-1 text-sm font-bold text-[#E6E1D8]">{internPromotion.progressPercent}% dos requisitos cumpridos</h4>
                      </div>
                      <span className="rounded-md border border-[#C5A059]/25 bg-[#0D0D0F] px-2 py-1 font-mono text-[10px] text-[#D5BE82]">Confiança {performance.supervisorTrust}/100</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-[#A9A294]">A promoção deixou de ser automática por quantidade de casos. O Dr. Roberto considera prática, tarefas supervisionadas, diligência, confiança e situação disciplinar.</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {internPromotion.requirements.map((requirement) => (
                        <div key={requirement.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#29282A] bg-[#0D0D0F] px-3 py-2">
                          <span className="flex min-w-0 items-center gap-2 text-[10px] text-[#B8B3A9]">
                            {requirement.met ? <CheckCircle2 size={13} className="shrink-0 text-[#34D399]" /> : <Lock size={12} className="shrink-0 text-[#77777D]" />}
                            <span className="truncate">{requirement.label}</span>
                          </span>
                          <strong className={`shrink-0 font-mono text-[9px] ${requirement.met ? 'text-[#79D9B2]' : 'text-[#85858B]'}`}>{requirement.current}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {tiers.filter(t => t.category === 'advocacia' || t.category === 'gestao').map((tier) => {
                const isCurrent = player.careerTier === tier.id;
                const isSeniorTier = tier.id === 'ESTAGIARIO_SENIOR';
                const alreadyPastIntern = player.careerTier !== 'ESTAGIARIO';
                const unlocked = isSeniorTier
                  ? alreadyPastIntern || internPromotion.eligible
                  : player.casesSolved >= tier.minCasesSolved && player.xp >= tier.minXp && player.reputation >= tier.minReputation;
                const requirements = isSeniorTier
                  ? '2 casos • 350 XP • 2 tarefas • diligência 58 • confiança 58 • vínculo ativo'
                  : `${tier.minCasesSolved} casos • ${tier.minXp} XP • ${tier.minReputation}% reputação`;
                return <CareerTierCard key={tier.id} title={tier.title} description={tier.description} current={isCurrent} unlocked={unlocked} salary={tier.salaryBaseMonthly} requirements={requirements} perks={tier.perks}/>;
              })}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle icon={<GraduationCap size={14}/>} title="Progressão Acadêmica" color="text-[#60A5FA]"/>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.values(ACADEMIC_TRACKS).map((track) => {
                const level = track.id === 'MESTRADO' ? masterLevel : doctorateLevel;
                return <div key={track.id} className="p-4 rounded-xl border border-[#2A2A2E] bg-[#111113]">
                  <div className="flex items-center justify-between gap-3"><div><h4 className="font-bold text-[#E0E0E0]">{track.label}</h4><p className="text-xs text-[#AAAAAA] mt-1">{track.description}</p></div><span className="font-mono font-bold text-[#60A5FA]">{level}/5</span></div>
                  <div className="grid grid-cols-5 gap-2 mt-4">{[1,2,3,4,5].map(n => <div key={n} className={`text-center py-2 rounded-lg border text-xs font-bold ${level >= n ? 'border-[#60A5FA]/50 bg-[#60A5FA]/10 text-[#60A5FA]' : 'border-[#2A2A2E] bg-[#161618] text-[#666]'}`}>{n}</div>)}</div>
                  <p className="text-[11px] text-[#888] mt-3">Cada prova: {track.questionsPerExam} questões • progressão sequencial.</p>
                </div>;
              })}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle icon={<Landmark size={14}/>} title="Concursos de Magistratura" color="text-[#F87171]"/>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.values(PUBLIC_EXAM_RULES).map((rule) => {
                const eligible = isPublicExamEligible(doctorateLevel);
                return <div key={rule.examType} className={`p-4 rounded-xl border ${eligible ? 'border-[#34D399]/40 bg-[#34D399]/5' : 'border-[#2A2A2E] bg-[#111113]'}`}>
                  <div className="flex items-start gap-3">{eligible ? <CheckCircle2 size={18} className="text-[#34D399]"/> : <Lock size={18} className="text-[#666]"/>}<div><h4 className="font-bold">{rule.label}</h4><p className="text-xs text-[#AAA] mt-1">{rule.questions} questões • requisito: {rule.requirementText}.</p><p className={`text-[11px] mt-2 font-semibold ${eligible ? 'text-[#34D399]' : 'text-[#888]'}`}>{eligible ? 'Elegível para prestar quando houver prova publicada.' : `Doutorado atual: ${doctorateLevel}/5`}</p></div></div>
                </div>;
              })}
            </div>

            <div className="space-y-3 mt-4">
              {tiers.filter(t => t.category === 'magistratura').map((tier) => <CareerTierCard key={tier.id} title={tier.title} description={tier.description} current={player.careerTier === tier.id} unlocked={player.careerTier === tier.id} salary={tier.salaryBaseMonthly} requirements={tier.id === 'DESEMBARGADOR' ? 'Via concurso + Doutorado nível 4 ou 5' : tier.id === 'MINISTRO_STF' ? 'Cargo especial por convite' : 'Via progressão da magistratura'} perks={tier.perks}/>) }
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle icon={<Crown size={14}/>} title="Carreiras Especiais por Convite • módulos futuros" color="text-[#FBBF24]"/>
            <div className="grid md:grid-cols-2 gap-4">
              {SPECIAL_CAREER_RULES.map((rule) => {
                const eligible = isSpecialCareerEligible(rule, masterLevel, player.reputation);
                return <div key={rule.id} className={`p-4 rounded-xl border ${eligible ? 'border-[#FBBF24]/45 bg-[#FBBF24]/5' : 'border-[#2A2A2E] bg-[#111113]'}`}>
                  <div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-[#E0E0E0]">{rule.label}</h4><p className="text-xs text-[#AAAAAA] mt-1">Mestrado mínimo {rule.minMasterLevel}/5 • reputação mínima {rule.minReputation}% • mandato máximo {rule.termYears} anos.</p></div><span className={`text-[10px] px-2 py-1 rounded border ${eligible ? 'text-[#FBBF24] border-[#FBBF24]/40' : 'text-[#777] border-[#333]'}`}>{eligible ? 'Elegível ao convite' : 'Bloqueado'}</span></div>
                  <p className="text-[11px] text-[#888] mt-3">{rule.endBehavior}</p>
                  {rule.nextPossibilities.length > 0 && <p className="text-[11px] text-[#C5A059] mt-2">Possibilidades futuras: {rule.nextPossibilities.join(', ')}</p>}
                </div>;
              })}
            </div>
          </section>
        </div>

        <div className="p-4 bg-[#111113] border-t border-[#2A2A2E] flex justify-end"><button onClick={() => { sound.playClick(); onClose(); }} className="px-5 py-2 rounded-xl bg-[#1A1A1D] hover:bg-[#222226] border border-[#2A2A2E] text-sm font-semibold">Fechar</button></div>
      </div>
    </div>
  );
};

function StatusCard({ label, value }: { label: string; value: string }) {
  return <div className="p-2.5 bg-[#161618] rounded-xl border border-[#2A2A2E]"><span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">{label}</span><span className="font-bold text-[#C5A059] text-sm">{value}</span></div>;
}

function SectionTitle({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) {
  return <h3 className={`text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 ${color}`}>{icon}<span>{title}</span></h3>;
}

function CareerTierCard({ title, description, current, unlocked, salary, requirements, perks }: { title: string; description: string; current: boolean; unlocked: boolean; salary: number; requirements: string; perks: string[] }) {
  return <div className={`p-4 rounded-xl border ${current ? 'bg-[#1A1A1D] border-[#C5A059]' : unlocked ? 'bg-[#161618] border-[#2A2A2E]' : 'bg-[#111113] border-[#222226] opacity-80'}`}>
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div className="flex items-start gap-3"><div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${current ? 'bg-[#C5A059] text-[#0A0A0B]' : unlocked ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30' : 'bg-[#1A1A1D] text-[#666] border border-[#2A2A2E]'}`}>{current ? <Award size={18}/> : unlocked ? <CheckCircle2 size={16}/> : <Lock size={15}/>}</div><div><h4 className="font-bold text-[#E0E0E0]">{title}{current && <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-[#C5A059] text-[#0A0A0B]">ATUAL</span>}</h4><p className="text-xs text-[#AAAAAA] mt-1">{description}</p></div></div>
      <div className="text-xs sm:text-right shrink-0"><div className="font-mono text-[#34D399] font-bold">{salary > 0 ? `R$ ${salary.toLocaleString('pt-BR')}/mês` : 'Remuneração variável'}</div><div className="text-[11px] text-[#888] mt-1">{requirements}</div></div>
    </div>
    <div className="mt-3 pt-2.5 border-t border-[#2A2A2E] flex flex-wrap gap-1.5">{perks.map((perk, idx) => <span key={idx} className="text-[11px] bg-[#111113] text-[#CCC] px-2 py-0.5 rounded border border-[#222226]">✓ {perk}</span>)}</div>
  </div>;
}
