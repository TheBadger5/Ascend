/**
 * Free vs Pro tier rules (XP cap, sessions per level-up).
 * Pro access itself comes only from Supabase `profiles.is_paid_user` (set via Gumroad webhook or SQL).
 */

import { maxXpForLevel } from "./progression-gate";

/** Gumroad product — Early Access checkout (only legitimate paid unlock path in the app). */
export const GUMROAD_ASCEND_CHECKOUT_URL = "https://skillstacked.gumroad.com/l/ascend";

/** Free tier stops at this path level (XP cannot exceed max for this level). */
export const FREE_MAX_PATH_LEVEL = 5;

export const UPGRADE_LIMIT_MESSAGE = "You've reached the limit of your system";

export const EARLY_ACCESS_PRICE_LABEL = "£5";

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
