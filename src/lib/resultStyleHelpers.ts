import type { ResultStyle } from '../types/preferences';
import type { AiResult } from '../types/ai';
import type { Verdict } from '../types/scan';
import { clampFinalVerdictToBase } from './preferenceMatchers';

const VERDICTS: readonly Verdict[] = ['good', 'sometimes', 'avoid', 'unknown'];

function isVerdict(value: unknown): value is Verdict {
  return typeof value === 'string' && (VERDICTS as readonly string[]).includes(value);
}

function isStringArray(value: unknown, maxLen: number): value is string[] {
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length > maxLen) {
    return false;
  }
  return value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

function parsePreferenceMatches(raw: unknown): string[] | null {
  if (raw == null) {
    return [];
  }
  if (!isStringArray(raw, 12)) {
    return null;
  }
  return (raw as string[]).map((s) => s.trim());
}

function capIngredientBreakdownParagraphs(parts: string[]): string[] | null {
  if (parts.length < 2) {
    return null;
  }
  return parts.slice(0, 3);
}

function parseIngredientBreakdownParagraphs(raw: unknown): string[] | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw === 'string') {
    const parts = raw
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 12);
    return capIngredientBreakdownParagraphs(parts);
  }
  if (Array.isArray(raw) && raw.length > 0 && raw.every((x) => typeof x === 'string')) {
    const parts = (raw as string[]).map((s) => s.trim()).filter((s) => s.length >= 12);
    return capIngredientBreakdownParagraphs(parts);
  }
  return null;
}

function parseAllergyNotesList(raw: unknown): string[] {
  if (raw == null) {
    return [];
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    return t ? [t] : [];
  }
  if (isStringArray(raw, 8)) {
    return (raw as string[]).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Validates one canonical AI JSON object (verdict + all depth fields). Returns null if invalid.
 */
export function normalizeCanonicalAiPayload(raw: unknown, ruleBasedBaseVerdict: Verdict): AiResult | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;

  const finalRaw = o.finalVerdict ?? o.verdict;
  const proposedFinal = isVerdict(finalRaw) ? finalRaw : null;
  if (!proposedFinal) {
    return null;
  }
  const verdict = clampFinalVerdictToBase(ruleBasedBaseVerdict, proposedFinal);
  if (typeof o.summary !== 'string' || !o.summary.trim()) {
    return null;
  }
  if (!Array.isArray(o.reasons) || o.reasons.length !== 3) {
    return null;
  }
  const reasons = o.reasons.map((r) => (typeof r === 'string' ? r.trim() : ''));
  if (reasons.some((r) => !r)) {
    return null;
  }

  const summary = o.summary.trim();
  const preferenceMatches = parsePreferenceMatches(o.preferenceMatches);
  if (preferenceMatches === null) {
    return null;
  }

  const whyRaw = o.whyText;
  const whyText = typeof whyRaw === 'string' && whyRaw.trim().length >= 20 && whyRaw.trim().length <= 720 ? whyRaw.trim() : undefined;
  if (!whyText) {
    return null;
  }

  const ingredientBreakdown = parseIngredientBreakdownParagraphs(o.ingredientBreakdown ?? o.ingredientNotes);
  if (!ingredientBreakdown) {
    return null;
  }

  const parentTakeawayRaw = o.parentTakeaway;
  const parentTakeaway =
    typeof parentTakeawayRaw === 'string' && parentTakeawayRaw.trim().length >= 8 && parentTakeawayRaw.trim().length <= 220
      ? parentTakeawayRaw.trim()
      : undefined;
  if (!parentTakeaway) {
    return null;
  }

  const allergyNotes = parseAllergyNotesList(o.allergyNotes);

  return {
    baseVerdict: ruleBasedBaseVerdict,
    verdict,
    summary,
    reasons,
    preferenceMatches,
    whyText,
    ingredientBreakdown,
    allergyNotes,
    parentTakeaway,
  };
}

/** First sentence (or capped fragment) of canonical whyText for Quick mode only. */
export function shortWhyForQuick(fullWhy: string | undefined): string {
  const t = fullWhy?.trim() ?? '';
  if (!t) {
    return '';
  }
  const m = t.match(/^.{1,240}?[.!?](?=\s|$)/);
  if (m) {
    return m[0].trim();
  }
  return t.length > 200 ? `${t.slice(0, 199).trim()}…` : t;
}

export function whyTextForResultStyle(fullWhy: string | undefined, mode: ResultStyle): string {
  if (mode === 'quick') {
    return shortWhyForQuick(fullWhy);
  }
  return fullWhy?.trim() ?? '';
}
