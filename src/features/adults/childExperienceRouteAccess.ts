import type { AdultAccount } from "./adultAccount";

/**
 * Decides whether a child-only route may render on this device.
 *
 * An adult account is deliberately checked before the profile: a shared device can
 * retain a child's local profile while the grown-up is the person using it. Waiting
 * for the adult store avoids a child-content flash while browser storage hydrates.
 */
export type ChildExperienceRouteAccess = "checking" | "redirect" | "allowed";

export function getChildExperienceRouteAccess(
  adultHydrated: boolean,
  account: AdultAccount | null
): ChildExperienceRouteAccess {
  if (!adultHydrated) return "checking";
  return account ? "redirect" : "allowed";
}
