import type { PlayerProfile } from '../types/game';
import { isSupabaseConfigured, supabase } from './supabase';

export async function persistPlayerCloudSave(player: PlayerProfile): Promise<{ ok: boolean; careerId: string | null }> {
  if (!isSupabaseConfigured || !supabase || !player.name) return { ok: false, careerId: null };
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) return { ok: false, careerId: null };

  let careerId = player.cloudCareerId || null;
  if (careerId) {
    const { data } = await supabase.from('careers').select('id').eq('id', careerId).eq('user_id', user.id).maybeSingle();
    if (!data?.id) careerId = null;
  }
  if (!careerId) {
    const { data } = await supabase.from('careers').select('id').eq('user_id', user.id).order('last_played_at', { ascending: false }).limit(1).maybeSingle();
    careerId = data?.id || null;
  }
  if (!careerId) {
    const { data, error } = await supabase.from('careers').insert({
      user_id: user.id,
      character_name: player.name,
      career_stage: player.careerTier,
      main_area: player.initialFocus || null,
      academic_degree: player.academicDegree,
      xp: Math.max(0, Math.floor(player.xp || 0)),
      reputation: Math.max(0, Math.min(100, Math.floor(player.reputation || 0))),
      money: Math.max(0, Number(player.money || 0)),
      current_city: player.homeCity || null,
      cases_completed: Math.max(0, Math.floor(player.casesSolved || 0)),
      cases_failed: Math.max(0, Math.floor(player.casesFailed || 0)),
      last_played_at: new Date().toISOString(),
    }).select('id').single();
    if (error || !data?.id) return { ok: false, careerId: null };
    careerId = data.id;
  }

  const gameState: PlayerProfile = { ...player, cloudCareerId: careerId };
  const { error } = await supabase.from('game_saves').upsert({
    career_id: careerId,
    user_id: user.id,
    slot: 1,
    save_version: 2,
    game_state: gameState,
    last_saved_at: new Date().toISOString(),
  }, { onConflict: 'career_id,slot' });
  if (error) {
    console.warn('[Rota da Justiça] Falha ao persistir save em nuvem.', error.message);
    return { ok: false, careerId };
  }
  await supabase.from('careers').update({
    character_name: player.name,
    career_stage: player.careerTier,
    main_area: player.initialFocus || null,
    academic_degree: player.academicDegree,
    xp: Math.max(0, Math.floor(player.xp || 0)),
    reputation: Math.max(0, Math.min(100, Math.floor(player.reputation || 0))),
    money: Math.max(0, Number(player.money || 0)),
    current_city: player.homeCity || null,
    cases_completed: Math.max(0, Math.floor(player.casesSolved || 0)),
    cases_failed: Math.max(0, Math.floor(player.casesFailed || 0)),
    last_played_at: new Date().toISOString(),
  }).eq('id', careerId).eq('user_id', user.id);
  return { ok: true, careerId };
}
