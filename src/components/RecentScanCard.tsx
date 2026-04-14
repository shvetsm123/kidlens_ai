import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import type { RecentScan } from '../types/scan';
import { VerdictBadge } from './VerdictBadge';

type RecentScanCardProps = {
  scan: RecentScan;
  onPress: (scanId: string) => void;
};

export function RecentScanCard({ scan, onPress }: RecentScanCardProps) {
  return (
    <Pressable
      onPress={() => onPress(scan.id)}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={({ pressed }) => ({
        borderRadius: 18,
        backgroundColor: '#FFFDF8',
        padding: 16,
        shadowColor: '#9B8D7A',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: 2,
        flexDirection: 'row',
        gap: 14,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {scan.imageUrl ? (
        <Image
          source={{ uri: scan.imageUrl }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            backgroundColor: '#F0E8DC',
          }}
          contentFit="cover"
        />
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F1A16', flex: 1 }} numberOfLines={1}>
            {scan.productName}
          </Text>
          <VerdictBadge verdict={scan.verdict} />
        </View>
        {!!scan.brand && (
          <Text style={{ marginTop: 6, fontSize: 13, color: '#7A6E61' }} numberOfLines={1}>
            {scan.brand}
          </Text>
        )}
        <Text style={{ marginTop: 10, fontSize: 14, lineHeight: 20, color: '#50463C' }} numberOfLines={2}>
          {scan.summary}
        </Text>
        <Text style={{ marginTop: 10, fontSize: 12, color: '#958676' }}>Barcode: {scan.barcode}</Text>
      </View>
    </Pressable>
  );
}
