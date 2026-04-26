import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { M } from '../constants/mamaTheme';
import { getSupabase, submitAiResultReport } from '../src/api/supabase';
import { clearAiResultReportDraft, getAiResultReportDraft } from '../src/lib/aiResultReportDraft';
import { getOrCreateDeviceId } from '../src/lib/device';
import { getCachedSupabaseProfileId, getChildBirthdate, getResultStyle } from '../src/lib/storage';

const REPORT_REASONS = ['Wrong verdict', 'Wrong ingredients', 'Product info is wrong', 'Other'] as const;

type ReportReason = (typeof REPORT_REASONS)[number];

export default function ReportResultScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [draft] = useState(() => getAiResultReportDraft());
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scan = draft?.scan ?? null;

  const goBack = () => {
    clearAiResultReportDraft();
    router.back();
  };

  const onSubmit = async () => {
    if (!draft || !scan || submitting) {
      return;
    }
    const client = getSupabase();
    if (!client) {
      setErrorMessage('Couldn’t send report. Please try again.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const [profileId, deviceId, childBirthdate, resultStyle] = await Promise.all([
        getCachedSupabaseProfileId(),
        getOrCreateDeviceId(),
        getChildBirthdate(),
        getResultStyle(),
      ]);

      await submitAiResultReport(client, {
        profile_id: profileId,
        device_id: deviceId,
        barcode: scan.barcode?.trim() || null,
        product_name: scan.productName?.trim() || null,
        brand: scan.brand?.trim() || null,
        reason,
        note: note.trim() || null,
        result: scan,
        preferences: {
          child_age: draft.childAge,
          child_birthdate: childBirthdate,
          avoid_preferences: draft.avoidPreferences,
          result_style: resultStyle,
          plan: draft.plan,
        },
      });

      clearAiResultReportDraft();
      Alert.alert('Thanks — we’ll review this result.', undefined, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      console.warn('[AIResultReport] submit failed', err);
      setErrorMessage('Couldn’t send report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M.bgPage }} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 56 }}
        >
          <Pressable
            onPress={goBack}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              paddingVertical: 8,
              paddingRight: 12,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 17, color: M.textMuted, fontWeight: '700', marginRight: 6 }}>←</Text>
            <Text style={{ fontSize: 16, color: M.textMuted, fontWeight: '600' }}>Back</Text>
          </Pressable>

          <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: '800', color: M.text }}>Report this result</Text>
          <Text style={{ marginTop: 7, fontSize: 15, lineHeight: 21, color: M.textMuted }}>What seems wrong?</Text>

          {!draft || !scan ? (
            <View
              style={{
                marginTop: 24,
                borderRadius: M.r20,
                backgroundColor: M.bgCard,
                borderWidth: 1,
                borderColor: M.line,
                paddingVertical: 18,
                paddingHorizontal: 18,
                ...M.shadowSoft,
              }}
            >
              <Text style={{ fontSize: 15, lineHeight: 22, color: M.textBody }}>
                There is no result ready to report. Please go back and open a scan result again.
              </Text>
            </View>
          ) : (
            <>
              <View
                style={{
                  marginTop: 24,
                  borderRadius: M.r20,
                  backgroundColor: M.bgCard,
                  borderWidth: 1,
                  borderColor: M.line,
                  paddingVertical: 17,
                  paddingHorizontal: 17,
                  ...M.shadowSoft,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: M.textMuted }}>Product</Text>
                <Text style={{ marginTop: 7, fontSize: 20, lineHeight: 26, fontWeight: '800', color: M.text }}>
                  {scan.productName || 'Unknown product'}
                </Text>
                {scan.brand ? (
                  <Text style={{ marginTop: 5, fontSize: 14, lineHeight: 20, color: M.textBody, fontWeight: '700' }}>
                    {scan.brand}
                  </Text>
                ) : null}
                <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 19, color: M.textMuted }}>
                  Barcode {scan.barcode || '-'}
                </Text>
              </View>

              <View style={{ marginTop: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
                {REPORT_REASONS.map((item) => {
                  const selected = reason === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setReason(item)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: selected ? M.lineSage : M.line,
                        backgroundColor: selected ? M.sageWash : M.bgChip,
                        paddingVertical: 10,
                        paddingHorizontal: 13,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '800', color: selected ? M.sageDeep : M.textBody }}>
                        {item}
                      </Text>
                      {selected ? <Ionicons name="checkmark-circle" size={16} color={M.sageDeep} /> : null}
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a note (optional)"
                placeholderTextColor={M.textSoft}
                multiline
                textAlignVertical="top"
                onFocus={() => {
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
                }}
                style={{
                  marginTop: 18,
                  minHeight: 130,
                  borderRadius: M.r18,
                  borderWidth: 1,
                  borderColor: M.line,
                  backgroundColor: M.bgCard,
                  paddingVertical: 14,
                  paddingHorizontal: 15,
                  fontSize: 15,
                  lineHeight: 21,
                  color: M.text,
                }}
              />

              {errorMessage ? (
                <Text style={{ marginTop: 12, fontSize: 13, lineHeight: 19, color: '#8B3A3A', fontWeight: '700' }}>
                  {errorMessage}
                </Text>
              ) : null}

              <Pressable
                onPress={onSubmit}
                disabled={submitting}
                style={{
                  marginTop: 20,
                  borderRadius: M.r18,
                  backgroundColor: M.inkButton,
                  alignItems: 'center',
                  paddingVertical: 15,
                  opacity: submitting ? 0.65 : 1,
                  ...M.shadowSoft,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: M.cream }}>
                  {submitting ? 'Sending...' : 'Send report'}
                </Text>
              </Pressable>

              <Pressable
                onPress={goBack}
                disabled={submitting}
                style={{
                  marginTop: 10,
                  borderRadius: M.r18,
                  backgroundColor: M.bgChipSelected,
                  alignItems: 'center',
                  paddingVertical: 14,
                  opacity: submitting ? 0.65 : 1,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '800', color: M.textBody }}>Cancel</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
