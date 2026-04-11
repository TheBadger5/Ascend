/**
 * System Integrity — lightweight local score (0–100) with emotional feedback for consistency.
 * Completing the daily protocol raises it; missed training days lower it.
 */

export const SYSTEM_INTEGRITY_STORAGE_KEY = "ascend.system-integrity.v1";

export type SystemIntegrityState = {
  score: number;
  /** Dates (YYYY-MM-DD) for which a −10 skip penalty was already applied */
  penalizedSkipDates: string[];
  /** Only misses on or after this date count (avoids retroactive penalties when the feature ships). */
  firstTrackedDateKey: string;
};

const PROTOCOL_COMPLETE_DELTA = 5;
const SKIP_DAY_DELTA = 10;

export function clampIntegrityScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function loadSystemIntegrityState(todayDateKey: string): SystemIntegrityState {
  if (typeof window === "undefined") {
    return {
      score: 100,
      penalizedSkipDates: [],
      firstTrackedDateKey: todayDateKey,
    };
  }
  try {
    const raw = window.localStorage.getItem(SYSTEM_INTEGRITY_STORAGE_KEY);
    if (!raw) {
      return {
        score: 100,
        penalizedSkipDates: [],
        firstTrackedDateKey: todayDateKey,
      };
    }
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") {
      return {
        score: 100,
        penalizedSkipDates: [],
        firstTrackedDateKey: todayDateKey,
      };
    }
    const o = p as Record<string, unknown>;
    const penalized = o.penalizedSkipDates;
    return {
      score: clampIntegrityScore(typeof o.score === "number" ? o.score : 100),
      penalizedSkipDates: Array.isArray(penalized) ? penalized.filter((d): d is string => typeof d === "string") : [],
      firstTrackedDateKey:
        typeof o.firstTrackedDateKey === "string" ? o.firstTrackedDateKey : todayDateKey,
    };
  } catch {
    return {
      score: 100,
      penalizedSkipDates: [],
      firstTrackedDateKey: todayDateKey,
    };
  }
}

export function saveSystemIntegrityState(state: SystemIntegrityState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SYSTEM_INTEGRITY_STORAGE_KEY, JSON.stringify(state));
}

/** Apply −10 once per eligible missed calendar day not yet penalized. */
export function reconcileSkipPenalties(missedDateKeys: string[], state: SystemIntegrityState): SystemIntegrityState {
  const penalized = new Set(state.penalizedSkipDates);
  let score = state.score;
  for (const d of missedDateKeys) {
    if (penalized.has(d)) continue;
    penalized.add(d);
    score = clampIntegrityScore(score - SKIP_DAY_DELTA);
  }
  return {
    ...state,
    score,
    penalizedSkipDates: Array.from(penalized).sort(),
  };
}

export function recordProtocolComplete(state: SystemIntegrityState): SystemIntegrityState {
  return {
    ...state,
    score: clampIntegrityScore(state.score + PROTOCOL_COMPLETE_DELTA),
  };
}

/** Subtle band: high feels steady; low nudges without alarm copy. */
export function getIntegrityStatusLabel(score: number): "System stable" | "System weakening" {
  return score >= 60 ? "System stable" : "System weakening";
}
