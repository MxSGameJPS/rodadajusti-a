import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authorization = req.headers.get('Authorization');
  if (!url || !anonKey) return json({ error: 'server_not_configured' }, 500);
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: 'unauthorized' }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const careerId = String(body.careerId || '');
  const itemId = String(body.itemId || '');
  if (!careerId || !itemId) return json({ error: 'missing_fields' }, 400);

  const { data, error } = await supabase.rpc('purchase_catalog_item', {
    p_career_id: careerId,
    p_item_id: itemId,
  });

  if (error) {
    const message = error.message || 'purchase_failed';
    if (message.includes('insufficient_balance')) return json({ error: 'insufficient_balance' }, 409);
    if (message.includes('item_unavailable')) return json({ error: 'item_unavailable' }, 404);
    if (message.includes('career_not_owned')) return json({ error: 'career_not_owned' }, 403);
    return json({ error: message }, 400);
  }

  return json(data);
});
