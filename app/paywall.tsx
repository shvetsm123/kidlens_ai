import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlan, setPlan } from '../src/lib/storage';
import type { Plan } from '../src/types/preferences';

type PlanCardDef = {
  id: Plan;
  title: string;
  subtitle: string;
  features: string[];
};

const UNLIMITED_CARD: PlanCardDef = {
  id: 'unlimited',
  title: 'Unlimited',
  subtitle: 'Unlimited product scans',
  features: ['Unlimited scans', 'Quick results', 'Balanced results'],
};

const INSIGHTS_CARD: PlanCardDef = {
  id: 'insights',
  title: 'Insights',
  subtitle: 'Unlimited scans plus deeper tools',
  features: ['Unlimited scans', 'Detailed checks', 'Favorites', 'Local parent feedback'],
};

function parsePlanQueryParam(raw: string | string[] | undefined): Plan | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === 'insights' || v === 'unlimited') {
    return v;
  }
  return null;
}

export default function PaywallScreen() {
  const params = useLocalSearchParams<{ plan?: string | string[] }>();
  const [currentPlan, setCurrentPlan] = useState<Plan>('free');
  const [selectedPaid, setSelectedPaid] = useState<Plan>('unlimited');

  const load = useCallback(async () => {
    const p = await getPlan();
    setCurrentPlan(p);
    const fromRoute = parsePlanQueryParam(params.plan);
    if (fromRoute === 'insights' || fromRoute === 'unlimited') {
      setSelectedPaid(fromRoute);
    } else if (p === 'insights') {
      setSelectedPaid('insights');
    } else if (p === 'unlimited') {
      setSelectedPaid('unlimited');
    } else {
      setSelectedPaid('unlimited');
    }
  }, [params.plan]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const paidPlans = useMemo(() => [UNLIMITED_CARD, INSIGHTS_CARD], []);

  const goBack = () => {
    router.back();
  };

  const onContinue = async () => {
    await setPlan(selectedPaid);
    router.back();
  };

  const continueDisabled = currentPlan === selectedPaid;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F1E8' }} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 4,
          paddingBottom: 32,
        }}
        keyboardShouldPersistTaps="handled"
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
          <Text style={{ fontSize: 17, color: '#6D6053', fontWeight: '700', marginRight: 6 }}>←</Text>
          <Text style={{ fontSize: 16, color: '#6D6053', fontWeight: '600' }}>Back</Text>
        </Pressable>

        <Text style={{ fontSize: 30, lineHeight: 36, color: '#1F1A16', fontWeight: '700' }}>Choose your plan</Text>
        <Text style={{ marginTop: 10, fontSize: 16, lineHeight: 24, color: '#5F554A' }}>
          Mock checkout — plans are stored on this device only.
        </Text>

        {currentPlan !== 'free' ? (
          <View
            style={{
              marginTop: 20,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 16,
              backgroundColor: '#E8EFE8',
              borderWidth: 1,
              borderColor: '#C5D4C5',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#3D5A40' }}>
              Current plan: {currentPlan === 'unlimited' ? 'Unlimited' : 'Insights'}
            </Text>
            <Text style={{ marginTop: 6, fontSize: 13, color: '#5A6B5A', lineHeight: 18 }}>
              {currentPlan === 'unlimited'
                ? 'Upgrade to Insights for detailed checks and premium tools.'
                : 'You have full access. Switch to Unlimited below if you prefer a lighter plan.'}
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: 24, gap: 14 }}>
          {paidPlans.map((card) => {
            const selected = selectedPaid === card.id;
            const isCurrent = currentPlan === card.id;
            return (
              <Pressable
                key={card.id}
                onPress={() => setSelectedPaid(card.id)}
                style={{
                  backgroundColor: '#FFFDF8',
                  borderRadius: 22,
                  padding: 20,
                  borderWidth: 2,
                  borderColor: selected ? '#C9A06E' : '#E8DFD4',
                  shadowColor: '#9B8D7A',
                  shadowOpacity: selected ? 0.14 : 0.06,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: selected ? 4 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#1F1A16' }}>{card.title}</Text>
                    <Text style={{ marginTop: 6, fontSize: 15, lineHeight: 22, color: '#6D6053' }}>{card.subtitle}</Text>
                  </View>
                  {isCurrent ? (
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                        backgroundColor: '#E8EFE8',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#3D5A40' }}>Current</Text>
                    </View>
                  ) : null}
                </View>
                <View style={{ marginTop: 16, gap: 8 }}>
                  {card.features.map((f) => (
                    <Text key={f} style={{ fontSize: 15, lineHeight: 22, color: '#4F453B', fontWeight: '600' }}>
                      • {f}
                    </Text>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={onContinue}
          disabled={continueDisabled}
          style={{
            marginTop: 28,
            backgroundColor: continueDisabled ? '#A89888' : '#2C251F',
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFDF9', fontSize: 17, fontWeight: '700' }}>
            {continueDisabled ? 'Current selection' : 'Continue'}
          </Text>
        </Pressable>

        <Pressable onPress={goBack} style={{ marginTop: 12, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#5F554A' }}>Maybe later</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
