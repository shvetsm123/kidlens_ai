import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';

import { getRevenueCatPublicApiKey } from './config';

let configurePromise: Promise<void> | null = null;

export function isRevenueCatNativeSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function configureRevenueCat(): Promise<void> {
  if (!isRevenueCatNativeSupported()) {
    return;
  }
  if (configurePromise) {
    return configurePromise;
  }
  configurePromise = (async () => {
    const apiKey = getRevenueCatPublicApiKey();
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({ apiKey });
  })();
  return configurePromise;
}

export async function fetchCustomerInfo(): Promise<CustomerInfo> {
  await configureRevenueCat();
  return Purchases.getCustomerInfo();
}

export async function fetchOfferings(): Promise<PurchasesOfferings> {
  await configureRevenueCat();
  return Purchases.getOfferings();
}

export async function restorePurchases(): Promise<CustomerInfo> {
  await configureRevenueCat();
  return Purchases.restorePurchases();
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  await configureRevenueCat();
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export function isUserCancelledPurchaseError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = (error as { code?: string }).code;
  return code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

export function purchasesErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return 'Something went wrong. Please try again.';
}
