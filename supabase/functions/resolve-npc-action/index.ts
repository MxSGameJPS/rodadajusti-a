import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const numberOr = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

function evidenceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === 'string' ? item : (item && typeof item === 'object' && 'id' in item ? String(item.id) : '')).filter(Boolean);
}

function renderDecision(role: string, outcome: string, breakdown: Record<string, number>) {
  const authority = role === 'desembargador' ? 'Desembargador(a)' : role === 'juiz' ? 'Juiz(a)' : role === 'promotor' ? 'Representante do Ministério Público' : 'Autoridade jurídica';
  const foundation = `força probatória ${Math.round(breakdown.evidenceStrength)}%, fundamentação ${Math.round(breakdown.legalQuality)}% e integridade ${Math.round(breakdown.integrity)}%`;

  if (outcome === 'deferido') return `${authority}: Vistos. Considerando ${foundation}, reconheço a presença de elementos suficientes para acolhimento do requerimento. DEFIRO o pedido nos termos da fundamentação registrada.`;
  if (outcome === 'deferido_parcialmente') return `${authority}: Vistos. Os autos apresentam elementos relevantes, embora não integralmente suficientes. Considerando ${foundation}, DEFIRO PARCIALMENTE o pedido, limitada a medida ao necessário e proporcional.`;
  if (outcome === 'aceito') return `${authority}: A proposta mostra-se juridicamente adequada diante dos elementos disponíveis. O acordo é ACEITO, condicionado ao cumprimento das obrigações registradas.`;
  if (outcome === 'contraproposta') return `${authority}: Há espaço para composição, mas os termos apresentados exigem ajuste. Apresento CONTRAPROPOSTA compatível com os elementos jurídicos e probatórios disponíveis.`;
  if (outcome === 'recusado') return `${authority}: Os elementos atuais não justificam a composição nos termos propostos. A proposta é RECUSADA, sem prejuízo de nova análise caso surjam fatos relevantes.`;
  return `${authority}: Vistos. Considerando ${foundation}, os pressupostos necessários não foram demonstrados de forma suficiente. INDEFIRO o pedido, facultada nova provocação com documentação idônea.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');
  if (!url || !anonKey || !serviceRole) return json({ error: 'server_not_configured' }, 500);
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: 'unauthorized' }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }

  const careerId = String(body.careerId || '');
  const caseId = String(body.caseId || '');
  const npcId = String(body.npcId || '');
  const actionType = String(body.actionType || '');
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  if (!careerId || !caseId || !npcId || !actionType) return json({ error: 'missing_fields' }, 400);

  const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

  const [{ data: career }, { data: npc }, { data: caseRow }, { data: progress }, { data: state }] = await Promise.all([
    admin.from('careers').select('id,user_id').eq('id', careerId).maybeSingle(),
    admin.from('npcs').select('*').eq('id', npcId).eq('status', 'published').eq('is_active', true).maybeSingle(),
    admin.from('cases').select('id,title,deadline_hours,content').eq('id', caseId).eq('status', 'published').eq('is_active', true).maybeSingle(),
    admin.from('case_progress').select('status,investigation_score,legal_score,ethics_score,evidence_found,decisions').eq('career_id', careerId).eq('case_id', caseId).maybeSingle(),
    admin.from('npc_player_state').select('*').eq('npc_id', npcId).eq('career_id', careerId).maybeSingle(),
  ]);

  if (!career || career.user_id !== authData.user.id) return json({ error: 'career_not_owned' }, 403);
  if (!npc) return json({ error: 'npc_unavailable' }, 404);
  if (!caseRow) return json({ error: 'case_unavailable' }, 404);

  const { data: action, error: actionError } = await admin.from('legal_actions').insert({
    career_id: careerId,
    case_id: caseId,
    npc_id: npcId,
    action_type: actionType,
    status: 'pending',
    payload,
  }).select('id').single();
  if (actionError || !action) return json({ error: actionError?.message || 'action_create_failed' }, 500);

  const clues = Array.isArray(caseRow.content?.availableClues) ? caseRow.content.availableClues : [];
  const crucialIds = clues.filter((clue: Record<string, unknown>) => clue?.relevance === 'crucial').map((clue: Record<string, unknown>) => String(clue.id));
  const found = new Set(evidenceIds(progress?.evidence_found));
  const crucialFound = crucialIds.filter((id: string) => found.has(id)).length;
  const evidenceStrength = crucialIds.length ? (crucialFound / crucialIds.length) * 100 : 50;
  const legalQuality = numberOr(progress?.legal_score, 50);
  const investigationQuality = numberOr(progress?.investigation_score, evidenceStrength);
  const ethics = numberOr(progress?.ethics_score, 60);
  const decisions = Array.isArray(progress?.decisions) ? progress.decisions : [];
  const protectedEvidenceCount = decisions.filter((entry: Record<string, unknown>) => {
    const type = String(entry?.type || entry?.tool || '');
    return type === 'social_juridico_blindagem' || type === 'evidence_shield' || type === 'sj_evidence_shield';
  }).length;
  const integrity = clamp(50 + protectedEvidenceCount * 15);
  const urgency = caseRow.deadline_hours <= 24 ? 90 : caseRow.deadline_hours <= 48 ? 75 : 55;

  const personality = npc.personality || {};
  const evidenceRigor = numberOr(personality.evidenceRigor, 60);
  const formalism = numberOr(personality.formalism, 60);
  const urgencySensitivity = numberOr(personality.urgencySensitivity, 50);

  const rules = Array.isArray(npc.decision_rules) ? npc.decision_rules : [];
  const applicableRuleWeight = rules.reduce((sum: number, rule: Record<string, unknown>) => {
    const ruleType = String(rule?.actionType || '');
    if (ruleType !== actionType && ruleType !== 'generic_legal_request') return sum;
    return sum + numberOr(rule?.weight, 0) * 0.12;
  }, 0);

  const relationModifier = clamp(numberOr(state?.respect, 0), -100, 100) * 0.04;
  let score = evidenceStrength * 0.34 + legalQuality * 0.25 + investigationQuality * 0.12 + integrity * 0.10 + ethics * 0.07 + urgency * 0.12;
  score = clamp(score + applicableRuleWeight + relationModifier);
  const threshold = clamp(55 + (evidenceRigor - 50) * 0.12 + (formalism - 50) * 0.08 - (urgencySensitivity - 50) * 0.05, 42, 78);

  const isAgreement = actionType.toLowerCase().includes('acordo') || actionType.toLowerCase().includes('agreement');
  let outcome: string;
  if (isAgreement) outcome = score >= threshold + 10 ? 'aceito' : score >= threshold - 5 ? 'contraproposta' : 'recusado';
  else outcome = score >= threshold + 14 ? 'deferido' : score >= threshold ? 'deferido_parcialmente' : 'indeferido';

  const scoreBreakdown = { evidenceStrength, legalQuality, investigationQuality, integrity, ethics, urgency, ruleModifier: applicableRuleWeight, relationModifier };
  const renderedText = renderDecision(npc.role_type, outcome, scoreBreakdown);

  const { data: decision, error: decisionError } = await admin.from('legal_decisions').insert({
    legal_action_id: action.id,
    npc_id: npcId,
    decision_type: actionType,
    outcome,
    score,
    threshold,
    score_breakdown: scoreBreakdown,
    reasoning_template: 'deterministic-v1',
    rendered_text: renderedText,
    metadata: { npcVersion: npc.version, engineVersion: npc.decision_engine_version },
  }).select('*').single();
  if (decisionError || !decision) return json({ error: decisionError?.message || 'decision_create_failed' }, 500);

  await admin.from('legal_actions').update({ status: 'resolved', result: { decisionId: decision.id, outcome, score }, resolved_at: new Date().toISOString() }).eq('id', action.id);
  await admin.from('npc_interactions').insert({
    npc_id: npcId,
    career_id: careerId,
    case_id: caseId,
    interaction_type: actionType,
    player_action: payload,
    npc_response: { decisionId: decision.id, text: renderedText },
    outcome: { outcome, score, threshold },
  });

  const respectDelta = outcome === 'deferido' || outcome === 'aceito' ? 2 : outcome === 'deferido_parcialmente' || outcome === 'contraproposta' ? 1 : 0;
  await admin.from('npc_player_state').upsert({
    npc_id: npcId,
    career_id: careerId,
    affinity: numberOr(state?.affinity, 0),
    trust: numberOr(state?.trust, 0),
    respect: clamp(numberOr(state?.respect, 0) + respectDelta, -100, 100),
    flags: state?.flags || {},
    memory_summary: { ...(state?.memory_summary || {}), lastOutcome: outcome, lastActionType: actionType },
    last_interaction_at: new Date().toISOString(),
  }, { onConflict: 'npc_id,career_id' });

  await admin.from('npc_memories').insert({
    npc_id: npcId,
    career_id: careerId,
    case_id: caseId,
    memory_type: 'legal_decision',
    summary: `${npc.name} analisou ${actionType} no caso ${caseRow.title} e decidiu: ${outcome}.`,
    importance: outcome === 'deferido' || outcome === 'indeferido' ? 7 : 5,
    context: { legalActionId: action.id, legalDecisionId: decision.id, score, threshold },
  });

  return json({ ok: true, actionId: action.id, decision });
});
