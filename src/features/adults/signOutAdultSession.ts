"use client";

import { getProgressSnapshot, leaveLocalProfileInStore } from "@/features/progress/progressStore";
import { signOutAdult } from "./adultAccountStore";

/**
 * Ends a grown-up's session, and the game they were playing with it.
 *
 * Their own game is a profile, so leaving the account without leaving the profile would
 * strand it: still the active player, but with nobody signed in to own it, which reads on
 * the home screen as a child's game belonging to no child.
 *
 * Nothing is erased either way. The game stays saved under their address and signing back
 * in picks it up exactly where it stopped, which is the same promise a child's nickname
 * carries. A child's profile is never touched: only a grown-up's own game is stepped away
 * from here.
 */
export function signOutAdultSession(): void {
  if (getProgressSnapshot().state.adultEmail !== null) leaveLocalProfileInStore();
  signOutAdult();
}
