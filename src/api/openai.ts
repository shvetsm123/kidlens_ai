import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';

import { getFallbackAiResult } from '../lib/getFallbackAiResult';
import { normalizeCanonicalAiPayload } from '../lib/resultStyleHelpers';
import type { AiResult, KidsAiInput } from '../types/ai';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const LOG_PREFIX = '[OpenAI]';

const SYSTEM_PROMPT = `You write parent-facing explanations for ONE child food scan. Output JSON ONLY. No markdown.

AUTHORITATIVE VERDICTS (non-negotiable)
- The user JSON includes ruleBasedBaseVerdict: the app's hard rule outcome from age + product facts. You MUST NOT contradict it.
- You MUST set baseVerdict in your JSON to exactly the same string as ruleBasedBaseVerdict.
- finalVerdict: start from ruleBasedBaseVerdict. Apply avoidPreferences ONLY as extra constraints (same rules as before): if avoidPreferences is empty or nothing matches, finalVerdict MUST equal ruleBasedBaseVerdict. If a selected avoid clearly matches product text, finalVerdict may be stricter than ruleBasedBaseVerdict but NEVER more lenient. Unrelated avoids must not change the verdict.
- Your summary, reasons, whyText, and parentTakeaway MUST align with ruleBasedBaseVerdict and finalVerdict (e.g. under-two + avoid means clear, age-appropriate caution—never "usually fine").

CONTEXT
- resultStyle in the input is only for explanation depth in the app UI; it must NOT change any verdict.
- Use ONLY facts from product fields in the JSON. Never invent ingredients, nutrition numbers, or allergens.
- No medical claims or "safe/unsafe" promises.
- Never infer cow's milk / dairy from yogurt alone. Mention dairy only if explicit dairy terms exist in the text.

AVOID PREFERENCES
- If avoidPreferences is missing or empty: preferenceMatches MUST be []. finalVerdict MUST equal ruleBasedBaseVerdict.
- If avoidPreferences is non-empty: only list preferenceMatches when clearly supported by product text and the selected topic. Otherwise [] and finalVerdict equals ruleBasedBaseVerdict.

SUMMARY & REASONS
- summary: one short parent-facing sentence consistent with the verdicts above.
- reasons: exactly 3 short tag-like phrases (2–4 words each), no trailing punctuation.

CANONICAL OUTPUT (always include every key)
{
  "baseVerdict": "good"|"sometimes"|"avoid"|"unknown",
  "finalVerdict": "good"|"sometimes"|"avoid"|"unknown",
  "summary": string,
  "reasons": [string, string, string],
  "preferenceMatches": string[],
  "whyText": string (1–2 short sentences; must reflect ruleBasedBaseVerdict; do not repeat the summary verbatim),
  "ingredientBreakdown": string[] (exactly 2 or 3 strings; see INGREDIENT BREAKDOWN below),
  "allergyNotes": string[] (empty if no allergensText and no clear allergen tokens; otherwise 1–3 short factual lines),
  "parentTakeaway": string (one short closing line for parents)
}

INGREDIENT BREAKDOWN
- Exactly 2 or 3 array items; each item one short readable paragraph grounded in listing facts. If details are thin, say so cautiously.

When writing whyText, reflect the strongest factual drivers behind ruleBasedBaseVerdict (sugar/sweetening, product type, caffeine, sweeteners, data limits). Mention the parent's avoid list only when preferenceMatches is non-empty.`;

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch (parseErr) {
    console.warn(LOG_PREFIX, 'JSON.parse assistant content failed:', parseErr);
    return null;
  }
}

function getOpenAiChatUrl(): string {
  if (Platform.OS === 'web' && typeof __DEV__ !== 'undefined' && __DEV__) {
    return '/__openai/v1/chat/completions';
  }
  return OPENAI_CHAT_URL;
}

export async function evaluateProductWithAi(input: KidsAiInput): Promise<AiResult> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const keyPresent = typeof apiKey === 'string' && !!apiKey.trim();
  console.warn(LOG_PREFIX, 'EXPO_PUBLIC_OPENAI_API_KEY present:', keyPresent);

  const ruleBase = input.ruleBasedBaseVerdict;

  if (!keyPresent) {
    console.warn(LOG_PREFIX, 'using fallback: missing API key');
    return getFallbackAiResult(ruleBase);
  }

  const requestUrl = getOpenAiChatUrl();
  console.warn(LOG_PREFIX, 'request URL:', requestUrl);

  try {
    const response = await expoFetch(requestUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.25,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Evaluate this input. Reply with JSON only:\n${JSON.stringify(input)}`,
          },
        ],
      }),
    });

    console.warn(LOG_PREFIX, 'response status:', response.status);

    const rawText = await response.text();
    console.warn(LOG_PREFIX, 'raw response text:', rawText);

    if (!response.ok) {
      console.warn(LOG_PREFIX, 'using fallback: HTTP not OK, status', response.status);
      return getFallbackAiResult(ruleBase);
    }

    let data: { choices?: { message?: { content?: string } }[] };
    try {
      data = JSON.parse(rawText) as { choices?: { message?: { content?: string } }[] };
    } catch (parseBodyErr) {
      console.warn(LOG_PREFIX, 'using fallback: failed to parse response body as JSON:', parseBodyErr);
      return getFallbackAiResult(ruleBase);
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      console.warn(LOG_PREFIX, 'using fallback: missing or empty choices[0].message.content');
      return getFallbackAiResult(ruleBase);
    }

    const parsed = parseJson(content.trim());
    const evaluation = normalizeCanonicalAiPayload(parsed, ruleBase);
    if (!evaluation) {
      console.warn(LOG_PREFIX, 'using fallback: evaluation JSON failed validation', { parsed });
      return getFallbackAiResult(ruleBase);
    }
    const hadAvoidPrefs = Array.isArray(input.avoidPreferences) && input.avoidPreferences.length > 0;
    if (!hadAvoidPrefs) {
      return {
        ...evaluation,
        preferenceMatches: [],
        verdict: evaluation.baseVerdict,
      };
    }
    return evaluation;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(LOG_PREFIX, 'caught error:', message, err);
    console.warn(LOG_PREFIX, 'using fallback after error');
    return getFallbackAiResult(ruleBase);
  }
}
