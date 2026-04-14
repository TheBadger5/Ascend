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
  "Core System": "core system — full training structure active",
  "Improved Feedback": "improved feedback — clearer progress signals",
  "Smarter Progression": "smarter progression — stronger adjustment logic",
  "Fatigue Optimisation": "fatigue optimisation — better recovery balancing",
  "Advanced Insights": "advanced insights — deeper performance tracking",
};

const UNLOCK_MOMENT: Record<string, string> = {
  "Core System": "Unlocked: Core System — your training system is fully active.",
  "Improved Feedback": "Unlocked: Improved Feedback — clearer session progress signals.",
  "Smarter Progression": "Unlocked: Smarter Progression — smarter progression adjustments are active.",
  "Fatigue Optimisation": "Unlocked: Fatigue Optimisation — recovery balancing improved.",
  "Advanced Insights": "Unlocked: Advanced Insights — deeper tracking and insight quality active.",
};

/** Greyed card — why it matters while still locked. */
const LOCKED_TEASER: Record<string, string> = {
  "Core System": "Core structure is already active and adapts to your selected training level.",
  "Improved Feedback": "Sharper post-session feedback to make progress easier to read.",
  "Smarter Progression": "Smarter progression responses for better load and rep decisions.",
  "Fatigue Optimisation": "Stronger fatigue and deload optimization for recovery protection.",
  "Advanced Insights": "Deeper trend tracking and insight quality to refine outcomes.",
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
