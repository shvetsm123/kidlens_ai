import type { AvoidPreference, ResultStyle } from './preferences';
import type { Verdict } from './scan';

/** Single canonical model output per product (same verdict for all display modes). */
export type AiResult = {
  /** Verdict from child age + product facts only (ignore avoid list). */
  baseVerdict: Verdict;
  /** Shown verdict after preference conflicts; never more lenient than baseVerdict. */
  verdict: Verdict;
  summary: string;
  reasons: string[];
  preferenceMatches: string[];
  whyText: string;
  /** 2–3 composition paragraphs for Detailed mode (calm, child-focused; facts from product fields only). */
  ingredientBreakdown: string[];
  allergyNotes: string[];
  parentTakeaway: string;
};

export type KidsAiInput = {
  mode: 'kids';
  childAge: number;
  /** App-enforced verdict from rule engine; AI must not contradict. */
  ruleBasedBaseVerdict: Verdict;
  /** Shown result depth; does not change verdict. */
  resultStyle: ResultStyle;
  /** Omitted when the parent has not selected any avoid topics. */
  avoidPreferences?: AvoidPreference[];
  product: {
    barcode: string;
    productName: string;
    brand?: string;
    ingredientsText?: string;
    categories?: string[];
    imageUrl?: string;
    allergensText?: string;
  };
};

export type { Plan } from './preferences';

/** Row shape for home favorites list (Supabase-backed). */
export type FavoriteListItem = {
  favoriteId: string;
  productId: string;
  createdAt: string;
  barcode: string;
  productName: string;
  brand: string | null;
  imageUrl: string | null;
};
