/**
 * Pressure system — retention-oriented copy: firm, understated, not alarmist.
 * Expiry math lives in `daily-protocol-urgency.ts`; streak lives on `profiles.current_streak`.
 */

import { formatExpiresInHoursLabel } from "./daily-protocol-urgency";
import { formatStreakIdentityLine } from "./emotional-feedback";

/** Full sentence for the daily countdown (local day ends at midnight). */
export function trainingProtocolExpirySentence(expiryMs: number): string {
  return `Today's Training Protocol expires in ${formatExpiresInHoursLabel(expiryMs)}.`;
}

export const MISSED_YESTERDAY_SESSION = "You missed yesterday's session.";

/** Shown when today's protocol is still open — nudges return without shouting. */
export const URGENCY_MAINTAIN_SYSTEM = "Complete today's protocol to maintain your system.";

/** One line tying behaviour to integrity (rules are in `system-integrity.ts`). */
export const INTEGRITY_PRESSURE_HINT = "Complete today: +5 System Integrity · Missed day: −10";

export function streakPressureLine(consecutiveDays: number): string | null {
  return formatStreakIdentityLine(consecutiveDays);
}
