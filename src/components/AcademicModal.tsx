import React from 'react';
import { PlayerProfile, AcademicCourse } from '../types/game';
import { ACADEMIC_COURSES } from '../data/careers';
import { ACADEMIC_TRACKS } from '../lib/progressionRules';
import { X, GraduationCap, CheckCircle2, BookOpen, Lock, FileQuestion } from 'lucide-react';
import { sound } from '../utils/sound';
import { LEGAL_KNOWLEDGE_LABELS, normalizeLegalKnowledge } from '../lib/academicLife';
import { AcademicTeachingPanel } from './AcademicTeachingPanel';
import { readAcademicCareer } from '../lib/academicCareer';

interface AcademicModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onEnrollCourse: (course: AcademicCourse) => void;
  onAcademicMoneyChange: (delta: number) => void;
}

export const AcademicModal: React.FC<AcademicModalProps> = ({ isOpen, onClose, player, onEnrollCourse, onAcademicMoneyChange }) => {
  if (!isOpen) return null;

  const academicCareer = readAcademicCareer(player);
  const masterLevel = academicCareer.masterLevel;
  const doctorateLevel = academicCareer.doctorateLevel;
  const regularCourses = ACADEMIC_COURSES.filter((course) => !['MESTRE', 'DOUTOR'].includes(course.degree));
  const knowledge = normalizeLegalKnowledge(player.legalKnowledge);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-6 flex flex-col max-h-[90vh]">
        <div className="bg-[#111113] px-6 py-4 border-b border-[#2A2A2E] flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-[#1A1A1D] border border-[#60A5FA]/40 flex items-center justify-center text-[#60A5FA]"><GraduationCap size={22}/></div><div><h2 className="text-lg font-bold font-serif">Carreira Acadêmica & Titulação Jurídica</h2><p className="text-xs text-[#888]">Mestrado e Doutorado agora avançam por avaliações publicadas no Rota Admin.</p></div></div>
          <button onClick={() => { sound.playClick(); onClose(); }} className="p-2 rounded-lg bg-[#1A1A1D] text-[#888] border border-[#2A2A2E]"><X size={18}/></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#0A0A0B]">
          <section className="grid md:grid-cols-2 gap-4">
            {Object.values(ACADEMIC_TRACKS).map((track) => {
              const level = track.id === 'MESTRADO' ? masterLevel : doctorateLevel;
              return <div key={track.id} className="p-5 rounded-xl border border-[#60A5FA]/25 bg-[#60A5FA]/[0.05]">
                <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><FileQuestion size={18} className="text-[#60A5FA]"/><h3 className="font-bold">{track.label}</h3></div><p className="text-xs text-[#AAA] mt-2">{track.questionsPerExam} questões por avaliação • 5 níveis sequenciais.</p></div><strong className="font-mono text-[#60A5FA]">{level}/5</strong></div>
                <div className="grid grid-cols-5 gap-2 mt-4">{[1,2,3,4,5].map(n => <div key={n} className={`py-2 text-center rounded-lg border text-xs font-bold ${level >= n ? 'border-[#60A5FA]/50 bg-[#60A5FA]/10 text-[#60A5FA]' : 'border-[#2A2A2E] bg-[#111113] text-[#666]'}`}>{n}</div>)}</div>
                <p className="text-[11px] text-[#888] mt-3">A prova precisa existir e estar publicada no Supabase. A aprovação só libera o próximo nível, sem saltos.</p>
              </div>;
            })}
          </section>

          <section className="p-4 rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/[0.05] text-xs text-[#CFC5AD]">
            O antigo botão que concedia Mestrado ou Doutorado instantaneamente foi removido. Esses títulos passam a depender das provas de progressão criadas no painel administrativo.
          </section>

          <AcademicTeachingPanel player={player} onMoneyChange={onAcademicMoneyChange}/>

          <section className="p-5 rounded-xl border border-[#34D399]/20 bg-[#34D399]/[0.04]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div><h3 className="text-xs uppercase tracking-widest font-bold text-[#34D399]">Conhecimento jurídico</h3><p className="text-[11px] text-[#888] mt-1">Evolui com aulas, biblioteca, grupos de estudo, cursinhos e experiência profissional.</p></div>
              <BookOpen size={20} className="text-[#34D399]"/>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-5 gap-y-3">
              {Object.entries(knowledge).map(([area, value]) => <div key={area}>
                <div className="flex justify-between text-[10px] mb-1"><span className="text-[#BBB]">{LEGAL_KNOWLEDGE_LABELS[area as keyof typeof LEGAL_KNOWLEDGE_LABELS]}</span><strong className="font-mono text-[#E8E8E8]">{value}/100</strong></div>
                <div className="h-1.5 rounded-full bg-[#202126] overflow-hidden"><div className="h-full bg-[#34D399]" style={{ width: value + '%' }}/></div>
              </div>)}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest font-bold text-[#C5A059]">Especializações e cursos complementares</h3>
            {regularCourses.map((course) => {
              const completed = player.completedCourseIds.includes(course.id);
              const canAfford = player.money >= course.cost;
              const meetsXp = player.xp >= course.minXpRequired;
              const unlocked = !completed && meetsXp;
              return <div key={course.id} className={`p-5 rounded-xl border ${completed ? 'bg-[#161618] border-[#60A5FA]/40' : unlocked ? 'bg-[#161618] border-[#2A2A2E]' : 'bg-[#111113] border-[#222226] opacity-70'}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${completed ? 'bg-[#60A5FA] text-[#0A0A0B]' : 'bg-[#1A1A1D] text-[#60A5FA] border border-[#2A2A2E]'}`}>{completed ? <CheckCircle2 size={18}/> : <BookOpen size={18}/>}</div><div><h4 className="font-bold">{course.title}</h4><p className="text-xs text-[#888] mt-1">{course.institution}</p><p className="text-xs text-[#AAA] mt-2">{course.description}</p></div></div>
                  <div className="shrink-0 sm:text-right"><strong className="font-mono text-[#34D399]">R$ {course.cost.toLocaleString('pt-BR')}</strong><p className="text-[10px] text-[#888] mt-1">{course.minXpRequired} XP</p>{completed ? <span className="mt-2 inline-flex items-center gap-1 text-xs text-[#60A5FA]"><CheckCircle2 size={13}/> Concluído</span> : <button onClick={() => { if (canAfford && unlocked) { sound.playVictory(); onEnrollCourse(course); } }} disabled={!canAfford || !unlocked} className={`mt-2 px-4 py-2 rounded-lg text-xs font-bold ${canAfford && unlocked ? 'bg-[#C5A059] text-[#0A0A0B] cursor-pointer' : 'bg-[#1A1A1D] text-[#666] cursor-not-allowed border border-[#2A2A2E]'}`}>{!meetsXp ? <><Lock size={12} className="inline mr-1"/>XP insuficiente</> : !canAfford ? 'Saldo insuficiente' : 'Cursar'}</button>}</div>
                </div>
              </div>;
            })}
          </section>
        </div>

        <div className="p-4 bg-[#111113] border-t border-[#2A2A2E] flex justify-end"><button onClick={() => { sound.playClick(); onClose(); }} className="px-5 py-2 rounded-xl bg-[#1A1A1D] border border-[#2A2A2E] text-sm font-semibold">Fechar</button></div>
      </div>
    </div>
  );
};
