import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { M } from '../../constants/mamaTheme';
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
        borderRadius: M.r18,
        backgroundColor: M.bgCard,
        padding: 16,
        ...M.shadowSoft,
        flexDirection: 'row',
        gap: 14,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {scan.imageUrl?.trim() ? (
        <Image
          source={{ uri: scan.imageUrl.trim() }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            backgroundColor: M.bgCardMuted,
          }}
          contentFit="cover"
        />
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: M.text, flex: 1 }} numberOfLines={1}>
            {scan.productName}
          </Text>
          <VerdictBadge verdict={scan.verdict} />
        </View>
        {!!scan.brand && (
          <Text style={{ marginTop: 6, fontSize: 13, color: M.textMuted }} numberOfLines={1}>
            {scan.brand}
          </Text>
        )}
        <Text style={{ marginTop: 10, fontSize: 14, lineHeight: 20, color: M.textBody }} numberOfLines={2}>
          {scan.summary}
        </Text>
        <Text style={{ marginTop: 10, fontSize: 12, color: M.textSoft }}>Barcode: {scan.barcode}</Text>
      </View>
    </Pressable>
  );
}
