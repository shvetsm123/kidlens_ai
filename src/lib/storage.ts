import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ensureProfileId,
  fetchPreferencesForProfile,
  getSupabase,
  isSupabaseConfigured,
  persistSuccessfulScanHistory,
  preferencesRowHasValues,
  type DbPreferencesRow,
  upsertPreferencesForProfile,
} from '../api/supabase';
import { parseStoredRecentScan } from './parseStoredRecentScan';
import { DEVICE_ID_STORAGE_KEY, getOrCreateDeviceId } from './device';
import type { AvoidPreference, Plan, ResultStyle } from '../types/preferences';
import type { RecentScan } from '../types/scan';

const ONBOARDING_COMPLETED_KEY = 'onboardingCompleted';
const CHILD_AGE_KEY = 'childAge';
const IS_PREMIUM_KEY = 'isPremium';
const PLAN_KEY = 'plan_v1';
const DAILY_SUCCESSFUL_SCANS_KEY = 'dailySuccessfulScans_v1';
const RESULT_STYLE_KEY = 'resultStyle';
const AVOID_PREFERENCES_KEY = 'avoidPreferences';
const RECENT_SCANS_KEY_V4 = 'recentScans_v4';
const RECENT_SCANS_KEY_V3 = 'recentScans_v3';
const LEGACY_RECENT_SCANS_KEYS = ['recentScans'];
const RECENT_SCANS_LEGACY_CLEARED_KEY = 'recentScansLegacyCleared_v3';
const SUPABASE_PROFILE_ID_KEY = 'supabaseProfileId_v1';

export const MAX_RECENT_SCANS = 20;

const REMOTE_AVOID_IDS: readonly AvoidPreference[] = [
  'added_sugar',
  'sweeteners',
  'artificial_colors',
  'caffeine',
  'ultra_processed',
  'milk',
  'soy',
  'gluten',
  'nuts',
  'eggs',
];

function parseAvoidFromRemote(raw: unknown): AvoidPreference[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is AvoidPreference => typeof item === 'string' && REMOTE_AVOID_IDS.includes(item as AvoidPreference));
}

async function readRawResultStyleString(): Promise<string | null> {
  const value = await AsyncStorage.getItem(RESULT_STYLE_KEY);
  if (value === 'quick' || value === 'detailed' || value === 'balanced') {
    return value;
  }
  return null;
}

async function readLocalPreferencePayloadForRemote(): Promise<{
  child_age: number | null;
  result_style: string;
  avoid_preferences: AvoidPreference[];
}> {
  const child_age = await getChildAge();
  const result_style = (await readRawResultStyleString()) ?? 'balanced';
  const avoid_preferences = await getAvoidPreferences();
  return { child_age, result_style, avoid_preferences };
}

async function applyRemotePreferencesRowToLocal(row: DbPreferencesRow): Promise<void> {
  if (row.child_age != null && Number.isFinite(Number(row.child_age))) {
    await setChildAge(Math.round(Number(row.child_age)));
  }
  if (row.result_style === 'quick' || row.result_style === 'balanced' || row.result_style === 'detailed') {
    await setResultStyle(row.result_style);
  }
  if (Array.isArray(row.avoid_preferences)) {
    await setAvoidPreferences(parseAvoidFromRemote(row.avoid_preferences));
  }
}

export async function ensureSupabaseProfileLocal(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }
  const client = getSupabase();
  if (!client) {
    return;
  }
  try {
    const deviceId = await getOrCreateDeviceId();
    const profileId = await ensureProfileId(client, deviceId);
    if (profileId) {
      await AsyncStorage.setItem(SUPABASE_PROFILE_ID_KEY, profileId);
    }
  } catch {
    /* local-first */
  }
}

export async function syncRemotePreferencesWithLocal(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }
  const onboarded = await getOnboardingCompleted();
  if (!onboarded) {
    return;
  }
  const client = getSupabase();
  if (!client) {
    return;
  }
  try {
    const deviceId = await getOrCreateDeviceId();
    let profileId = await AsyncStorage.getItem(SUPABASE_PROFILE_ID_KEY);
    if (!profileId) {
      const resolved = await ensureProfileId(client, deviceId);
      if (!resolved) {
        return;
      }
      profileId = resolved;
      await AsyncStorage.setItem(SUPABASE_PROFILE_ID_KEY, profileId);
    }
    const remote = await fetchPreferencesForProfile(client, profileId);
    if (remote && preferencesRowHasValues(remote)) {
      await applyRemotePreferencesRowToLocal(remote);
    } else {
      const local = await readLocalPreferencePayloadForRemote();
      await upsertPreferencesForProfile(client, {
        profile_id: profileId,
        child_age: local.child_age,
        result_style: local.result_style,
        avoid_preferences: local.avoid_preferences,
      });
    }
  } catch {
    /* local-first */
  }
}

export async function pushSupabasePreferencesFromLocal(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }
  const onboarded = await getOnboardingCompleted();
  if (!onboarded) {
    return;
  }
  const client = getSupabase();
  if (!client) {
    return;
  }
  try {
    const deviceId = await getOrCreateDeviceId();
    let profileId = await AsyncStorage.getItem(SUPABASE_PROFILE_ID_KEY);
    if (!profileId) {
      const resolved = await ensureProfileId(client, deviceId);
      if (!resolved) {
        return;
      }
      profileId = resolved;
      await AsyncStorage.setItem(SUPABASE_PROFILE_ID_KEY, profileId);
    }
    const local = await readLocalPreferencePayloadForRemote();
    await upsertPreferencesForProfile(client, {
      profile_id: profileId,
      child_age: local.child_age,
      result_style: local.result_style,
      avoid_preferences: local.avoid_preferences,
    });
  } catch {
    /* local-first */
  }
}

async function clearLegacyRecentScansKeys(): Promise<void> {
  const done = await AsyncStorage.getItem(RECENT_SCANS_LEGACY_CLEARED_KEY);
  if (done === '1') {
    return;
  }
  await AsyncStorage.multiRemove(LEGACY_RECENT_SCANS_KEYS);
  await AsyncStorage.setItem(RECENT_SCANS_LEGACY_CLEARED_KEY, '1');
}

export const getOnboardingCompleted = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
  return value === 'true';
};

export const setOnboardingCompleted = async (value: boolean): Promise<void> => {
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, value ? 'true' : 'false');
};

export const getChildAge = async (): Promise<number | null> => {
  const value = await AsyncStorage.getItem(CHILD_AGE_KEY);
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const setChildAge = async (age: number): Promise<void> => {
  await AsyncStorage.setItem(CHILD_AGE_KEY, String(age));
};

export const getIsPremium = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(IS_PREMIUM_KEY);
  return value === 'true';
};

export const setIsPremium = async (value: boolean): Promise<void> => {
  await AsyncStorage.setItem(IS_PREMIUM_KEY, value ? 'true' : 'false');
};

function localCalendarDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const getPlan = async (): Promise<Plan> => {
  const raw = await AsyncStorage.getItem(PLAN_KEY);
  if (raw === 'free' || raw === 'unlimited' || raw === 'insights') {
    return raw;
  }
  const legacy = await AsyncStorage.getItem(IS_PREMIUM_KEY);
  if (legacy === 'true') {
    await AsyncStorage.setItem(PLAN_KEY, 'unlimited');
    return 'unlimited';
  }
  return 'free';
};

export const setPlan = async (plan: Plan): Promise<void> => {
  await AsyncStorage.setItem(PLAN_KEY, plan);
};

export type DailySuccessfulScanState = {
  dateKey: string;
  count: number;
};

export const getDailySuccessfulScanState = async (): Promise<DailySuccessfulScanState> => {
  const today = localCalendarDateKey();
  const raw = await AsyncStorage.getItem(DAILY_SUCCESSFUL_SCANS_KEY);
  if (!raw) {
    return { dateKey: today, count: 0 };
  }
  try {
    const o = JSON.parse(raw) as { dateKey?: string; date?: string; count?: unknown };
    const key = typeof o.dateKey === 'string' ? o.dateKey : typeof o.date === 'string' ? o.date : null;
    if (key !== today) {
      return { dateKey: today, count: 0 };
    }
    const c = typeof o.count === 'number' && Number.isFinite(o.count) ? Math.max(0, Math.floor(o.count)) : 0;
    return { dateKey: today, count: c };
  } catch {
    return { dateKey: today, count: 0 };
  }
};

export const incrementSuccessfulScanCountIfNeeded = async (): Promise<DailySuccessfulScanState> => {
  const today = localCalendarDateKey();
  const raw = await AsyncStorage.getItem(DAILY_SUCCESSFUL_SCANS_KEY);
  let nextCount = 1;
  if (raw) {
    try {
      const o = JSON.parse(raw) as { dateKey?: string; date?: string; count?: unknown };
      const key = typeof o.dateKey === 'string' ? o.dateKey : typeof o.date === 'string' ? o.date : '';
      const prev =
        typeof o.count === 'number' && Number.isFinite(o.count) ? Math.max(0, Math.floor(o.count)) : 0;
      nextCount = key === today ? prev + 1 : 1;
    } catch {
      nextCount = 1;
    }
  }
  const next: DailySuccessfulScanState = { dateKey: today, count: nextCount };
  await AsyncStorage.setItem(DAILY_SUCCESSFUL_SCANS_KEY, JSON.stringify(next));
  return next;
};

export const canUseSuccessfulScan = async (): Promise<boolean> => {
  const plan = await getPlan();
  if (plan !== 'free') {
    return true;
  }
  const { count } = await getDailySuccessfulScanState();
  return count < 2;
};

export const getResultStyle = async (): Promise<ResultStyle> => {
  const value = await AsyncStorage.getItem(RESULT_STYLE_KEY);
  const style: ResultStyle =
    value === 'quick' || value === 'detailed' || value === 'balanced' ? value : 'balanced';
  const plan = await getPlan();
  if (style === 'detailed' && plan !== 'insights') {
    return 'balanced';
  }
  return style;
};

export const setResultStyle = async (value: ResultStyle): Promise<void> => {
  const plan = await getPlan();
  const stored: ResultStyle = value === 'detailed' && plan !== 'insights' ? 'balanced' : value;
  await AsyncStorage.setItem(RESULT_STYLE_KEY, stored);
};

export const getAvoidPreferences = async (): Promise<AvoidPreference[]> => {
  const value = await AsyncStorage.getItem(AVOID_PREFERENCES_KEY);
  if (value == null || value === '' || value === 'null' || value === 'undefined') {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    if (parsed.length === 0) {
      return [];
    }
    const allowed: AvoidPreference[] = [
      'added_sugar',
      'sweeteners',
      'artificial_colors',
      'caffeine',
      'ultra_processed',
      'milk',
      'soy',
      'gluten',
      'nuts',
      'eggs',
    ];
    return parsed.filter((item): item is AvoidPreference => typeof item === 'string' && allowed.includes(item as AvoidPreference));
  } catch {
    return [];
  }
};

export const setAvoidPreferences = async (value: AvoidPreference[]): Promise<void> => {
  await AsyncStorage.setItem(AVOID_PREFERENCES_KEY, JSON.stringify(value));
};

export const getRecentScans = async (): Promise<RecentScan[]> => {
  await clearLegacyRecentScansKeys();
  const v4 = await AsyncStorage.getItem(RECENT_SCANS_KEY_V4);
  if (v4) {
    try {
      const parsed = JSON.parse(v4) as unknown[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map(parseStoredRecentScan).filter((s): s is RecentScan => s !== null);
    } catch {
      return [];
    }
  }

  const v3 = await AsyncStorage.getItem(RECENT_SCANS_KEY_V3);
  if (!v3) {
    return [];
  }
  try {
    const parsed = JSON.parse(v3) as unknown[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    const migrated = parsed.map(parseStoredRecentScan).filter((s): s is RecentScan => s !== null);
    await AsyncStorage.setItem(RECENT_SCANS_KEY_V4, JSON.stringify(migrated));
    await AsyncStorage.removeItem(RECENT_SCANS_KEY_V3);
    return migrated;
  } catch {
    return [];
  }
};

export const addRecentScan = async (scan: RecentScan, replaceUnknownDuplicateWithinMs?: number): Promise<RecentScan[]> => {
  const current = await getRecentScans();
  let tail = current;
  const top = current[0];
  if (
    replaceUnknownDuplicateWithinMs &&
    top &&
    top.barcode.trim() === scan.barcode.trim() &&
    top.productName === 'Unknown product' &&
    top.verdict === 'unknown'
  ) {
    const ageMs = Date.now() - new Date(top.scannedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < replaceUnknownDuplicateWithinMs) {
      tail = current.slice(1);
    }
  }
  const next = [scan, ...tail].slice(0, MAX_RECENT_SCANS);
  await AsyncStorage.setItem(RECENT_SCANS_KEY_V4, JSON.stringify(next));
  return next;
};

export async function getCachedSupabaseProfileId(): Promise<string | null> {
  const id = await AsyncStorage.getItem(SUPABASE_PROFILE_ID_KEY);
  const trimmed = id?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export async function tryPersistSuccessfulScanToSupabase(scan: RecentScan, childAge: number | null): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }
  const profileId = await getCachedSupabaseProfileId();
  if (!profileId) {
    return;
  }
  const client = getSupabase();
  if (!client) {
    return;
  }
  try {
    await persistSuccessfulScanHistory(client, profileId, scan, childAge);
  } catch (err) {
    console.warn('[storage] tryPersistSuccessfulScanToSupabase', err);
  }
}

const DEV_RESET_KEYS = [
  ONBOARDING_COMPLETED_KEY,
  CHILD_AGE_KEY,
  IS_PREMIUM_KEY,
  PLAN_KEY,
  DAILY_SUCCESSFUL_SCANS_KEY,
  RESULT_STYLE_KEY,
  AVOID_PREFERENCES_KEY,
  SUPABASE_PROFILE_ID_KEY,
  DEVICE_ID_STORAGE_KEY,
  'recentScans',
  RECENT_SCANS_KEY_V3,
  RECENT_SCANS_KEY_V4,
  RECENT_SCANS_LEGACY_CLEARED_KEY,
  'compareSelection_v1',
];

export const resetAppDataForDev = async (): Promise<void> => {
  await AsyncStorage.multiRemove(DEV_RESET_KEYS);
};
