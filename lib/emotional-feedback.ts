/**
 * Identity-driven copy — disciplined, understated, not celebratory.
 */

export const PROTOCOL_COMPLETION_HEADLINE = "You trained with intent";
export const PROTOCOL_COMPLETION_CONTEXT = "Most people didn't show up today.";

export function formatStreakIdentityLine(consecutiveDays: number): string | null {
  if (consecutiveDays < 2) return null;
  return `You've trained ${consecutiveDays} days in a row`;
}
