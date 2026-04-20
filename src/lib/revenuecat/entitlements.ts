import type { CustomerInfo } from 'react-native-purchases';

/** Must match the entitlement identifier in the RevenueCat dashboard exactly. */
export const MAMASCAN_UNLIMITED_ENTITLEMENT_ID = 'MamaScan Unlimited' as const;

export function hasMamaScanUnlimitedAccess(customerInfo: CustomerInfo | null | undefined): boolean {
  if (!customerInfo) {
    return false;
  }
  const info = customerInfo.entitlements.active[MAMASCAN_UNLIMITED_ENTITLEMENT_ID];
  return info?.isActive === true;
}
