import type { AiResult } from '../types/ai';
import type { Verdict } from '../types/scan';

export function getFallbackAiResult(ruleBasedBaseVerdict: Verdict = 'unknown'): AiResult {
  return {
    baseVerdict: ruleBasedBaseVerdict,
    verdict: ruleBasedBaseVerdict,
    summary: 'For this age, the check did not finish—try again.',
    reasons: ['AI unavailable', 'Try again', 'Limited details'],
    preferenceMatches: [],
    whyText:
      'We could not load a fresh evaluation from the product data. Please try again when you are online so we can explain the main signals for this age using only what the product listing shows.',
    ingredientBreakdown: [
      'We could not load fresh ingredient text for this scan, so this breakdown cannot describe sugar, the main base, or how simple versus prepared the product looks.',
      'When the listing is available again, expect a short, plain-language read on composition—what the product seems to be from the list, and how that lines up with everyday versus occasional choices for your child’s age.',
      'If product details stay limited, the wording should stay cautious rather than overconfident; nothing here replaces reading the label yourself.',
    ],
    allergyNotes: [],
    parentTakeaway: 'Try again when you have a connection.',
  };
}
