import AsyncStorage from '@react-native-async-storage/async-storage';

import { ensureProfileId, getSupabase, isSupabaseConfigured } from '../../api/supabase';
import { getOrCreateDeviceId } from '../device';
import type { Plan } from '../../types/preferences';

/** Must match `SUPABASE_PROFILE_ID_KEY` in `src/lib/storage.ts`. */
const SUPABASE_PROFILE_ID_KEY = 'supabaseProfileId_v1';

function normalizeRemoteProfilePlan(raw: unknown): Plan | null {
  if (raw === 'unlimited') {
    return 'unlimited';
  }
  if (raw === 'free') {
    return 'free';
  }
  return null;
}

/**
 * In-memory guard so repeated RevenueCat `CustomerInfo` callbacks with the same effective plan
 * do not re-fetch Supabase every time. Keyed by profile + plan we last confirmed matches remote
 * or successfully wrote.
 */
let lastConfirmedSupabasePlanKey: string | null = null;

/**
 * Persists the RevenueCat-derived plan to `public.profiles.plan` when it differs from remote.
 * Skips when Supabase is not configured, profile cannot be resolved, or remote already matches.
 */
export async function syncRevenueCatDerivedPlanToSupabase(nextPlan: Plan): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }
  const client = getSupabase();
  if (!client) {
    return;
  }

  try {
    const deviceId = await getOrCreateDeviceId();
    let profileId = (await AsyncStorage.getItem(SUPABASE_PROFILE_ID_KEY))?.trim() || null;
    if (!profileId) {
      profileId = await ensureProfileId(client, deviceId);
      if (profileId) {
        await AsyncStorage.setItem(SUPABASE_PROFILE_ID_KEY, profileId);
      }
    }
    if (!profileId) {
      return;
    }

    const dedupeKey = `${profileId}:${nextPlan}`;
    if (lastConfirmedSupabasePlanKey === dedupeKey) {
      return;
    }

    const { data, error } = await client.from('profiles').select('plan').eq('id', profileId).maybeSingle();
    if (error) {
      console.warn('[revenueCat][supabase] fetch profiles.plan failed', error.message);
      return;
    }

    const row = data && typeof data === 'object' ? (data as { plan?: unknown }) : null;
    const remotePlan = normalizeRemoteProfilePlan(row?.plan);
    if (remotePlan === nextPlan) {
      lastConfirmedSupabasePlanKey = dedupeKey;
      return;
    }

    const { error: updateError } = await client.from('profiles').update({ plan: nextPlan }).eq('id', profileId);
    if (updateError) {
      console.warn('[revenueCat][supabase] update profiles.plan failed', updateError.message);
      return;
    }

    lastConfirmedSupabasePlanKey = dedupeKey;
  } catch (e) {
    console.warn('[revenueCat][supabase] syncRevenueCatDerivedPlanToSupabase', e);
  }
}
