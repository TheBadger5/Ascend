/**
 * Daily readiness → display-only protocol tweaks.
 * Does not change quest identity, XP, level gates, or persisted `daily_tasks` payloads.
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
 * Copies the quest and appends coaching lines to instruction / minimum / insight only.
 * Step count is unchanged so protocol step checks and Execute gating stay aligned.
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
        " Aim for the upper end of your working range, or add one quality set if form stays solid.",
      insight:
        quest.insight +
        " When you feel fresh, intensity is earned — still no sloppy reps.",
    };
  }
  return {
    ...quest,
    instruction:
      "Readiness: tired — ease volume today. " + quest.instruction,
    minimum:
      quest.minimum +
      " Prefer roughly 10% less load or one fewer working set; keep reps clean.",
    insight:
      quest.insight +
      " Lighter sessions on tired days protect the long arc.",
  };
}
