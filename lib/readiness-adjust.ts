/**
 * Daily readiness — coaching copy only.
 * Real set/exercise volume is applied in `weekly-gym-program.ts` (`applyReadinessVolumeToSession`)
 * when building daily tasks so persisted protocols match rendered steps.
 */

export type ReadinessLevel = "fresh" | "normal" | "tired";

export const SESSION_ADJUSTED_MESSAGE = "Session adjusted based on your condition";

export const READINESS_STORAGE_PREFIX = "ascend.daily-readiness.v1:";

export type ReadinessAdjustableQuest = {
  id: number;
  category: string;
  path: string;
  title: string;
  instruction: string;
  steps: string[];
  why: string;
  examples: string[];
  minimum: string;
  insight: string;
  task?: string;
};

function storageKey(dateKey: string): string {
  return `${READINESS_STORAGE_PREFIX}${dateKey}`;
}

export function loadReadinessForDate(dateKey: string): ReadinessLevel | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(storageKey(dateKey));
    if (v === "fresh" || v === "normal" || v === "tired") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveReadinessForDate(dateKey: string, level: ReadinessLevel): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(dateKey), level);
  } catch {
    /* ignore */
  }
}

/**
 * Appends coaching lines to instruction / minimum / insight.
 * Does not modify `steps` — volume is already scaled in the gym session builder.
 */
export function applyReadinessAdjustments(
  quest: ReadinessAdjustableQuest,
  readiness: ReadinessLevel
): ReadinessAdjustableQuest {
  if (readiness === "normal") {
    return quest;
  }
  if (readiness === "fresh") {
    return {
      ...quest,
      instruction:
        "Readiness: fresh — bias slightly harder today. " +
        quest.instruction,
      minimum:
        quest.minimum +
        " Aim for the upper end of your working range; loads are scaled up slightly for today.",
      insight:
        quest.insight +
        " When you feel fresh, intensity is earned — still no sloppy reps.",
    };
  }
  return {
    ...quest,
    instruction:
      "Readiness: tired — volume and sets are reduced below. " + quest.instruction,
    minimum:
      quest.minimum +
      " Use roughly 5–10% less load on compounds if bar speed drops; keep reps clean.",
    insight:
      quest.insight +
      " Reduced volume today preserves recovery for the next hard session.",
  };
}
