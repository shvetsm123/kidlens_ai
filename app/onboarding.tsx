import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { M } from '../constants/mamaTheme';
import { avoidLabel, getAppLanguage, t } from '../src/lib/i18n';
import { setAvoidPreferences, setOnboardingCompleted, setResultStyle, syncRemotePreferencesWithLocal } from '../src/lib/storage';
import { AVOID_PREFERENCE_IDS, type AvoidPreference } from '../src/types/preferences';

const ONBOARD_IMAGES = [
  require('../assets/images/onboarding/onboarding-1.png'),
  require('../assets/images/onboarding/onboarding-2.png'),
  require('../assets/images/onboarding/onboarding-3.png'),
] as const;

const HERO_STEPS = 3;
const totalSteps = 4;
const H_PADDING = 28;
const TOP_NAV_MIN_H = 52;
/** Fixed rhythm: dots + gap + CTA + safe area (footer never moves between steps). */
const FOOTER_TOP_PAD = 14;
const FOOTER_GAP_DOTS_TO_CTA = 14;
const FOOTER_BOTTOM_PAD = 12;

type HeroSlide = { image: (typeof ONBOARD_IMAGES)[number]; title: string; subtitle: string };

export default function OnboardingScreen() {
  const lang = getAppLanguage();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [avoidPreferences, setAvoidPreferencesState] = useState<AvoidPreference[]>([]);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const isFirstStepMount = useRef(true);

  const heroSlides: HeroSlide[] = [
    {
      image: ONBOARD_IMAGES[0],
      title: t('onboard.slide1.title', lang),
      subtitle: t('onboard.slide1.sub', lang),
    },
    {
      image: ONBOARD_IMAGES[1],
      title: t('onboard.slide2.title', lang),
      subtitle: t('onboard.slide2.sub', lang),
    },
    {
      image: ONBOARD_IMAGES[2],
      title: t('onboard.slide3.title', lang),
      subtitle: t('onboard.slide3.sub', lang),
    },
  ];

  const isHeroStep = step < HERO_STEPS;
  const isAvoidStep = step === HERO_STEPS;
  const slide = isHeroStep ? heroSlides[step] : null;

  const contentMaxW = Math.min(winW, 420);
  const columnW = Math.min(winW - H_PADDING * 2, contentMaxW);
  /** Large hero card; height scales with width so cover stays balanced (no letterboxing). */
  const imageCardHeight = Math.min(Math.max(columnW * 0.98, 272), winH * 0.5);

  useEffect(() => {
    if (isFirstStepMount.current) {
      isFirstStepMount.current = false;
      return;
    }
    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [step, contentOpacity]);

  const finishOnboarding = async () => {
    await setResultStyle('quick');
    await setAvoidPreferences(avoidPreferences);
    await setOnboardingCompleted(true);
    await syncRemotePreferencesWithLocal();
    router.replace('/age');
  };

  const onNext = async () => {
    if (step >= totalSteps - 1) {
      await finishOnboarding();
      return;
    }
    setStep((current) => current + 1);
  };

  const onBack = () => {
    if (step > 0) {
      setStep((current) => current - 1);
    }
  };

  const toggleAvoidPreference = (id: AvoidPreference) => {
    setAvoidPreferencesState((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const isFinalStep = step === totalSteps - 1;

  const pagerDots = (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const active = index === step;
        return (
          <View
            key={String(index)}
            style={{
              width: active ? 24 : 7,
              height: 7,
              borderRadius: 999,
              backgroundColor: active ? M.ink : M.lineStrong,
            }}
          />
        );
      })}
    </View>
  );

  const primaryCta = (
    <Pressable
      onPress={onNext}
      style={{
        width: '100%',
        backgroundColor: M.inkButton,
        borderRadius: M.r16,
        paddingVertical: 17,
        alignItems: 'center',
        ...M.shadowSoft,
      }}
    >
      <Text style={{ color: M.cream, fontSize: 17, fontWeight: '700' }}>
        {isFinalStep ? t('common.continue', lang) : t('common.next', lang)}
      </Text>
    </Pressable>
  );

  /** Same bottom zone on every step — not inside scroll, so the CTA never jumps. */
  const bottomActionZone = (
    <View
      style={{
        paddingHorizontal: H_PADDING,
        paddingTop: FOOTER_TOP_PAD,
        paddingBottom: FOOTER_BOTTOM_PAD + insets.bottom,
        borderTopWidth: 1,
        borderTopColor: M.line,
        backgroundColor: M.bgPage,
      }}
    >
      {pagerDots}
      <View style={{ height: FOOTER_GAP_DOTS_TO_CTA }} />
      <View style={{ width: '100%', maxWidth: contentMaxW, alignSelf: 'center' }}>{primaryCta}</View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M.bgPage }} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: TOP_NAV_MIN_H,
          paddingHorizontal: H_PADDING - 4,
        }}
      >
        {step > 0 ? (
          <Pressable
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingRight: 12 }}
          >
            <Text style={{ fontSize: 17, color: M.textMuted, fontWeight: '700', marginRight: 6 }}>←</Text>
            <Text style={{ fontSize: 16, color: M.textMuted, fontWeight: '600' }}>{t('common.back', lang)}</Text>
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
        <View style={{ width: 44 }} />
      </View>

      <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
        <View style={{ flex: 1 }}>
          {isHeroStep && slide ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: H_PADDING,
                paddingTop: 10,
                paddingBottom: 20,
                alignItems: 'center',
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <View style={{ width: '100%', maxWidth: contentMaxW, flexGrow: 1 }}>
                <View
                  style={{
                    width: '100%',
                    height: imageCardHeight,
                    borderRadius: M.r28,
                    backgroundColor: M.bgCardMuted,
                    borderWidth: 1,
                    borderColor: M.line,
                    overflow: 'hidden',
                    ...M.shadowCard,
                  }}
                >
                  <Image
                    source={slide.image}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                  />
                </View>

                <View style={{ height: 28 }} />

                <Text
                  style={{
                    fontSize: 28,
                    lineHeight: 34,
                    color: M.text,
                    fontWeight: '800',
                    letterSpacing: -0.3,
                  }}
                >
                  {slide.title}
                </Text>
                <Text
                  style={{
                    marginTop: 14,
                    fontSize: 16,
                    lineHeight: 24,
                    color: M.textBody,
                  }}
                >
                  {slide.subtitle}
                </Text>

                <View style={{ flexGrow: 1, minHeight: 16 }} />
              </View>
            </ScrollView>
          ) : null}

          {isAvoidStep ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: H_PADDING,
                paddingTop: 12,
                paddingBottom: 20,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ width: '100%', maxWidth: contentMaxW, alignSelf: 'center', flexGrow: 1 }}>
                <Text
                  style={{
                    fontSize: 26,
                    lineHeight: 32,
                    color: M.text,
                    fontWeight: '800',
                    letterSpacing: -0.2,
                  }}
                >
                  {t('onboard.avoid.title', lang)}
                </Text>
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 16,
                    lineHeight: 24,
                    color: M.textBody,
                  }}
                >
                  {t('onboard.avoid.sub', lang)}
                </Text>

                <View
                  style={{
                    marginTop: 28,
                    borderRadius: M.r22,
                    backgroundColor: M.bgCard,
                    borderWidth: 1,
                    borderColor: M.line,
                    paddingVertical: 20,
                    paddingHorizontal: 18,
                    ...M.shadowSoft,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: M.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      marginBottom: 14,
                    }}
                  >
                    {t('prefs.avoidList', lang)}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {AVOID_PREFERENCE_IDS.map((id) => {
                      const selected = avoidPreferences.includes(id);
                      return (
                        <Pressable
                          key={id}
                          onPress={() => toggleAvoidPreference(id)}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: 999,
                            backgroundColor: selected ? M.bgChipSelected : M.bgChip,
                            borderWidth: 1.5,
                            borderColor: selected ? M.gold : M.line,
                          }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? M.text : M.textBody }}>
                            {avoidLabel(id, lang)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={{ flexGrow: 1, minHeight: 16 }} />
              </View>
            </ScrollView>
          ) : null}

          {bottomActionZone}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
