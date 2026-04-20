import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type RevenueCatExtra = {
  revenueCatApiKeyIos?: string;
  revenueCatApiKeyAndroid?: string;
};

export function readRevenueCatExtra(): RevenueCatExtra {
  const extra = Constants.expoConfig?.extra as RevenueCatExtra | undefined;
  return extra ?? {};
}

/**
 * Public SDK key for the current platform. Throws if missing on native (misconfiguration).
 */
export function getRevenueCatPublicApiKey(): string {
  const { revenueCatApiKeyIos, revenueCatApiKeyAndroid } = readRevenueCatExtra();
  if (Platform.OS === 'ios') {
    const k = revenueCatApiKeyIos?.trim();
    if (!k) {
      throw new Error('Missing extra.revenueCatApiKeyIos — set it in app.config.ts or EXPO_PUBLIC_REVENUECAT_IOS_API_KEY.');
    }
    return k;
  }
  if (Platform.OS === 'android') {
    const k = revenueCatApiKeyAndroid?.trim();
    if (!k) {
      throw new Error(
        'Missing extra.revenueCatApiKeyAndroid — set it in app.config.ts or EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY.',
      );
    }
    return k;
  }
  throw new Error('RevenueCat native SDK is not used on this platform.');
}
