import type { AvoidPreference, Plan } from '../types/preferences';
import type { RecentScan } from '../types/scan';

export type AiResultReportDraft = {
  scan: RecentScan;
  childAge: number | null;
  avoidPreferences: AvoidPreference[];
  plan: Plan;
};

let currentDraft: AiResultReportDraft | null = null;

export function setAiResultReportDraft(draft: AiResultReportDraft): void {
  currentDraft = draft;
}

export function getAiResultReportDraft(): AiResultReportDraft | null {
  return currentDraft;
}

export function clearAiResultReportDraft(): void {
  currentDraft = null;
}
