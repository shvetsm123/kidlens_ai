import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RevenueCatUI from 'react-native-purchases-ui';

import { M } from '../constants/mamaTheme';
import { useRevenueCatSafe } from '../src/providers/RevenueCatProvider';

export default function CustomerCenterScreen() {
  const rc = useRevenueCatSafe();

  if (Platform.OS === 'web' || !rc?.isNativeStoreSupported) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: M.bgPage }} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: M.textBody, lineHeight: 22 }}>
            Subscription management is only available in the iOS and Android apps.
          </Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 20, paddingVertical: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: M.ink }}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M.bgPage }} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ paddingVertical: 8, paddingRight: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: M.textMuted }}>← Back</Text>
        </Pressable>
      </View>
      <RevenueCatUI.CustomerCenterView
        style={{ flex: 1 }}
        shouldShowCloseButton={false}
        onRestoreCompleted={() => {
          void rc.refreshCustomerInfo();
        }}
      />
    </SafeAreaView>
  );
}
