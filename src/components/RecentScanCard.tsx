import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { M } from '../../constants/mamaTheme';
import type { RecentScan } from '../types/scan';
import { VerdictBadge } from './VerdictBadge';

function hasProductImageUrl(value: unknown): boolean {
  if (value == null) {
    return false;
  }
  const s = String(value).trim();
  if (!s) {
    return false;
  }
  const lower = s.toLowerCase();
  if (lower === 'null' || lower === 'undefined') {
    return false;
  }
  return /^https?:\/\//i.test(s);
}

type RecentScanCardProps = {
  scan: RecentScan;
  onPress: (scanId: string) => void;
};

function cardToneForVerdict(verdict: RecentScan['verdict']): { bg: string; border: string; dot: string } {
  if (verdict === 'good') {
    return { bg: '#EAF4EE', border: '#CDE2D5', dot: '#3D8B5B' };
  }
  if (verdict === 'sometimes') {
    return { bg: '#FFF4D8', border: '#E8C989', dot: '#C58A1A' };
  }
  if (verdict === 'avoid') {
    return { bg: '#FCEAEA', border: '#E8C7C7', dot: '#B85C5C' };
  }
  return { bg: M.bgCard, border: M.line, dot: M.lineStrong };
}

function RecentScanCardBody({ scan, dotColor }: { scan: RecentScan; dotColor: string }) {
  return (
    <View style={{ width: '100%', flexDirection: 'row', gap: 10 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          backgroundColor: dotColor,
          marginTop: 6,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ flexShrink: 1, fontSize: 16, fontWeight: '700', color: M.text }} numberOfLines={1}>
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
    </View>
  );
}

export function RecentScanCard({ scan, onPress }: RecentScanCardProps) {
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    setThumbFailed(false);
  }, [scan.id, scan.imageUrl]);

  const showThumb = hasProductImageUrl(scan.imageUrl) && !thumbFailed;
  const tone = cardToneForVerdict(scan.verdict);

  const baseStyle = (pressed: boolean) => ({
    borderRadius: M.r18,
    backgroundColor: tone.bg,
    padding: 16,
    borderWidth: 1,
    borderColor: tone.border,
    ...M.shadowSoft,
    opacity: pressed ? 0.92 : 1,
  });

  if (!showThumb) {
    return (
      <Pressable
        onPress={() => onPress(scan.id)}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        style={({ pressed }) => ({
          ...baseStyle(pressed),
          flexDirection: 'column',
          alignSelf: 'stretch',
          width: '100%',
        })}
      >
        <RecentScanCardBody scan={scan} dotColor={tone.dot} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(scan.id)}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={({ pressed }) => ({
        ...baseStyle(pressed),
        flexDirection: 'row',
        alignSelf: 'stretch',
        width: '100%',
        gap: 14,
      })}
    >
      <Image
        source={{ uri: String(scan.imageUrl).trim() }}
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
        }}
        contentFit="cover"
        onError={() => setThumbFailed(true)}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <RecentScanCardBody scan={scan} dotColor={tone.dot} />
      </View>
    </Pressable>
  );
}
