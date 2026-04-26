import { Text, View } from 'react-native';

import { verdictColors } from '../../constants/mamaTheme';
import { getAppLanguage, t } from '../lib/i18n';
import type { Verdict } from '../types/scan';

const VERDICT_STYLES: Record<
  Verdict,
  {
    key: 'verdict.good' | 'verdict.sometimes' | 'verdict.avoid' | 'verdict.unknown';
    backgroundColor: string;
    borderColor: string;
    color: string;
  }
> = {
  good: {
    key: 'verdict.good',
    backgroundColor: verdictColors.good.bg,
    borderColor: '#BBD9C6',
    color: '#245335',
  },
  sometimes: {
    key: 'verdict.sometimes',
    backgroundColor: verdictColors.sometimes.bg,
    borderColor: '#E3C18B',
    color: '#6B4310',
  },
  avoid: {
    key: 'verdict.avoid',
    backgroundColor: verdictColors.avoid.bg,
    borderColor: '#E1BDBD',
    color: '#6F2525',
  },
  unknown: {
    key: 'verdict.unknown',
    backgroundColor: verdictColors.unknown.bg,
    borderColor: '#D6D1CB',
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
        borderWidth: 1,
        borderColor: config.borderColor,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '800', color: config.color }}>{t(config.key, lang)}</Text>
    </View>
  );
}
