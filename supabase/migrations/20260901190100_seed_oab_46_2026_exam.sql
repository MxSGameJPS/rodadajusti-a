-- Seed do 46º Exame de Ordem Unificado (Tipo 1 - Branca)
-- Fonte: caderno da prova e gabarito definitivo fornecidos para o projeto.
-- Uso no jogo: SIMULADO. O resultado e o registro emitido são fictícios e não equivalem à aprovação/inscrição real.

begin;

insert into public.exams (
  id, slug, title, exam_type, edition_number, year, official_applied_date,
  source_kind, source_label, question_count, passing_score, duration_minutes,
  status, is_active, is_featured, simulation_notice, disclaimer, generation_brief,
  metadata, published_at
)
values (
  '46000000-2026-4000-8000-000000000001',
  'oab-46-2026-tipo-1',
  '46º Exame de Ordem Unificado - Tipo 1 (Branca)',
  'oab_first_phase',
  46,
  2026,
  '2026-05-03',
  'official_reference',
  '46º Exame de Ordem Unificado - Prova Tipo 1 (Branca)',
  80,
  40,
  300,
  'published',
  true,
  true,
  'Você está prestes a realizar um simulado baseado na prova real do 46º Exame de Ordem Unificado, aplicada em 2026. O caderno de referência é a Prova Tipo 1 - Branca.',
  'Este é um simulado dentro do Rota da Justiça. A aprovação e a inscrição exibidas pertencem somente ao personagem do jogo e não equivalem a aprovação, certificado ou inscrição profissional real perante a OAB.',
  'Manter o padrão da 1ª fase: questões objetivas com quatro alternativas, casos jurídicos contextualizados, interdisciplinaridade e distribuição ampla por áreas. Novas provas geradas por IA devem ser originais e não copiar literalmente questões oficiais.',
  '{"source":"user-provided-official-pdf","type":"Tipo 1 - Branca","officialDurationHours":5,"seedVersion":1}'::jsonb,
  now()
)
on conflict (slug) do update set
  title = excluded.title,
  question_count = excluded.question_count,
  passing_score = excluded.passing_score,
  duration_minutes = excluded.duration_minutes,
  status = excluded.status,
  is_active = excluded.is_active,
  is_featured = excluded.is_featured,
  simulation_notice = excluded.simulation_notice,
  disclaimer = excluded.disclaimer,
  generation_brief = excluded.generation_brief,
  metadata = excluded.metadata,
  published_at = excluded.published_at,
  updated_at = now();

delete from public.exam_questions
where exam_id = '46000000-2026-4000-8000-000000000001';

commit;
