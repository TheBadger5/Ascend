/**
 * Identity-driven copy — disciplined, understated, not celebratory.
 * Post-session modal (dashboard), streak pressure line, and performance comparisons.
 */

/** Primary lines after completing the daily protocol (modal). */
export const PROTOCOL_COMPLETION_HEADLINE = "You trained today.";
export const PROTOCOL_COMPLETION_CONTEXT = "Most people didn't.";
export const PROTOCOL_COMPLETION_SUBLINE = "This is how strength is built.";

/** Logged performance improved vs previous session (trackers filled). */
export const STRONGER_THAN_LAST_SESSION_LINE = "You're stronger than last session";

/** Shown under streak count in the completion modal when streak ≥ 2. */
export const STREAK_CHAIN_REMINDER = "Don't break the chain.";

/**
 * Dashboard / pressure strip — count only (chain reminder is in the session-complete modal).
 */
export function formatStreakIdentityLine(consecutiveDays: number): string | null {
  if (consecutiveDays < 2) return null;
  return `You've trained ${consecutiveDays} days in a row`;
}
