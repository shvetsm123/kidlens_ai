import type { NormalizedProduct } from '../api/openFoodFacts';
import type { AppLanguage } from './deviceLanguage';
import type { AvoidPreference, ResultStyle } from '../types/preferences';
import type { KidsAiInput } from '../types/ai';
import type { Verdict } from '../types/scan';
import type { ChildAgeProfile } from './childAgeContext';

export function buildAiInput(
  profile: ChildAgeProfile,
  product: NormalizedProduct,
  avoidPreferences: AvoidPreference[],
  resultStyle: ResultStyle,
  ruleBasedBaseVerdict: Verdict,
  outputLanguage: AppLanguage,
): KidsAiInput {
  const age = profile.completedWholeYears;

  const base: KidsAiInput = {
    mode: 'kids',
    childAge: age,
    childAgeProfile: profile,
    ruleBasedBaseVerdict,
    resultStyle,
    outputLanguage,
    product: {
      barcode: product.barcode,
      productName: product.productName,
      brand: product.brand,
      ingredientsText: product.ingredientsText,
      categories: product.categories,
      imageUrl: product.imageUrl,
      allergensText: product.allergensText,
      nutriments: product.nutriments,
    },
  };

  if (avoidPreferences.length > 0) {
    return { ...base, avoidPreferences };
  }

  return base;
}
