import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useEffect, useState } from 'react';

import {
  ensureSupabaseProfileLocal,
  getOnboardingCompleted,
  hasChildAgePreferenceConfigured,
  syncRemotePreferencesWithLocal,
} from '../src/lib/storage';

type Destination = '/onboarding' | '/age' | '/home';

export default function IndexScreen() {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    const resolveDestination = async () => {
      await ensureSupabaseProfileLocal();
      await syncRemotePreferencesWithLocal();

      const onboardingCompleted = await getOnboardingCompleted();
      const hasChildPrefs = await hasChildAgePreferenceConfigured();

      if (!onboardingCompleted) {
        setDestination('/onboarding');
        return;
      }

      if (!hasChildPrefs) {
        setDestination('/age');
        return;
      }

      setDestination('/home');
    };

    resolveDestination();
  }, []);

  if (!destination) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F6F1E8',
        }}
      >
        <ActivityIndicator size="small" color="#8A7E70" />
      </View>
    );
  }

  return <Redirect href={destination} />;
}
