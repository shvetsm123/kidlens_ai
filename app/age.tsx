import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { M } from '../constants/mamaTheme';
import {
  formatLocalDateToIso,
  parseBirthdateToLocalNoon,
  resolveChildAgeProfile,
} from '../src/lib/childAgeContext';
import { getAppLanguage, t } from '../src/lib/i18n';
import {
  getChildAge,
  getChildBirthdate,
  pushSupabasePreferencesFromLocal,
  setChildAge,
  setChildBirthdate,
} from '../src/lib/storage';

function defaultDobDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d;
}

function minDobDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 16);
  return d;
}

export default function AgeScreen() {
  const lang = getAppLanguage();
  const { edit } = useLocalSearchParams<{ edit?: string | string[] }>();
  const editFlag = Array.isArray(edit) ? edit[0] : edit;
  const isEdit = editFlag === '1' || editFlag === 'true';

  const [dob, setDob] = useState(defaultDobDate);
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const storedBd = await getChildBirthdate();
      const legacyYears = await getChildAge();
      let next = defaultDobDate();
      if (storedBd) {
        const parsed = parseBirthdateToLocalNoon(storedBd);
        if (parsed) {
          next = parsed;
        }
      } else if (legacyYears != null && Number.isFinite(legacyYears)) {
        const d = new Date();
        d.setFullYear(d.getFullYear() - Math.min(16, Math.max(0, Math.round(legacyYears))));
        next = d;
      }
      if (active) {
        setDob(next);
        setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const profilePreview = useMemo(() => resolveChildAgeProfile(formatLocalDateToIso(dob), null), [dob]);

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dob,
        onChange: (_e, date) => {
          if (date) {
            setDob(date);
          }
        },
        mode: 'date',
        maximumDate: new Date(),
        minimumDate: minDobDate(),
      });
      return;
    }
    setIosPickerOpen(true);
  };

  const onSubmit = async () => {
    const iso = formatLocalDateToIso(dob);
    const ref = new Date();
    const parsedIso = parseBirthdateToLocalNoon(iso);
    if (!parsedIso || parsedIso.getTime() > ref.getTime()) {
      return;
    }
    await setChildBirthdate(iso);
    const p = resolveChildAgeProfile(iso, null, ref);
    await setChildAge(p.completedWholeYears);
    await pushSupabasePreferencesFromLocal();
    if (isEdit) {
      router.back();
    } else {
      router.replace('/home');
    }
  };

  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: M.bgPage }} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: M.bgPage,
        paddingHorizontal: 24,
        paddingVertical: 24,
        justifyContent: 'space-between',
      }}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="dark" />
      <View>
        {isEdit ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
              alignSelf: 'flex-start',
              paddingVertical: 8,
              paddingRight: 12,
            }}
          >
            <Text style={{ fontSize: 17, color: M.textMuted, fontWeight: '700', marginRight: 6 }}>←</Text>
            <Text style={{ fontSize: 16, color: M.textMuted, fontWeight: '600' }}>{t('common.back', lang)}</Text>
          </Pressable>
        ) : null}
        <Text style={{ fontSize: 34, lineHeight: 42, color: M.text, fontWeight: '700' }}>{t('age.title', lang)}</Text>
        <Text style={{ marginTop: 12, fontSize: 17, lineHeight: 25, color: M.textBody }}>{t('age.subtitle', lang)}</Text>
      </View>

      <View
        style={{
          backgroundColor: M.bgCard,
          borderRadius: M.r24,
          paddingHorizontal: 20,
          paddingVertical: 24,
          ...M.shadowCard,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: M.textMuted }}>{t('age.birthdateLabel', lang)}</Text>
        <Pressable
          onPress={openPicker}
          style={{
            borderRadius: M.r16,
            borderWidth: 1,
            borderColor: M.line,
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: M.bgChip,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: M.text }}>{formatLocalDateToIso(dob)}</Text>
          <Text style={{ marginTop: 6, fontSize: 14, color: M.textMuted }}>{t('age.tapToChange', lang)}</Text>
        </Pressable>
        <View style={{ paddingTop: 4 }}>
          <Text style={{ fontSize: 14, color: M.textBody, lineHeight: 21 }}>
            {t('age.currentApprox', lang, { label: profilePreview.ageDisplayLabel })}
          </Text>
        </View>
      </View>

      {iosPickerOpen && Platform.OS === 'ios' ? (
        <View style={{ backgroundColor: M.bgCard, borderRadius: M.r16, paddingBottom: 8, borderWidth: 1, borderColor: M.line }}>
          <DateTimePicker
            value={dob}
            mode="date"
            display="spinner"
            themeVariant="light"
            onChange={(_e, date) => {
              if (date) {
                setDob(date);
              }
            }}
            maximumDate={new Date()}
            minimumDate={minDobDate()}
          />
          <Pressable
            onPress={() => setIosPickerOpen(false)}
            style={{ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: M.ink }}>{t('age.datePickerDone', lang)}</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        onPress={onSubmit}
        style={{
          width: '100%',
          backgroundColor: M.inkButton,
          borderRadius: M.r16,
          paddingVertical: 16,
          alignItems: 'center',
          ...M.shadowSoft,
        }}
      >
        <Text style={{ color: M.cream, fontSize: 17, fontWeight: '700' }}>
          {isEdit ? t('common.save', lang) : t('common.continue', lang)}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}
