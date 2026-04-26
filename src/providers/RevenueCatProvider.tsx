import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

import type { Plan } from '../types/preferences';
import { hasKidlensUnlimitedAccess } from '../lib/revenuecat/entitlements';
import {
  configureRevenueCat,
  fetchCustomerInfo,
  fetchOfferings,
  isRevenueCatNativeSupported,
  isUserCancelledPurchaseError,
  purchasePackage as purchasePackageInternal,
  purchasesErrorMessage,
  restorePurchases as restorePurchasesInternal,
} from '../lib/revenuecat/revenueCatService';
import { syncRevenueCatDerivedPlanToSupabase } from '../lib/revenuecat/syncPlanToSupabase';
import { ensureSupabaseProfileLocal, getCachedSupabaseProfileId, setPlan } from '../lib/storage';
import { getOrCreateDeviceId } from '../lib/device';

type RevenueCatContextValue = {
  isNativeStoreSupported: boolean;
  isConfigured: boolean;
  bootstrapDone: boolean;
  configureError: string | null;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  isRefreshing: boolean;
  lastError: string | null;
  hasKidlensUnlimited: boolean;
  /** When native SDK finished first load, subscription state overrides mock local "unlimited" if not entitled. */
  entitlementsOverrideLocal: boolean;
  refreshCustomerInfo: () => Promise<void>;
  refreshOfferings: () => Promise<void>;
  restorePurchases: () => Promise<CustomerInfo>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<CustomerInfo>;
  purchasePackageByType: (type: 'monthly' | 'yearly') => Promise<CustomerInfo>;
  presentCustomerCenter: () => Promise<void>;
  /** Combine RevenueCat entitlement with locally stored plan (for web and pre-bootstrap native). */
  gatedPlan: (localPlan: Plan) => Plan;
};

const RevenueCatContext = createContext<RevenueCatContextValue | null>(null);

type PurchasesPackageType = 'monthly' | 'yearly';

let revenueCatLoginPromise: Promise<CustomerInfo | null> | null = null;
let revenueCatLoggedInAppUserId: string | null = null;

function getPackagesFromOfferings(offerings: PurchasesOfferings): PurchasesPackage[] {
  const packages = [
    ...(offerings.current?.availablePackages ?? []),
    ...Object.values(offerings.all).flatMap((offering) => offering.availablePackages),
  ];
  return Array.from(new Map(packages.map((pkg) => [`${pkg.identifier}:${pkg.product.identifier}`, pkg])).values());
}

function packageMatchesType(pkg: PurchasesPackage, type: PurchasesPackageType): boolean {
  const identifiers = [pkg.identifier, pkg.product.identifier].map((id) => id.toLowerCase());
  const targets = type === 'monthly' ? ['monthly', 'unlimited_monthly'] : ['yearly', 'unlimited_yearly'];
  return identifiers.some((id) => targets.some((target) => id.includes(target)));
}

function selectPackageByType(offerings: PurchasesOfferings, type: PurchasesPackageType): PurchasesPackage | null {
  const current = offerings.current;
  const preferredPackage = type === 'monthly' ? current?.monthly : current?.annual;
  if (preferredPackage) {
    return preferredPackage;
  }
  return getPackagesFromOfferings(offerings).find((pkg) => packageMatchesType(pkg, type)) ?? null;
}

async function resolveRevenueCatAppUserId(): Promise<{ appUserId: string; source: 'profile' | 'device' }> {
  await ensureSupabaseProfileLocal();
  const profileId = await getCachedSupabaseProfileId();
  if (profileId) {
    return { appUserId: profileId, source: 'profile' };
  }
  return { appUserId: await getOrCreateDeviceId(), source: 'device' };
}

async function logInRevenueCatWithLocalIdentity(): Promise<CustomerInfo | null> {
  if (revenueCatLoginPromise) {
    return revenueCatLoginPromise;
  }

  revenueCatLoginPromise = (async () => {
    const { appUserId, source } = await resolveRevenueCatAppUserId();
    if (revenueCatLoggedInAppUserId === appUserId) {
      return null;
    }

    console.log('revenuecat_login_started', { source });
    try {
      const { customerInfo: nextCustomerInfo } = await Purchases.logIn(appUserId);
      revenueCatLoggedInAppUserId = appUserId;
      console.log('revenuecat_login_success', { source });
      return nextCustomerInfo;
    } catch (e) {
      console.warn('revenuecat_login_failed', purchasesErrorMessage(e));
      return null;
    } finally {
      revenueCatLoginPromise = null;
    }
  })();

  return revenueCatLoginPromise;
}

async function syncLocalPlanWithCustomerInfo(info: CustomerInfo): Promise<void> {
  const nextPlan: Plan = hasKidlensUnlimitedAccess(info) ? 'unlimited' : 'free';
  await setPlan(nextPlan);
  await syncRevenueCatDerivedPlanToSupabase(nextPlan);
}

function computeGatedPlan(localPlan: Plan, ctx: Pick<RevenueCatContextValue, 'entitlementsOverrideLocal' | 'customerInfo'>): Plan {
  if (!ctx.entitlementsOverrideLocal) {
    return localPlan;
  }
  return hasKidlensUnlimitedAccess(ctx.customerInfo) ? 'unlimited' : 'free';
}

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const isNativeStoreSupported = isRevenueCatNativeSupported();
  const [isConfigured, setIsConfigured] = useState(false);
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [configureError, setConfigureError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const refreshCustomerInfo = useCallback(async () => {
    if (!isNativeStoreSupported) {
      setBootstrapDone(true);
      return;
    }
    setIsRefreshing(true);
    setLastError(null);
    try {
      await configureRevenueCat();
      setIsConfigured(true);
      const loggedInInfo = await logInRevenueCatWithLocalIdentity();
      const info = loggedInInfo ?? (await fetchCustomerInfo());
      setCustomerInfo(info);
      setConfigureError(null);
      await syncLocalPlanWithCustomerInfo(info);
    } catch (e) {
      const msg = purchasesErrorMessage(e);
      setLastError(msg);
      setConfigureError((prev) => prev ?? msg);
    } finally {
      setIsRefreshing(false);
      setBootstrapDone(true);
    }
  }, [isNativeStoreSupported]);

  const refreshOfferings = useCallback(async () => {
    if (!isNativeStoreSupported) {
      return;
    }
    setLastError(null);
    try {
      await configureRevenueCat();
      setIsConfigured(true);
      const next = await fetchOfferings();
      setOfferings(next);
    } catch (e) {
      setLastError(purchasesErrorMessage(e));
    }
  }, [isNativeStoreSupported]);

  useEffect(() => {
    void refreshCustomerInfo();
    void refreshOfferings();
  }, [refreshCustomerInfo, refreshOfferings]);

  useEffect(() => {
    if (!isNativeStoreSupported || !bootstrapDone) {
      return;
    }
    const listener = async (info: CustomerInfo) => {
      setCustomerInfo(info);
      try {
        await syncLocalPlanWithCustomerInfo(info);
      } catch {
        /* ignore */
      }
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [isNativeStoreSupported, bootstrapDone]);

  const restorePurchases = useCallback(async () => {
    setLastError(null);
    try {
      const info = await restorePurchasesInternal();
      setCustomerInfo(info);
      await syncLocalPlanWithCustomerInfo(info);
      return info;
    } catch (e) {
      setLastError(purchasesErrorMessage(e));
      throw e;
    }
  }, []);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    setLastError(null);
    try {
      const info = await purchasePackageInternal(pkg);
      setCustomerInfo(info);
      await syncLocalPlanWithCustomerInfo(info);
      return info;
    } catch (e) {
      if (!isUserCancelledPurchaseError(e)) {
        setLastError(purchasesErrorMessage(e));
      }
      throw e;
    }
  }, []);

  const purchasePackageByType = useCallback(async (type: PurchasesPackageType) => {
    setLastError(null);
    try {
      await configureRevenueCat();
      setIsConfigured(true);
      const nextOfferings = await Purchases.getOfferings();
      setOfferings(nextOfferings);
      const selectedPackage = selectPackageByType(nextOfferings, type);
      if (!selectedPackage) {
        throw new Error('No subscription packages are available right now. Please try again.');
      }
      const info = await purchasePackageInternal(selectedPackage);
      setCustomerInfo(info);
      await syncLocalPlanWithCustomerInfo(info);
      return info;
    } catch (e) {
      if (!isUserCancelledPurchaseError(e)) {
        setLastError(purchasesErrorMessage(e));
      }
      throw e;
    }
  }, []);

  const presentCustomerCenter = useCallback(async () => {
    await configureRevenueCat();
    setIsConfigured(true);
    await RevenueCatUI.presentCustomerCenter();
  }, []);

  const entitlementsOverrideLocal = isNativeStoreSupported && bootstrapDone && configureError == null;

  const hasKidlensUnlimited = hasKidlensUnlimitedAccess(customerInfo);

  const gatedPlan = useCallback(
    (localPlan: Plan) =>
      computeGatedPlan(localPlan, {
        entitlementsOverrideLocal,
        customerInfo,
      }),
    [entitlementsOverrideLocal, customerInfo],
  );

  const value = useMemo<RevenueCatContextValue>(
    () => ({
      isNativeStoreSupported,
      isConfigured,
      bootstrapDone,
      configureError,
      customerInfo,
      offerings,
      isRefreshing,
      lastError,
      hasKidlensUnlimited,
      entitlementsOverrideLocal,
      refreshCustomerInfo,
      refreshOfferings,
      restorePurchases,
      purchasePackage,
      purchasePackageByType,
      presentCustomerCenter,
      gatedPlan,
    }),
    [
      isNativeStoreSupported,
      isConfigured,
      bootstrapDone,
      configureError,
      customerInfo,
      offerings,
      isRefreshing,
      lastError,
      hasKidlensUnlimited,
      entitlementsOverrideLocal,
      refreshCustomerInfo,
      refreshOfferings,
      restorePurchases,
      purchasePackage,
      purchasePackageByType,
      presentCustomerCenter,
      gatedPlan,
    ],
  );

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
}

export function useRevenueCat(): RevenueCatContextValue {
  const ctx = useContext(RevenueCatContext);
  if (!ctx) {
    throw new Error('useRevenueCat must be used within RevenueCatProvider');
  }
  return ctx;
}

export function useRevenueCatSafe(): RevenueCatContextValue | null {
  return useContext(RevenueCatContext);
}
