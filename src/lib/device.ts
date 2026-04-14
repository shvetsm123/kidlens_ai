import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEVICE_ID_STORAGE_KEY = 'deviceId_v1';

const DEVICE_ID_KEY = DEVICE_ID_STORAGE_KEY;

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.trim().length >= 8) {
    return existing.trim();
  }
  const id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}
