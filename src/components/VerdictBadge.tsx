import { Text, View } from 'react-native';

import { verdictColors } from '../../constants/mamaTheme';
import { getAppLanguage, t } from '../lib/i18n';
import type { Verdict } from '../types/scan';

const VERDICT_STYLES: Record<
  Verdict,
  { key: 'verdict.good' | 'verdict.sometimes' | 'verdict.avoid' | 'verdict.unknown'; backgroundColor: string; color: string }
> = {
  good: {
    key: 'verdict.good',
    backgroundColor: verdictColors.good.bg,
    color: verdictColors.good.text,
  },
  sometimes: {
    key: 'verdict.sometimes',
    backgroundColor: verdictColors.sometimes.bg,
    color: verdictColors.sometimes.text,
  },
  avoid: {
    key: 'verdict.avoid',
    backgroundColor: verdictColors.avoid.bg,
    color: verdictColors.avoid.text,
  },
  unknown: {
    key: 'verdict.unknown',
    backgroundColor: verdictColors.unknown.bg,
    color: verdictColors.unknown.text,
  },
};

type VerdictBadgeProps = {
  verdict: Verdict;
};

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  const lang = getAppLanguage();
  const config = VERDICT_STYLES[verdict];

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        alignSelf: 'flex-start',
        backgroundColor: config.backgroundColor,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: config.color }}>{t(config.key, lang)}</Text>
    </View>
  );
}
