import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { RevenueCatProvider } from '../src/providers/RevenueCatProvider';

export default function RootLayout() {
  return (
    <RevenueCatProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </RevenueCatProvider>
  );
}
