/**
 * Strength path unlocks — anticipation, celebration, and locked-state copy.
 * Unlock definitions stay in `path-unlocks.ts`; tone is serious, not arcadey.
 */

import type { PathUnlock } from "./path-unlocks";
import { FREE_MAX_PATH_LEVEL } from "./monetization";

/** Minimum XP required to be at least at `levelRequirement` (Level L starts at XP (L−1)×100). */
export function xpToReachUnlockThreshold(levelRequirement: number, currentXp: number): number {
  const minXp = Math.max(0, (levelRequirement - 1) * 100);
  return Math.max(0, minXp - currentXp);
}

const PREVIEW_PHRASE: Record<string, string> = {
  "Movement focus": "movement focus — intent before you load the bar",
  "Workout tracking": "lift tracking — this is where real progress starts",
  "Structured workout templates": "structured workouts — a written set scheme before you lift",
  "Split week training": "split-week training — lower, upper, full rotation",
  Autoregulation: "autoregulation — intensity matched to readiness",
};

const UNLOCK_MOMENT: Record<string, string> = {
  "Movement focus": "Unlocked: you declare your focus before the work. No drifting.",
  "Workout tracking": "You can now track your lifts — this is where real progress starts.",
  "Structured workout templates": "Unlocked: you write the plan before the first heavy set.",
  "Split week training": "Unlocked: weekly structure — train the week, not just the day.",
  Autoregulation: "Unlocked: adjust load by readiness. Discipline includes judgment.",
};

/** Greyed card — why it matters while still locked. */
const LOCKED_TEASER: Record<string, string> = {
  "Movement focus": "You’ll name the main movement before the protocol — focus before volume.",
  "Workout tracking": "Session log for load and reps — accountability for every working set.",
  "Structured workout templates": "A set scheme step before your first working set — no guessing.",
  "Split week training": "Lower / upper / full rotation across the week — structure at scale.",
  Autoregulation: "Readiness-based intensity — hard training without wrecking recovery.",
};

export function unlockLevelPreviewLine(unlock: PathUnlock): string {
  const phrase = PREVIEW_PHRASE[unlock.title] ?? `${unlock.title.toLowerCase()}`;
  return `At Level ${unlock.levelRequirement} you unlock ${phrase}.`;
}

export function getUnlockMomentMessage(unlock: PathUnlock): string {
  return UNLOCK_MOMENT[unlock.title] ?? `Unlocked: ${unlock.title}.`;
}

/** Short fragment for pro-gated anticipation (no trailing period). */
function previewFragment(unlock: PathUnlock): string {
  const full = PREVIEW_PHRASE[unlock.title];
  if (full) {
    const dash = full.indexOf(" — ");
    return dash > 0 ? full.slice(0, dash) : full;
  }
  return unlock.title.toLowerCase();
}

/**
 * Primary anticipation line for the dashboard.
 * - If the next milestone is beyond the free cap → full-system copy (no fake XP path).
 * - Else → "Next unlock in N XP" while XP remains to cross into that level band.
 */
export function nextUnlockAnticipationLine(params: {
  currentXp: number;
  effectivePro: boolean;
  nextUnlock: PathUnlock | null;
}): string | null {
  const { currentXp, effectivePro, nextUnlock } = params;
  if (!nextUnlock) return null;
  const blockedByPro = !effectivePro && nextUnlock.levelRequirement > FREE_MAX_PATH_LEVEL;
  if (blockedByPro) {
    return `Level ${nextUnlock.levelRequirement} ahead — ${previewFragment(nextUnlock)}. Full system required.`;
  }
  const xpRem = xpToReachUnlockThreshold(nextUnlock.levelRequirement, currentXp);
  if (xpRem > 0) {
    return `Next unlock in ${xpRem} XP`;
  }
  return `Next unlock at Level ${nextUnlock.levelRequirement} — level up to claim it.`;
}

export function formatUnlockCelebration(unlocks: PathUnlock[]): string {
  if (unlocks.length === 0) return "";
  return unlocks.map(getUnlockMomentMessage).join("\n\n");
}

export function lockedPathTeaser(unlock: PathUnlock): string {
  return LOCKED_TEASER[unlock.title] ?? unlock.description;
}
