import React, { useState } from 'react';
import { PlayerProfile, AcademicCourse, AcademicDegreeId } from '../types/game';
import { ACADEMIC_COURSES } from '../data/careers';
import { 
  X, 
  GraduationCap, 
  Award, 
  Sparkles, 
  Coins, 
  Clock, 
  CheckCircle2, 
  Lock, 
  Scroll,
  BookOpen
} from 'lucide-react';
import { sound } from '../utils/sound';

interface AcademicModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onEnrollCourse: (course: AcademicCourse) => void;
}

export const AcademicModal: React.FC<AcademicModalProps> = ({
  isOpen,
  onClose,
  player,
  onEnrollCourse,
}) => {
  const [selectedCourseForCertificate, setSelectedCourseForCertificate] = useState<AcademicCourse | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#111113] px-6 py-4 border-b border-[#2A2A2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1A1A1D] border border-[#60A5FA]/40 flex items-center justify-center text-[#60A5FA]">
              <GraduationCap size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-[#E0E0E0] flex items-center gap-2">
                Carreira Acadêmica & Titulação Jurídica
              </h2>
              <p className="text-xs text-[#888888]">
                Titulação atual de <strong className="text-[#C5A059]">{player.name}</strong>: {player.academicDegree}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-lg bg-[#1A1A1D] hover:bg-[#222226] text-[#888888] hover:text-[#E0E0E0] border border-[#2A2A2E] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Courses List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-[#0A0A0B]">
          {/* Certificate View Modal if viewing completed course */}
          {selectedCourseForCertificate && (
            <div className="p-6 bg-[#FDFCF0] text-[#1A1A1A] rounded-2xl border-4 border-[#C5A059]/60 shadow-2xl font-serif text-center relative mb-6">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#666666] block">
                REPÚBLICA FEDERATIVA DO BRASIL • MINISTÉRIO DA EDUCAÇÃO
              </span>
              <h3 className="text-xl font-bold text-[#1A1A1A] uppercase tracking-tight mt-1">
                DIPLOMA DE CONCLUSÃO DE GRAU ACADÊMICO
              </h3>
              <p className="text-xs text-[#666666] mt-2 font-mono">
                {selectedCourseForCertificate.institution}
              </p>

              <div className="my-6 py-4 border-y border-[#1A1A1A]/20 max-w-lg mx-auto text-xs leading-relaxed text-[#2A2A2A] font-sans">
                Certificamos que <strong className="text-base text-[#1A1A1A] font-serif block my-1">{player.name}</strong>
                concluiu com distinção e louvor o programa de <strong>{selectedCourseForCertificate.title}</strong>,
                fazendo jus ao título de <strong>{selectedCourseForCertificate.degree} EM DIREITO</strong> com todas as prerrogativas legais da República.
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#555555] max-w-md mx-auto">
                <div className="border-t border-[#1A1A1A]/30 pt-1 w-32">Reitoria Acadêmica</div>
                <div className="border-t border-[#1A1A1A]/30 pt-1 w-32">{player.name}</div>
              </div>

              <button
                onClick={() => setSelectedCourseForCertificate(null)}
                className="mt-4 text-xs font-bold text-[#1A1A1A] underline font-sans cursor-pointer"
              >
                Fechar Visualização do Diploma
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {ACADEMIC_COURSES.map((course) => {
              const isCompleted = player.completedCourseIds.includes(course.id);
              const canAfford = player.money >= course.cost;
              const meetsXp = player.xp >= course.minXpRequired;
              const isUnlocked = !isCompleted && meetsXp;

              return (
                <div
                  key={course.id}
                  className={`p-5 rounded-xl border transition-all ${
                    isCompleted
                      ? 'bg-[#161618] border-[#60A5FA]/40 shadow-md'
                      : isUnlocked
                      ? 'bg-[#161618] hover:bg-[#1A1A1D] border-[#2A2A2E] hover:border-[#C5A059]/40'
                      : 'bg-[#111113] border-[#222226] opacity-70'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                          isCompleted
                            ? 'bg-[#60A5FA] text-[#0A0A0B] shadow-md'
                            : isUnlocked
                            ? 'bg-[#1A1A1D] text-[#60A5FA] border border-[#2A2A2E]'
                            : 'bg-[#111113] text-[#444444]'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 size={18} /> : <BookOpen size={18} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-[#E0E0E0]">{course.title}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#60A5FA]/10 text-[#60A5FA] font-semibold border border-[#60A5FA]/25">
                            Grau: {course.degree}
                          </span>
                        </div>
                        <p className="text-xs text-[#888888] mt-0.5">{course.institution}</p>
                        <p className="text-xs text-[#AAAAAA] mt-2 leading-relaxed">{course.description}</p>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {course.skillsUnlocked.map((skill, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-[#111113] text-[#60A5FA] px-2 py-0.5 rounded border border-[#60A5FA]/20"
                            >
                              ★ {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Requirements, Cost and Action */}
                    <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#2A2A2E]">
                      <div>
                        <div className="font-mono text-[#34D399] font-bold text-sm">
                          R$ {course.cost.toLocaleString('pt-BR')}
                        </div>
                        <div className="text-[10px] text-[#888888] mt-0.5 font-mono">
                          Duração: {course.durationMonths} meses • Req: {course.minXpRequired} XP
                        </div>
                      </div>

                      {isCompleted ? (
                        <button
                          onClick={() => {
                            sound.playPaper();
                            setSelectedCourseForCertificate(course);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#1A1A1D] hover:bg-[#222226] text-[#60A5FA] border border-[#2A2A2E] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Scroll size={13} />
                          <span>Ver Diploma</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (canAfford && isUnlocked) {
                              sound.playVictory();
                              onEnrollCourse(course);
                            }
                          }}
                          disabled={!canAfford || !isUnlocked}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 uppercase tracking-wider ${
                            canAfford && isUnlocked
                              ? 'bg-[#C5A059] hover:bg-[#D4B475] text-[#0A0A0B] shadow-md shadow-[#C5A059]/20 cursor-pointer'
                              : 'bg-[#1A1A1D] text-[#666666] cursor-not-allowed border border-[#2A2A2E]'
                          }`}
                        >
                          <GraduationCap size={14} />
                          <span>{!meetsXp ? 'XP Insuficiente' : !canAfford ? 'Saldo Insuficiente' : 'Cursar e Titular'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#111113] border-t border-[#2A2A2E] flex items-center justify-between text-xs">
          <span className="text-[#888888]">
            A titulação acadêmica gera prestígio, reputação e pontuação na fase de títulos de concursos.
          </span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-[#1A1A1D] hover:bg-[#222226] text-[#E0E0E0] border border-[#2A2A2E] font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
