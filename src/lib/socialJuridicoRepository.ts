import { isSupabaseConfigured, supabase } from './supabase';

export type SocialJuridicoFeatureId =
  | 'sj_evidence_shield'
  | 'sj_digital_signature'
  | 'sj_extrajudicial_notice'
  | 'sj_crm';

export interface SocialJuridicoFeature {
  id: SocialJuridicoFeatureId;
  name: string;
  description: string;
  config: Record<string, unknown>;
}

const FEATURE_IDS = new Set<SocialJuridicoFeatureId>([
  'sj_evidence_shield',
  'sj_digital_signature',
  'sj_extrajudicial_notice',
  'sj_crm',
]);

export async function loadActiveSocialJuridicoFeatures(): Promise<SocialJuridicoFeature[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('game_features')
    .select('id,name,description,config')
    .eq('status', 'published')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;

  return (data || [])
    .filter((row) => FEATURE_IDS.has(row.id as SocialJuridicoFeatureId))
    .map((row) => ({
      id: row.id as SocialJuridicoFeatureId,
      name: String(row.name || row.id),
      description: String(row.description || ''),
      config: row.config && typeof row.config === 'object' ? row.config : {},
    }));
}
