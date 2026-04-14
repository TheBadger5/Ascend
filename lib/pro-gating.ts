import { FREE_MAX_PATH_LEVEL } from "./monetization";

/**
 * Pro entitlement: only when the profile fetch finished and `is_paid_user === true`.
 * Never treat the user as Pro while `isPaidReady` is false (fail closed).
 */
export function effectiveProAccess(isPaidReady: boolean, isPaidUser: boolean): boolean {
  return isPaidReady === true && isPaidUser === true;
}

/** Non-React helper; same rule as `useProEntitlement().effectivePro`. */
export function requireProAccess(isPaidReady: boolean, isPaidUser: boolean): boolean {
  return effectiveProAccess(isPaidReady, isPaidUser);
}

/**
 * Caps path level for unlock eligibility so free users do not bypass the free progression cap
 * even if local XP is inflated.
 */
export function effectiveLevelForPathUnlocks(pathLevel: number, effectivePro: boolean): number {
  if (effectivePro) return pathLevel;
  return Math.min(pathLevel, FREE_MAX_PATH_LEVEL);
}

export type ProFeatureDebugLine = { id: string; label: string; state: "locked" | "unlocked" };

export function getProFeatureDebugLines(effectivePro: boolean): ProFeatureDebugLine[] {
  return [
    { id: "coaching", label: "Enhanced coaching and adaptation intelligence", state: effectivePro ? "unlocked" : "locked" },
    { id: "xp", label: `XP beyond L${FREE_MAX_PATH_LEVEL}`, state: effectivePro ? "unlocked" : "locked" },
    { id: "sessions", label: "Faster level-up pacing (2 vs 3 sessions)", state: effectivePro ? "unlocked" : "locked" },
    { id: "depth", label: "Deeper progression intelligence and insights", state: effectivePro ? "unlocked" : "locked" },
    { id: "fatigue", label: "Higher-fidelity fatigue optimization", state: effectivePro ? "unlocked" : "locked" },
    { id: "insights", label: "Advanced tracking and outcome insights", state: effectivePro ? "unlocked" : "locked" },
  ];
}
