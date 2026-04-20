import type { ExpoConfig } from 'expo/config';

/**
 * Default public SDK key for RevenueCat (test). Override per platform in production:
 * - EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
 * - EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
 * - or EXPO_PUBLIC_REVENUECAT_API_KEY to set both at once
 */
const REVENUECAT_DEFAULT_PUBLIC_KEY = 'test_aOrunOSPSucSFhZBYxGrrjGlGIX';

const revenueCatApiKeyBoth =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? REVENUECAT_DEFAULT_PUBLIC_KEY;

const config: ExpoConfig = {
  name: 'mamascan',
  slug: 'mamascan',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'mamascan',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.mikhail.mamascan',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.mikhail.mamascan',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
    'expo-secure-store',
    'expo-localization',
    '@react-native-community/datetimepicker',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: 'e363edbe-1ee3-4802-9191-3d9b491da42e',
    },
    revenueCatApiKeyIos: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? revenueCatApiKeyBoth,
    revenueCatApiKeyAndroid:
      process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? revenueCatApiKeyBoth,
  },
};

export default config;
