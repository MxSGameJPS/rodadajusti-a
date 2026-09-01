import { supabase } from './supabase';
import type { ProfessionalExam, ProfessionalExamResult } from '../types/game';

export const DEFAULT_OAB_EXAM_SLUG = 'oab-46-2026-tipo-1';

export async function loadProfessionalExam(slug = DEFAULT_OAB_EXAM_SLUG): Promise<ProfessionalExam> {
  if (!supabase) {
    throw new Error('Supabase não está configurado neste ambiente.');
  }

  const { data, error } = await supabase.rpc('get_published_exam', { p_slug: slug });

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar o Exame da Ordem.');
  }

  if (!data || !Array.isArray(data.questions)) {
    throw new Error('O exame publicado retornou dados inválidos.');
  }

  return data as ProfessionalExam;
}

export async function submitProfessionalExam(params: {
  slug: string;
  answers: Record<string, string>;
  durationSeconds: number;
  careerId?: string | null;
}): Promise<ProfessionalExamResult> {
  if (!supabase) {
    throw new Error('Supabase não está configurado neste ambiente.');
  }

  const { data, error } = await supabase.rpc('submit_exam_attempt', {
    p_exam_slug: params.slug,
    p_answers: params.answers,
    p_duration_seconds: Math.max(0, Math.floor(params.durationSeconds)),
    p_career_id: params.careerId || null,
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível corrigir o exame.');
  }

  return data as ProfessionalExamResult;
}
