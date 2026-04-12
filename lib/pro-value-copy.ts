/**
 * Pro vs Free — product copy tied to real gates in `monetization.ts`, `pro-gating.ts`,
 * `weekly-training.ts` (forceFreeTierSchedule), and `strength-progression.ts` (tier pools).
 */

import { FREE_MAX_PATH_LEVEL } from "./monetization";

/** Shown wherever the free tier is materially gated (nav, dashboard, upgrade). */
export const FULL_SYSTEM_LOCKED_LABEL = "Full system locked";

/** Primary emotional hook for upgrade — serious, not salesy. */
export const PRO_VALUE_HEADLINE = "This is where real progress happens";

/** One-line contrast for inline use (dashboard / Progress). */
export function freeTierOneLiner(): string {
  return `Basic protocols · progression to Level ${FREE_MAX_PATH_LEVEL} · random daily pick from the free pool.`;
}

export function proTierOneLiner(): string {
  return "Full weekly programming · advanced protocol pools · structured progression · extra training session.";
}

export const FREE_VS_PRO_ROWS: ReadonlyArray<{ free: string; pro: string }> = [
  { free: "Basic", pro: "Structured" },
  { free: "Random", pro: "Programmed" },
];

/** Row labels for the comparison (maps to FREE_VS_PRO_ROWS order). */
export const FREE_VS_PRO_AXIS_LABELS = ["Training depth", "Daily protocol"] as const;
