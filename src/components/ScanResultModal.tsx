import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import type { AvoidPreference, Plan, ResultStyle } from '../types/preferences';
import type { RecentScan } from '../types/scan';
import { whyTextForResultStyle } from '../lib/resultStyleHelpers';
import { VerdictBadge } from './VerdictBadge';

type ScanResultModalProps = {
  visible: boolean;
  scan: RecentScan | null;
  resultStyle: ResultStyle;
  plan: Plan;
  avoidPreferences: AvoidPreference[];
  isFavorited: boolean;
  favoriteLoading: boolean;
  onFavoritePress: () => void;
  onClose: () => void;
  onScanAgain: () => void;
  onOpenPaywall: () => void;
  reuseNotice?: string | null;
};

export function ScanResultModal({
  visible,
  scan,
  resultStyle,
  plan,
  avoidPreferences,
  isFavorited,
  favoriteLoading,
  onFavoritePress,
  onClose,
  onScanAgain,
  onOpenPaywall,
  reuseNotice,
}: ScanResultModalProps) {
  const detailedBlocked = resultStyle === 'detailed' && plan !== 'insights';
  const mode: ResultStyle = detailedBlocked ? 'balanced' : resultStyle;
  const preferenceLines = scan?.preferenceMatches?.filter(Boolean) ?? [];
  const showAvoidSection = avoidPreferences.length > 0 && preferenceLines.length > 0;
  const ingredientParagraphs = (
    scan?.ingredientBreakdown?.filter((p) => typeof p === 'string' && p.trim()) ?? []
  ).slice(0, 3);
  const allergyLines = scan?.allergyNotes?.filter((p) => typeof p === 'string' && p.trim()) ?? [];
  const whyDisplay = whyTextForResultStyle(scan?.whyText, mode);
  const favoriteDisabled = favoriteLoading || !scan;
  const isUnknownNotFound =
    scan != null &&
    scan.verdict === 'unknown' &&
    String(scan.productName ?? '').trim() === 'Unknown product';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      {...(Platform.OS === 'ios' ? { presentationStyle: 'overFullScreen' as const } : {})}
      onRequestClose={onClose}
    >
      <View
        pointerEvents="box-none"
        style={{
          flex: 1,
          backgroundColor: 'rgba(23, 18, 12, 0.44)',
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            borderRadius: 24,
            backgroundColor: '#FFFDF8',
            maxHeight: '88%',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 10 },
            elevation: 5,
          }}
        >
          {scan?.imageUrl ? (
            <Image
              source={{ uri: scan.imageUrl }}
              style={{ width: '100%', height: 168, backgroundColor: '#F0E8DC' }}
              contentFit="contain"
            />
          ) : null}

          <ScrollView
            style={{ maxHeight: scan?.imageUrl ? undefined : '100%' }}
            contentContainerStyle={{ padding: 20, paddingBottom: 22 }}
            keyboardShouldPersistTaps="handled"
          >
            {isUnknownNotFound ? (
              <>
                <Text style={{ fontSize: 13, color: '#8C7B6A', fontWeight: '600' }}>Scan result</Text>
                <Text
                  style={{
                    marginTop: 14,
                    fontSize: 26,
                    lineHeight: 32,
                    color: '#1F1A16',
                    fontWeight: '700',
                  }}
                >
                  Unknown product
                </Text>
                <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 22, color: '#5D5246' }}>
                  We couldn’t identify this barcode. Make sure it’s clearly visible, then try again.
                </Text>
                <Text style={{ marginTop: 14, fontSize: 13, color: '#817363' }}>Barcode: {scan?.barcode ?? '-'}</Text>
                <View style={{ marginTop: 24, flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={onClose}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      backgroundColor: '#EEE4D7',
                      alignItems: 'center',
                      paddingVertical: 13,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#5B4A38' }}>Close</Text>
                  </Pressable>
                  <Pressable
                    onPress={onScanAgain}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      backgroundColor: '#2C251F',
                      alignItems: 'center',
                      paddingVertical: 13,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFDF9' }}>Try again</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 13, color: '#8C7B6A', fontWeight: '600' }}>Scan result</Text>
                {reuseNotice ? (
                  <View
                    style={{
                      marginTop: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: '#F4EDE3',
                      borderWidth: 1,
                      borderColor: '#E4D9CC',
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#7A6B5E', fontWeight: '600', textAlign: 'center' }}>
                      {reuseNotice}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={{
                    marginTop: 8,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 14,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 25,
                      lineHeight: 30,
                      color: '#1F1A16',
                      fontWeight: '700',
                    }}
                  >
                    {scan?.productName ?? 'Product'}
                  </Text>
                  {scan ? (
                    <Pressable
                      onPress={onFavoritePress}
                      disabled={favoriteDisabled}
                      accessibilityRole="button"
                      accessibilityLabel={
                        plan === 'insights'
                          ? isFavorited
                            ? 'Remove from favorites'
                            : 'Add to favorites'
                          : 'Favorites with Insights'
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: plan === 'insights' && isFavorited ? '#F8EDED' : '#F5F0E8',
                        borderWidth: 1,
                        borderColor: plan === 'insights' && isFavorited ? '#E8C4C4' : '#E6DDD4',
                        opacity: favoriteDisabled ? 0.5 : 1,
                      }}
                    >
                      <Ionicons
                        name={plan === 'insights' && isFavorited ? 'heart' : 'heart-outline'}
                        size={22}
                        color={plan !== 'insights' ? '#B59B7A' : isFavorited ? '#B85C5C' : '#6D6053'}
                      />
                    </Pressable>
                  ) : null}
                </View>
                {!!scan?.brand && (
                  <Text style={{ marginTop: 6, fontSize: 15, color: '#6D6053', fontWeight: '600' }}>{scan.brand}</Text>
                )}
                <Text style={{ marginTop: 8, fontSize: 13, color: '#817363' }}>Barcode: {scan?.barcode ?? '-'}</Text>

                {detailedBlocked ? (
              <View
                style={{
                  marginTop: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 16,
                  backgroundColor: '#F4EDE3',
                  borderWidth: 1,
                  borderColor: '#E0D0BC',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#5B4A38', lineHeight: 20 }}>
                  Detailed checks are part of Insights.
                </Text>
                <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 19, color: '#6D6053' }}>
                  Showing balanced detail until you upgrade.
                </Text>
                <Pressable
                  onPress={onOpenPaywall}
                  style={{
                    marginTop: 12,
                    alignSelf: 'flex-start',
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: '#2C251F',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFDF9' }}>View plans</Text>
                </Pressable>
              </View>
            ) : null}

            {scan ? (
              <View style={{ marginTop: 14 }}>
                <VerdictBadge verdict={scan.verdict} />
              </View>
            ) : null}

            <Text style={{ marginTop: 14, fontSize: 15, lineHeight: 22, color: '#4F453B' }}>{scan?.summary ?? ''}</Text>

            <View style={{ marginTop: 14, gap: 8 }}>
              {(scan?.reasons ?? []).map((reason, index) => (
                <Text key={`${reason}-${index}`} style={{ fontSize: 14, color: '#5D5246', lineHeight: 20 }}>
                  • {reason}
                </Text>
              ))}
            </View>

            {showAvoidSection ? (
              <View
                style={{
                  marginTop: 16,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: '#F7EFE3',
                  borderWidth: 1,
                  borderColor: '#E2D0B8',
                  borderLeftWidth: 4,
                  borderLeftColor: '#C9A06E',
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#4A3828', letterSpacing: 0.2 }}>
                  Matches your avoid list
                </Text>
                {preferenceLines.map((line, index) => (
                  <Text key={`${line}-${index}`} style={{ fontSize: 14, color: '#5C4A38', lineHeight: 20, fontWeight: '600' }}>
                    • {line}
                  </Text>
                ))}
              </View>
            ) : null}

            {whyDisplay ? (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#7D6B58' }}>Why this result</Text>
                <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 21, color: '#5D5246' }}>{whyDisplay}</Text>
              </View>
            ) : null}

            {mode === 'balanced' && scan?.parentTakeaway ? (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#7D6B58' }}>Parent takeaway</Text>
                <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 21, color: '#5D5246' }}>{scan.parentTakeaway}</Text>
              </View>
            ) : null}

            {mode === 'detailed' && ingredientParagraphs.length > 0 ? (
              <View
                style={{
                  marginTop: 18,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: '#E8DFD4',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B5C4A' }}>Ingredient breakdown</Text>
                <View style={{ marginTop: 10, gap: 14 }}>
                  {ingredientParagraphs.map((para, index) => (
                    <Text
                      key={`${index}-${para.slice(0, 24)}`}
                      style={{ fontSize: 15, lineHeight: 23, color: '#4F453B' }}
                    >
                      {para}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}

            {mode === 'detailed' && allergyLines.length > 0 ? (
              <View style={{ marginTop: 18 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#7D6B58' }}>Allergy notes</Text>
                <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 22, color: '#5D5246' }}>
                  {allergyLines.join(' ')}
                </Text>
              </View>
            ) : null}

            {mode === 'detailed' && scan?.parentTakeaway ? (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#7D6B58' }}>Parent takeaway</Text>
                <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 21, color: '#5D5246' }}>{scan.parentTakeaway}</Text>
              </View>
            ) : null}

                <View style={{ marginTop: 20, flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={onClose}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      backgroundColor: '#EEE4D7',
                      alignItems: 'center',
                      paddingVertical: 13,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#5B4A38' }}>Close</Text>
                  </Pressable>
                  <Pressable
                    onPress={onScanAgain}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      backgroundColor: '#2C251F',
                      alignItems: 'center',
                      paddingVertical: 13,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFDF9' }}>Scan again</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
