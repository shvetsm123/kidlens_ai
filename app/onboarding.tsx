import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getPlan,
  setAvoidPreferences,
  setOnboardingCompleted,
  setResultStyle,
  syncRemotePreferencesWithLocal,
} from '../src/lib/storage';
import type { AvoidPreference, Plan, ResultStyle } from '../src/types/preferences';

const introSlides = [
  {
    title: 'Scan food for your child',
    subtitle: 'Quick AI-based product checks for parents',
  },
  {
    title: 'See what’s okay, sometimes, or better to avoid',
    subtitle:
      'We look at ingredients, sugar, processing, and product context for your child’s age',
  },
];

const RESULT_STYLE_OPTIONS: { id: ResultStyle; title: string; subtitle: string }[] = [
  { id: 'quick', title: 'Quick', subtitle: 'Fast result with key reasons' },
  { id: 'balanced', title: 'Balanced', subtitle: 'A quick result with a little more context' },
  { id: 'detailed', title: 'Detailed', subtitle: 'More ingredient-focused explanation' },
];

const AVOID_OPTIONS: { id: AvoidPreference; label: string }[] = [
  { id: 'added_sugar', label: 'Added sugar' },
  { id: 'sweeteners', label: 'Sweeteners' },
  { id: 'artificial_colors', label: 'Artificial colors' },
  { id: 'caffeine', label: 'Caffeine' },
  { id: 'ultra_processed', label: 'Ultra-processed snacks' },
  { id: 'milk', label: 'Milk' },
  { id: 'soy', label: 'Soy' },
  { id: 'gluten', label: 'Gluten' },
  { id: 'nuts', label: 'Nuts' },
  { id: 'eggs', label: 'Eggs' },
];

const totalSteps = introSlides.length + 2;

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<Plan>('free');
  const [resultStyle, setResultStyleState] = useState<ResultStyle>('balanced');
  const [avoidPreferences, setAvoidPreferencesState] = useState<AvoidPreference[]>([]);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const isFirstStepMount = useRef(true);

  useFocusEffect(
    useCallback(() => {
      void getPlan().then(setPlan);
    }, []),
  );

  const isIntroStep = step < introSlides.length;
  const isResultStyleStep = step === introSlides.length;
  const isAvoidStep = step === introSlides.length + 1;
  const slide = isIntroStep ? introSlides[step] : null;

  useEffect(() => {
    if (isFirstStepMount.current) {
      isFirstStepMount.current = false;
      return;
    }
    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [step, contentOpacity]);

  const persistResultStyle = () => (resultStyle === 'detailed' && plan !== 'insights' ? 'balanced' : resultStyle);

  const finishOnboarding = async () => {
    await setResultStyle(persistResultStyle());
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

  const onSkipTop = async () => {
    await setResultStyle(persistResultStyle());
    await setAvoidPreferences([]);
    await setOnboardingCompleted(true);
    await syncRemotePreferencesWithLocal();
    router.replace('/age');
  };

  const toggleAvoidPreference = (id: AvoidPreference) => {
    setAvoidPreferencesState((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const isFinalStep = step === totalSteps - 1;
  const showSkip = step < introSlides.length;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: '#F6F1E8',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 20,
      }}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="dark" />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 44,
          marginBottom: 8,
        }}
      >
        {step > 0 ? (
          <Pressable
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingRight: 12 }}
          >
            <Text style={{ fontSize: 17, color: '#6D6053', fontWeight: '700', marginRight: 6 }}>←</Text>
            <Text style={{ fontSize: 16, color: '#6D6053', fontWeight: '600' }}>Back</Text>
          </Pressable>
        ) : (
          <View style={{ width: 72 }} />
        )}
        {showSkip ? (
          <Pressable onPress={onSkipTop} hitSlop={8}>
            <Text style={{ fontSize: 16, color: '#8A7E70', fontWeight: '600' }}>Skip</Text>
          </Pressable>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      <Animated.View style={{ flex: 1, opacity: contentOpacity, justifyContent: 'center' }}>
        {isIntroStep && slide ? (
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderRadius: 28,
              padding: 28,
              shadowColor: '#9B8D7A',
              shadowOpacity: 0.12,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 34, lineHeight: 42, color: '#1F1A16', fontWeight: '700' }}>
              {slide.title}
            </Text>
            <Text
              style={{
                marginTop: 16,
                fontSize: 17,
                lineHeight: 25,
                color: '#5F554A',
              }}
            >
              {slide.subtitle}
            </Text>
          </View>
        ) : null}

        {isResultStyleStep ? (
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderRadius: 28,
              padding: 22,
              shadowColor: '#9B8D7A',
              shadowOpacity: 0.12,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 3,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 31, lineHeight: 38, color: '#1F1A16', fontWeight: '700' }}>
              Choose your result style
            </Text>
            <Text style={{ fontSize: 16, lineHeight: 23, color: '#5F554A' }}>You can change this anytime later</Text>
            <View style={{ marginTop: 4, gap: 10 }}>
              {RESULT_STYLE_OPTIONS.map((option) => {
                const selected = resultStyle === option.id;
                const detailedLocked = option.id === 'detailed' && plan !== 'insights';
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      if (detailedLocked) {
                        router.push({ pathname: '/paywall', params: { plan: 'insights' } });
                        return;
                      }
                      setResultStyleState(option.id);
                    }}
                    style={{
                      borderRadius: 16,
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      backgroundColor: detailedLocked ? '#FAF7F2' : selected ? '#F1E7D9' : '#FAF6EF',
                      borderWidth: 1,
                      borderColor: detailedLocked ? '#E0D4C4' : selected ? '#DAC6AF' : '#E8DED2',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: '700',
                          color: detailedLocked ? '#7A6E61' : '#2B241D',
                        }}
                      >
                        {option.title}
                      </Text>
                      {detailedLocked ? <Ionicons name="lock-closed-outline" size={20} color="#B59B7A" /> : null}
                    </View>
                    <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: '#6A5E51' }}>{option.subtitle}</Text>
                    {detailedLocked ? (
                      <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 18, color: '#9A8B7A', fontWeight: '600' }}>
                        Detailed checks are part of Insights.
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {isAvoidStep ? (
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderRadius: 28,
              padding: 22,
              shadowColor: '#9B8D7A',
              shadowOpacity: 0.12,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 30, lineHeight: 37, color: '#1F1A16', fontWeight: '700' }}>
              Anything you want to avoid?
            </Text>
            <Text style={{ marginTop: 10, fontSize: 16, lineHeight: 23, color: '#5F554A' }}>
              Choose what matters for your family
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
              {AVOID_OPTIONS.map((item) => {
                const selected = avoidPreferences.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleAvoidPreference(item.id)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 13,
                      borderRadius: 999,
                      backgroundColor: selected ? '#EEE2D4' : '#FAF6EF',
                      borderWidth: 1,
                      borderColor: selected ? '#D8C3AA' : '#E7DDCF',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#3A3128' }}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => setAvoidPreferencesState([])} style={{ marginTop: 16, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 14, color: '#8A7E70', fontWeight: '600' }}>Skip for now</Text>
            </Pressable>
          </View>
        ) : null}
      </Animated.View>

      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28 }}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={String(index)}
              style={{
                width: index === step ? 20 : 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: index === step ? '#2C251F' : '#D8CCBD',
              }}
            />
          ))}
        </View>

        <Pressable
          onPress={onNext}
          style={{
            width: '100%',
            backgroundColor: '#2C251F',
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFDF9', fontSize: 17, fontWeight: '700' }}>
            {isFinalStep ? 'Continue' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
