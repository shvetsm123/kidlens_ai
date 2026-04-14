import type { Verdict } from '../types/scan';

/** Higher = stricter / more caution (final must not be below base on this scale). */
const STRICTNESS: Record<Verdict, number> = {
  good: 0,
  sometimes: 1,
  unknown: 1,
  avoid: 2,
};

export function verdictStrictness(v: Verdict): number {
  return STRICTNESS[v];
}

/**
 * Avoid preferences only add constraints: the final verdict may stay the same or become stricter,
 * never more lenient than the base product verdict.
 */
export function clampFinalVerdictToBase(base: Verdict, proposedFinal: Verdict): Verdict {
  if (verdictStrictness(proposedFinal) < verdictStrictness(base)) {
    return base;
  }
  return proposedFinal;
}
