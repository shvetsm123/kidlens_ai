import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
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
  const [transitioning, setTransitioning] = useState(false);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;
  const isTransitioning = useRef(false);

  const heroSlides: HeroSlide[] = [
    {
      image: ONBOARD_IMAGES[0],
      title: "Know what's safe — instantly",
      subtitle: 'Scan any product and get a clear answer in seconds — no guessing, no stress.',
    },
    {
      image: ONBOARD_IMAGES[1],
      title: 'Built for your child',
      subtitle: "Every result is tailored to your child's age and your preferences — so you can trust every decision.",
    },
    {
      image: ONBOARD_IMAGES[2],
      title: 'No more label confusion',
      subtitle: "We break down ingredients into simple, clear insights — so you know what's good, what's not, and why.",
    },
  ];

  const isHeroStep = step < HERO_STEPS;
  const isAvoidStep = step === HERO_STEPS;
  const slide = isHeroStep ? heroSlides[step] : null;

  const contentMaxW = Math.min(winW, 420);
  /** Tall hero art frame with a single rounded clipping container. */
  const imageCardHeight = Math.min(440, Math.max(400, winH * 0.56));

  const finishOnboarding = async () => {
    await setResultStyle('quick');
    await setAvoidPreferences(avoidPreferences);
    await setOnboardingCompleted(true);
    await syncRemotePreferencesWithLocal();
    router.replace('/age');
  };

  const transitionToStep = (nextStep: number, direction: 'forward' | 'back') => {
    if (isTransitioning.current) {
      return;
    }
    isTransitioning.current = true;
    setTransitioning(true);

    const exitX = direction === 'forward' ? -22 : 22;
    const enterX = direction === 'forward' ? 22 : -22;

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 110,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        toValue: exitX,
        duration: 110,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      contentOpacity.setValue(0);
      contentTranslateX.setValue(enterX);
      setStep(nextStep);

      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 160,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(contentTranslateX, {
            toValue: 0,
            duration: 160,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          isTransitioning.current = false;
          setTransitioning(false);
        });
      });
    });
  };

  const onNext = async () => {
    if (isTransitioning.current) {
      return;
    }
    if (step >= totalSteps - 1) {
      await finishOnboarding();
      return;
    }
    transitionToStep(step + 1, 'forward');
  };

  const onBack = () => {
    if (step > 0 && !isTransitioning.current) {
      transitionToStep(step - 1, 'back');
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
      disabled={transitioning}
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
        {isFinalStep ? 'Get started' : 'Continue'}
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
            disabled={transitioning}
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

      <View style={{ flex: 1 }}>
        <Animated.View
          style={{
            flex: 1,
            opacity: contentOpacity,
            transform: [{ translateX: contentTranslateX }],
          }}
        >
          {isHeroStep && slide ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: H_PADDING,
                paddingTop: 8,
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
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    key={`onboarding-image-${step}`}
                    source={slide.image}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>

                <View style={{ height: 24 }} />

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
        </Animated.View>

        {bottomActionZone}
      </View>
    </SafeAreaView>
  );
}
