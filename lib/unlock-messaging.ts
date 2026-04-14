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
  Foundation: "foundation programming — compound-first, repeatable sessions",
  Progression: "progression block — added volume and exercise depth",
  Intensity: "intensity block — heavier ranges and advanced loading",
  Optimisation: "optimisation — fatigue control and planned deloads",
  Advanced: "advanced system — full auto-regulated progression",
};

const UNLOCK_MOMENT: Record<string, string> = {
  Foundation: "Unlocked: Foundation — your core weekly strength system is now active.",
  Progression: "Unlocked: Progression — more productive volume and exercise variety.",
  Intensity: "Unlocked: Intensity — heavier targets and advanced progression methods.",
  Optimisation: "Unlocked: Optimisation — fatigue management and deload controls.",
  Advanced: "Unlocked: Advanced — full auto-regulated progression system.",
};

/** Greyed card — why it matters while still locked. */
const LOCKED_TEASER: Record<string, string> = {
  Foundation: "Reliable baseline program: compounds first, accessories second, repeat weekly.",
  Progression: "More exercises and volume to drive measurable adaptation each week.",
  Intensity: "Heavier rep bands plus progression methods for key lifts.",
  Optimisation: "Automatic fatigue controls and deload timing to protect recovery.",
  Advanced: "Full system: readiness + effort-informed progression and autoregulation.",
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
