/** Derives scan / analysis age fields from `child_birthdate` with legacy `child_age` fallback. */

import { extractAgeContextSegmentFromKey } from './scanAnalysisContext';

export type AgeBucketId = 'm0_5' | 'm6_7' | 'm8_11' | 'm12_23' | 'y2_3' | 'y4_6' | 'y7_plus';

export type ChildAgeProfileSource = 'birthdate' | 'legacy_age' | 'default';

export type ChildAgeProfile = {
  source: ChildAgeProfileSource;
  childBirthdate: string | null;
  legacyChildAgeYears: number | null;
  /** Completed months since birth when birthdate is known; otherwise null (legacy coarse years). */
  ageInMonths: number | null;
  /** Average years (ageInMonths / 12 when months known, else legacy integer). */
  ageInYears: number;
  ageDisplayLabel: string;
  ageBucket: AgeBucketId;
  /** Floored whole years — used for coarse prompts and legacy storage. */
  completedWholeYears: number;
  isUnder24Months: boolean;
};

const DEFAULT_COMPLETED_YEARS = 4;

export function isValidIsoDateOnly(raw: string | null | undefined): raw is string {
  if (raw == null || typeof raw !== 'string') {
    return false;
  }
  const s = raw.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) {
    return false;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return false;
  }
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return false;
  }
  return true;
}

export function parseBirthdateToLocalNoon(iso: string): Date | null {
  if (!isValidIsoDateOnly(iso)) {
    return null;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())!;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

export function formatLocalDateToIso(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export function calendarMonthsBetweenBirthAndRef(birth: Date, ref: Date): number {
  let months = (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth());
  if (ref.getDate() < birth.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

export function ageBucketFromTotalMonths(totalMonths: number): AgeBucketId {
  if (totalMonths <= 5) {
    return 'm0_5';
  }
  if (totalMonths <= 7) {
    return 'm6_7';
  }
  if (totalMonths <= 11) {
    return 'm8_11';
  }
  if (totalMonths <= 23) {
    return 'm12_23';
  }
  const y = Math.floor(totalMonths / 12);
  if (y <= 3) {
    return 'y2_3';
  }
  if (y <= 6) {
    return 'y4_6';
  }
  return 'y7_plus';
}

export function buildEnglishAgeDisplayLabel(totalMonths: number): string {
  if (!Number.isFinite(totalMonths) || totalMonths < 0) {
    return '';
  }
  if (totalMonths < 12) {
    if (totalMonths === 0) {
      return '0 months';
    }
    if (totalMonths === 1) {
      return '1 month';
    }
    return `${totalMonths} months`;
  }
  const y = Math.floor(totalMonths / 12);
  const mo = totalMonths % 12;
  if (totalMonths < 24) {
    if (mo === 0) {
      return y === 1 ? '1 year' : `${y} years`;
    }
    const yearPart = y === 1 ? '1 year' : `${y} years`;
    const monthPart = mo === 1 ? '1 month' : `${mo} months`;
    return `${yearPart} ${monthPart}`;
  }
  if (mo === 0) {
    return y === 1 ? '1 year' : `${y} years`;
  }
  const yearPart = y === 1 ? '1 year' : `${y} years`;
  const monthPart = mo === 1 ? '1 month' : `${mo} months`;
  return `${yearPart} ${monthPart}`;
}

export function serializeChildAgePreferenceForContext(profile: ChildAgeProfile): string {
  if (profile.childBirthdate && isValidIsoDateOnly(profile.childBirthdate)) {
    return `d:${profile.childBirthdate}`;
  }
  if (profile.legacyChildAgeYears != null && Number.isFinite(profile.legacyChildAgeYears)) {
    return `y:${Math.round(profile.legacyChildAgeYears)}`;
  }
  if (profile.source === 'default') {
    return `y:${DEFAULT_COMPLETED_YEARS}`;
  }
  return 'na';
}

export function parseBirthdateLegacyFromAgeContextSegment(seg: string | undefined): {
  birthdate: string | null;
  legacyYears: number | null;
} {
  if (!seg || seg === 'na') {
    return { birthdate: null, legacyYears: null };
  }
  const d = /^d:([0-9]{4}-[0-9]{2}-[0-9]{2})$/.exec(seg);
  if (d && isValidIsoDateOnly(d[1])) {
    return { birthdate: d[1], legacyYears: null };
  }
  const yPref = /^y:(-?\d+)$/.exec(seg);
  if (yPref) {
    const n = Number(yPref[1]);
    return { birthdate: null, legacyYears: Number.isFinite(n) ? n : null };
  }
  const n = Number(seg);
  if (Number.isFinite(n)) {
    return { birthdate: null, legacyYears: n };
  }
  return { birthdate: null, legacyYears: null };
}

export function childAgeProfileFromScanAnalysisKey(key: string | undefined, ref = new Date()): ChildAgeProfile {
  const seg = extractAgeContextSegmentFromKey(key);
  if (!seg) {
    return resolveChildAgeProfile(null, null, ref);
  }
  const { birthdate, legacyYears } = parseBirthdateLegacyFromAgeContextSegment(seg);
  return resolveChildAgeProfile(birthdate, legacyYears, ref);
}

/**
 * Primary resolver: `childBirthdateIso` wins; else approximate from legacy integer years; else default scan age.
 */
export function resolveChildAgeProfile(
  childBirthdateIso: string | null,
  legacyChildAgeYears: number | null,
  ref = new Date(),
): ChildAgeProfile {
  const birth = childBirthdateIso && isValidIsoDateOnly(childBirthdateIso) ? parseBirthdateToLocalNoon(childBirthdateIso) : null;
  if (birth) {
    if (ref.getTime() < birth.getTime()) {
      return resolveChildAgeProfile(null, legacyChildAgeYears, ref);
    }
    const ageInMonths = calendarMonthsBetweenBirthAndRef(birth, ref);
    const ageInYears = ageInMonths / 12;
    const completedWholeYears = Math.floor(ageInMonths / 12);
    const ageBucket = ageBucketFromTotalMonths(ageInMonths);
    return {
      source: 'birthdate',
      childBirthdate: childBirthdateIso!.trim(),
      legacyChildAgeYears: null,
      ageInMonths,
      ageInYears,
      ageDisplayLabel: buildEnglishAgeDisplayLabel(ageInMonths),
      ageBucket,
      completedWholeYears,
      isUnder24Months: ageInMonths < 24,
    };
  }

  if (legacyChildAgeYears != null && Number.isFinite(legacyChildAgeYears)) {
    const yInt = Math.round(legacyChildAgeYears);
    const approxMonths = Math.max(0, yInt * 12 + 6);
    const ageBucket = ageBucketFromTotalMonths(approxMonths);
    return {
      source: 'legacy_age',
      childBirthdate: null,
      legacyChildAgeYears: yInt,
      ageInMonths: null,
      ageInYears: yInt,
      ageDisplayLabel: yInt === 1 ? '1 year' : `${yInt} years`,
      ageBucket,
      completedWholeYears: yInt,
      isUnder24Months: yInt < 2,
    };
  }

  const monthsDefault = DEFAULT_COMPLETED_YEARS * 12;
  return {
    source: 'default',
    childBirthdate: null,
    legacyChildAgeYears: null,
    ageInMonths: monthsDefault,
    ageInYears: DEFAULT_COMPLETED_YEARS,
    ageDisplayLabel: `${DEFAULT_COMPLETED_YEARS} years`,
    ageBucket: 'y4_6',
    completedWholeYears: DEFAULT_COMPLETED_YEARS,
    isUnder24Months: false,
  };
}

export function legacyChildAgeYearsFromProfile(profile: ChildAgeProfile): number {
  if (profile.legacyChildAgeYears != null) {
    return profile.legacyChildAgeYears;
  }
  return profile.completedWholeYears;
}
