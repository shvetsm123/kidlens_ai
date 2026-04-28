import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase, isSupabaseConfigured } from '../api/supabase';
import { getCachedSupabaseProfileId } from './storage';
import { getOrCreateDeviceId } from './device';

export type CreatorContactType = 'email' | 'instagram' | 'tiktok' | 'other';

export type CreatorSubmissionStatus = 'pending' | 'selected' | 'not_selected' | 'paid' | 'rejected';

export type CreatorSubmission = {
  id: string;
  created_at: string;
  video_url: string;
  contact_type: CreatorContactType;
  contact_value: string;
  status: CreatorSubmissionStatus;
};

type SubmitCreatorSubmissionResult =
  | { ok: true; submission: CreatorSubmission }
  | { ok: false; message: string };

export type FetchCreatorSubmissionsResult = {
  submissions: CreatorSubmission[];
  source: 'remote' | 'cache';
  warning: string | null;
};

const CREATOR_SUBMISSIONS_CACHE_KEY = 'creatorSubmissions_v1';
const MAX_VIDEO_URL_LENGTH = 500;
const MAX_CONTACT_VALUE_LENGTH = 120;
const allowedVideoHosts = new Set([
  'tiktok.com',
  'vm.tiktok.com',
  'instagram.com',
  'www.instagram.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
]);

function readCachedSubmission(value: unknown): CreatorSubmission | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const row = value as Partial<CreatorSubmission>;
  if (
    typeof row.id !== 'string' ||
    typeof row.created_at !== 'string' ||
    typeof row.video_url !== 'string' ||
    typeof row.contact_type !== 'string' ||
    typeof row.contact_value !== 'string' ||
    typeof row.status !== 'string'
  ) {
    return null;
  }
  if (!['email', 'instagram', 'tiktok', 'other'].includes(row.contact_type)) {
    return null;
  }
  if (!['pending', 'selected', 'not_selected', 'paid', 'rejected'].includes(row.status)) {
    return null;
  }
  return row as CreatorSubmission;
}

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase();
}

function validateVideoUrl(rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) {
    return 'Add a video link.';
  }
  if (value.length > MAX_VIDEO_URL_LENGTH) {
    return 'Video link is too long.';
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return 'Enter a valid video link.';
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return 'Enter a valid video link.';
  }
  if (!allowedVideoHosts.has(normalizeHost(parsed.hostname))) {
    return 'Use a TikTok, Instagram, or YouTube link.';
  }
  return null;
}

function validateContact(contactType: CreatorContactType, rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) {
    return 'Add your contact details.';
  }
  if (value.length > MAX_CONTACT_VALUE_LENGTH) {
    return 'Contact details are too long.';
  }
  if (contactType === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Enter a valid email address.';
    }
    return null;
  }
  if (contactType === 'instagram' || contactType === 'tiktok') {
    const handle = value.startsWith('@') ? value.slice(1) : value;
    if (!/^[A-Za-z0-9._]{2,30}$/.test(handle)) {
      return 'Enter a valid handle, 2-30 characters.';
    }
  }
  return null;
}

export function validateCreatorSubmission(input: {
  videoUrl: string;
  contactType: CreatorContactType;
  contactValue: string;
}): string | null {
  return validateVideoUrl(input.videoUrl) ?? validateContact(input.contactType, input.contactValue);
}

async function readCachedSubmissions(): Promise<CreatorSubmission[]> {
  try {
    const raw = await AsyncStorage.getItem(CREATOR_SUBMISSIONS_CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(readCachedSubmission).filter((row): row is CreatorSubmission => row != null);
  } catch {
    return [];
  }
}

async function writeCachedSubmissions(submissions: CreatorSubmission[]): Promise<void> {
  await AsyncStorage.setItem(CREATOR_SUBMISSIONS_CACHE_KEY, JSON.stringify(submissions.slice(0, 50)));
}

async function cacheSubmission(submission: CreatorSubmission): Promise<void> {
  const current = await readCachedSubmissions();
  const next = [submission, ...current.filter((item) => item.id !== submission.id)].slice(0, 50);
  await writeCachedSubmissions(next);
}

export async function fetchCreatorSubmissions(): Promise<FetchCreatorSubmissionsResult> {
  const cached = await readCachedSubmissions();
  if (!isSupabaseConfigured()) {
    return {
      submissions: cached,
      source: 'cache',
      warning: 'Submission status could not be refreshed right now.',
    };
  }
  const client = getSupabase();
  if (!client) {
    return {
      submissions: cached,
      source: 'cache',
      warning: 'Submission status could not be refreshed right now.',
    };
  }

  try {
    const [deviceId, profileId] = await Promise.all([getOrCreateDeviceId(), getCachedSupabaseProfileId()]);
    const { data, error } = await client.rpc('fetch_creator_submissions_for_device', {
      p_device_id: deviceId,
      p_profile_id: profileId,
    });

    if (error) {
      console.warn('[creatorSubmissions] remote fetch failed', {
        message: error.message,
        code: error.code,
      });
      return {
        submissions: cached,
        source: 'cache',
        warning: 'Submissions could not be refreshed right now.',
      };
    }

    const remoteRows = Array.isArray(data)
      ? data.map(readCachedSubmission).filter((row): row is CreatorSubmission => row != null)
      : [];
    await writeCachedSubmissions(remoteRows);
    return { submissions: remoteRows, source: 'remote', warning: null };
  } catch (e) {
    console.warn('[creatorSubmissions] remote fetch exception', e);
    return {
      submissions: cached,
      source: 'cache',
      warning: 'Submissions could not be refreshed right now.',
    };
  }
}

export async function submitCreatorSubmission(input: {
  videoUrl: string;
  contactType: CreatorContactType;
  contactValue: string;
}): Promise<SubmitCreatorSubmissionResult> {
  const trimmedVideoUrl = input.videoUrl.trim();
  const trimmedContactValue = input.contactValue.trim();
  const validationMessage = validateCreatorSubmission({
    videoUrl: trimmedVideoUrl,
    contactType: input.contactType,
    contactValue: trimmedContactValue,
  });
  if (validationMessage) {
    return { ok: false, message: validationMessage };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Submissions are not available right now. Please try again later.' };
  }
  const client = getSupabase();
  if (!client) {
    return { ok: false, message: 'Submissions are not available right now. Please try again later.' };
  }

  const [deviceId, profileId] = await Promise.all([getOrCreateDeviceId(), getCachedSupabaseProfileId()]);
  const createdAt = new Date().toISOString();
  const { error } = await client.from('creator_submissions').insert({
    profile_id: profileId,
    device_id: deviceId,
    video_url: trimmedVideoUrl,
    contact_type: input.contactType,
    contact_value: trimmedContactValue,
    created_at: createdAt,
  });
  if (error) {
    console.warn('[creatorSubmissions] insert failed', error);
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }

  const submission: CreatorSubmission = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    created_at: createdAt,
    video_url: trimmedVideoUrl,
    contact_type: input.contactType,
    contact_value: trimmedContactValue,
    status: 'pending',
  };
  await cacheSubmission(submission);
  return { ok: true, submission };
}
