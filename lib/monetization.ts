/**
 * Early-access monetisation (local simulation — no payment processor).
 */

import { maxXpForLevel } from "./progression-gate";

export const MONETIZATION_STORAGE_KEY = "ascend.monetization.v1";

/** Free tier stops at this path level (XP cannot exceed max for this level). */
export const FREE_MAX_PATH_LEVEL = 5;

export const UPGRADE_LIMIT_MESSAGE = "You've reached the limit of your system";

export const EARLY_ACCESS_PRICE_LABEL = "£5";

export type MonetizationState = {
  isPaidUser: boolean;
};

export function loadMonetizationState(): MonetizationState {
  if (typeof window === "undefined") return { isPaidUser: false };
  try {
    const raw = window.localStorage.getItem(MONETIZATION_STORAGE_KEY);
    if (!raw) return { isPaidUser: false };
    const p = JSON.parse(raw) as unknown;
    if (p && typeof p === "object" && "isPaidUser" in p) {
      return { isPaidUser: Boolean((p as MonetizationState).isPaidUser) };
    }
  } catch {
    /* ignore */
  }
  return { isPaidUser: false };
}

export function saveMonetizationState(state: MonetizationState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MONETIZATION_STORAGE_KEY, JSON.stringify(state));
}

/** Simulated purchase — sets paid flag (no payment integration). */
export function simulateUpgradeToPaid(): void {
  saveMonetizationState({ isPaidUser: true });
}

export function getSessionsRequiredForLevelUp(isPaidUser: boolean): number {
  return isPaidUser ? 2 : 3;
}

export function getMaxXpForFreeTier(): number {
  return maxXpForLevel(FREE_MAX_PATH_LEVEL);
}

export function isAtFreeTierXpCap(xp: number, isPaidUser: boolean): boolean {
  if (isPaidUser) return false;
  return xp >= getMaxXpForFreeTier();
}
