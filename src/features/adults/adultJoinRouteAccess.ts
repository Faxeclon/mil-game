import { getAdultHome, type AdultAccount } from "./adultAccount";

export type AdultJoinRouteAccess =
  | { kind: "checking" }
  | { kind: "redirect"; path: "/teacher" | "/adult" }
  | { kind: "join" };

/** Keeps the join form hidden until the local adult session can answer who is using the device. */
export function getAdultJoinRouteAccess(
  hydrated: boolean,
  account: AdultAccount | null
): AdultJoinRouteAccess {
  if (!hydrated) return { kind: "checking" };
  const path = getAdultHome(account);
  return path ? { kind: "redirect", path } : { kind: "join" };
}
