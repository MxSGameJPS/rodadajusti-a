import type { User } from '@supabase/supabase-js';

const NAME_KEYS = [
  'full_name',
  'name',
  'display_name',
  'preferred_username',
  'given_name',
] as const;

function readNameFromRecord(record: Record<string, unknown> | null | undefined) {
  if (!record) return '';

  for (const key of NAME_KEYS) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length >= 2) {
      return value.trim();
    }
  }

  return '';
}

export function getSuggestedPlayerName(user: User | null | undefined) {
  if (!user) return '';

  const metadataName = readNameFromRecord(user.user_metadata as Record<string, unknown>);
  if (metadataName) return metadataName;

  for (const identity of user.identities || []) {
    const identityName = readNameFromRecord(
      identity.identity_data as Record<string, unknown> | undefined,
    );
    if (identityName) return identityName;
  }

  return '';
}
