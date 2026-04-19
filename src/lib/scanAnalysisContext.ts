import type { AvoidPreference } from '../types/preferences';
import type { RecentScan } from '../types/scan';

/**
 * @param ageContextSegment from `serializeChildAgePreferenceForContext` (e.g. `d:2024-01-02`, `y:4`, `na`).
 */
export function buildScanAnalysisContextKey(
  barcode: string,
  ageContextSegment: string,
  avoidPreferences: AvoidPreference[],
): string {
  const b = barcode.trim();
  const age = ageContextSegment.trim() || 'na';
  const sorted = [...avoidPreferences].slice().sort().join(',');
  return `${b}::${age}::${sorted}`;
}

/** Middle segment of `analysisContextKey` (birthdate `d:…`, legacy `y:N`, historic plain integer year, or `na`). */
export function extractAgeContextSegmentFromKey(key: string | undefined): string | null {
  if (!key || typeof key !== 'string') {
    return null;
  }
  const seg = key.split('::')[1];
  if (!seg || seg === 'na') {
    return null;
  }
  return seg;
}

/** Newest-first list: returns first saved scan that matches barcode + analysis context (non-unknown). */
export function findRecentScanForReuse(
  scans: RecentScan[],
  barcode: string,
  contextKey: string,
): RecentScan | null {
  const b = barcode.trim();
  for (const s of scans) {
    if (s.barcode.trim() !== b) {
      continue;
    }
    if (s.verdict === 'unknown') {
      continue;
    }
    if (!s.analysisContextKey || s.analysisContextKey !== contextKey) {
      continue;
    }
    return s;
  }
  return null;
}
