import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const num = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

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
  const rewardId = String(body.rewardId || '');
  const requestedCaseId = body.caseId ? String(body.caseId) : null;
  if (!careerId || !rewardId) return json({ error: 'missing_fields' }, 400);

  const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const [{ data: career }, { data: definition }] = await Promise.all([
    admin.from('careers').select('id,user_id,xp,reputation,cases_completed,cases_failed').eq('id', careerId).maybeSingle(),
    admin.from('reward_definitions').select('*').eq('id', rewardId).eq('status', 'published').eq('is_active', true).maybeSingle(),
  ]);

  if (!career || career.user_id !== authData.user.id) return json({ error: 'career_not_owned' }, 403);
  if (!definition) return json({ error: 'reward_unavailable' }, 404);

  const conditions = definition.conditions || {};
  if (career.xp < num(conditions.minXp)) return json({ error: 'condition_min_xp' }, 409);
  if (career.reputation < num(conditions.minReputation)) return json({ error: 'condition_min_reputation' }, 409);
  if (career.cases_completed < num(conditions.minCasesSolved)) return json({ error: 'condition_min_cases' }, 409);

  const fixedCaseId = conditions.caseId ? String(conditions.caseId) : null;
  const caseId = fixedCaseId || requestedCaseId;
  if (fixedCaseId && requestedCaseId && fixedCaseId !== requestedCaseId) return json({ error: 'invalid_case_scope' }, 400);

  if (caseId) {
    const requiredStatus = String(conditions.caseStatus || 'COMPLETED');
    const { data: progress } = await admin.from('case_progress').select('status,score').eq('career_id', careerId).eq('case_id', caseId).maybeSingle();
    if (!progress || progress.status !== requiredStatus) return json({ error: 'condition_case_status' }, 409);
    if (num(progress.score) < num(conditions.minCaseScore)) return json({ error: 'condition_case_score' }, 409);
  }

  const policy = String(definition.metadata?.claimPolicy || 'once');
  let claimKey = 'once';
  if (policy === 'per_case') {
    if (!caseId) return json({ error: 'case_required_for_claim' }, 400);
    claimKey = `case:${caseId}`;
  } else if (policy === 'daily') {
    claimKey = `day:${new Date().toISOString().slice(0, 10)}`;
  }

  const { data, error } = await admin.rpc('apply_reward_definition', {
    p_career_id: careerId,
    p_reward_id: rewardId,
    p_claim_key: claimKey,
    p_metadata: { case_id: caseId, claimed_by: authData.user.id },
  });

  if (error) {
    const message = error.message || 'reward_failed';
    if (message.includes('reward_already_claimed')) return json({ error: 'reward_already_claimed' }, 409);
    return json({ error: message }, 400);
  }

  return json(data);
});
