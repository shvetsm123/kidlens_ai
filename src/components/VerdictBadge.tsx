import { Text, View } from 'react-native';

import type { Verdict } from '../types/scan';

const VERDICT_STYLES: Record<Verdict, { label: string; backgroundColor: string; color: string }> = {
  good: {
    label: 'Good',
    backgroundColor: '#E6F4EA',
    color: '#2E6C45',
  },
  sometimes: {
    label: 'Sometimes',
    backgroundColor: '#FCECD9',
    color: '#8A5A18',
  },
  avoid: {
    label: 'Avoid',
    backgroundColor: '#F8E1E1',
    color: '#8A2D2D',
  },
  unknown: {
    label: 'Unknown',
    backgroundColor: '#ECECEC',
    color: '#5D5D5D',
  },
};

type VerdictBadgeProps = {
  verdict: Verdict;
};

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
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
      <Text style={{ fontSize: 12, fontWeight: '700', color: config.color }}>{config.label}</Text>
    </View>
  );
}
