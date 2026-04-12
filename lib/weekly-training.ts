/**
 * Weekly training rhythm (repeats every calendar week, local timezone).
 * Monday → lower, Tuesday → rest/light, Wednesday → upper, Thursday → rest,
 * Friday → full body, Saturday → optional, Sunday → rest.
 *
 * Before `SPLIT_TRAINING_UNLOCK_LEVEL`, training days use full-body focus only;
 * the lower/upper rotation unlocks as a progression feature.
 */

import { SPLIT_TRAINING_UNLOCK_LEVEL } from "./path-unlocks";

export type TrainingDayFocus =
  | "lower"
  | "upper"
  | "full"
  | "rest_light"
  | "rest"
  | "optional";

/** JavaScript getDay(): 0 = Sunday … 6 = Saturday */
const FOCUS_BY_GET_DAY: Record<number, TrainingDayFocus> = {
  0: "rest",
  1: "lower",
  2: "rest_light",
  3: "upper",
  4: "rest",
  5: "full",
  6: "optional",
};

export function getTrainingFocusForLocalDate(d: Date): TrainingDayFocus {
  return FOCUS_BY_GET_DAY[d.getDay()] ?? "full";
}

/**
 * Effective focus for daily generation and UI. Rest / light / optional days unchanged;
 * lower & upper days become full-body until split training is unlocked.
 * When `forceFreeTierSchedule` is true (not Pro), never use split rotation even if level is high.
 */
export function getEffectiveTrainingFocus(
  d: Date,
  strengthLevel: number,
  opts?: { forceFreeTierSchedule?: boolean }
): TrainingDayFocus {
  const raw = getTrainingFocusForLocalDate(d);
  const levelForSplit = opts?.forceFreeTierSchedule
    ? Math.min(strengthLevel, SPLIT_TRAINING_UNLOCK_LEVEL - 1)
    : strengthLevel;
  if (levelForSplit >= SPLIT_TRAINING_UNLOCK_LEVEL) return raw;
  if (raw === "rest" || raw === "rest_light" || raw === "optional") return raw;
  return "full";
}

/** Headline for the home screen — matches the day’s role in the week */
export function getTodayFocusHeadline(focus: TrainingDayFocus): string {
  switch (focus) {
    case "lower":
      return "Today: Lower body session";
    case "upper":
      return "Today: Upper body session";
    case "full":
      return "Today: Full body session";
    case "rest_light":
      return "Today: Rest & light movement";
    case "rest":
      return "Today: Rest day";
    case "optional":
      return "Today: Optional training";
    default:
      return "Today: Training";
  }
}

/** Parse YYYY-MM-DD as local calendar date (no UTC shift). */
export function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
