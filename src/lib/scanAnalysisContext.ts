import type { AvoidPreference, ResultStyle } from '../types/preferences';
import type { RecentScan } from '../types/scan';

export function buildScanAnalysisContextKey(
  barcode: string,
  childAge: number | null,
  resultStyle: ResultStyle,
  avoidPreferences: AvoidPreference[],
): string {
  const b = barcode.trim();
  const age = childAge == null || !Number.isFinite(childAge) ? 'na' : String(Math.round(childAge));
  const sorted = [...avoidPreferences].slice().sort().join(',');
  return `${b}::${age}::${resultStyle}::${sorted}`;
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
