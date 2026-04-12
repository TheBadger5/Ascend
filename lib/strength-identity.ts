/**
 * Strength Identity — rank tiers from path level (serious, minimal labels).
 *
 * Thresholds (inclusive lower bound):
 * - Beginner:     levels 1–4
 * - Intermediate: levels 5–9
 * - Advanced:     levels 10+
 */

export type StrengthRank = "Beginner" | "Intermediate" | "Advanced";

/** Level at which each rank begins (Beginner is implicit from 1). */
export const RANK_LEVEL_BEGINNER = 1;
export const RANK_LEVEL_INTERMEDIATE = 5;
export const RANK_LEVEL_ADVANCED = 10;

export function getStrengthRank(level: number): StrengthRank {
  const n = Math.max(1, Math.floor(level));
  if (n >= RANK_LEVEL_ADVANCED) return "Advanced";
  if (n >= RANK_LEVEL_INTERMEDIATE) return "Intermediate";
  return "Beginner";
}

export const STRENGTH_IDENTITY_STORAGE_KEY = "ascend.strength-identity.v1";

export type StrengthIdentitySnapshot = {
  lastLevel: number;
  lastRank: StrengthRank;
};

export function loadStrengthIdentitySnapshot(): StrengthIdentitySnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STRENGTH_IDENTITY_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    const o = p as Record<string, unknown>;
    const lastLevel = typeof o.lastLevel === "number" ? o.lastLevel : null;
    const lr = o.lastRank;
    if (lastLevel == null) return null;
    const lastRank: StrengthRank =
      lr === "Beginner" || lr === "Intermediate" || lr === "Advanced" ? lr : getStrengthRank(lastLevel);
    return { lastLevel, lastRank };
  } catch {
    return null;
  }
}

export function saveStrengthIdentitySnapshot(s: StrengthIdentitySnapshot): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STRENGTH_IDENTITY_STORAGE_KEY, JSON.stringify(s));
}

/**
 * When the user gains at least one level since last snapshot:
 * - If the rank tier changed → "You are now {Rank}."
 * - Else → "You've levelled up."
 * Returns null if no new level gain or first snapshot.
 */
export function nextIdentityNotice(prev: StrengthIdentitySnapshot | null, currentLevel: number): string | null {
  if (!prev) return null;
  if (currentLevel < prev.lastLevel) return null;
  if (currentLevel <= prev.lastLevel) return null;
  const rank = getStrengthRank(currentLevel);
  if (rank !== prev.lastRank) return `You are now ${rank}.`;
  return "You've levelled up.";
}
