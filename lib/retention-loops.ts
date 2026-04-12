/**
 * Retention loops — lightweight copy + math for repeat usage (no extra tables).
 * Weekly window: Monday–Sunday (local calendar), aligned with session counts from `daily_tasks`.
 */

import { getPathLevelFromXp } from "./ascend-path-config";
import { addDaysToDateKey, formatExpiresInHoursLabel } from "./daily-protocol-urgency";

export const WEEKLY_SESSION_GOAL = 3;

export const STAY_CONSISTENT_REMINDER = "Stay consistent";

/** XP needed to reach the first point value of the next path level band. */
export function xpRemainingToNextLevel(xp: number): number {
  const lv = getPathLevelFromXp(xp);
  return Math.max(0, lv * 100 - xp);
}

export function formatXpToNextLevelLine(xp: number): string | null {
  const n = xpRemainingToNextLevel(xp);
  if (n <= 0) return null;
  return `You are ${n} XP from next level`;
}

/** Same clock as the daily protocol day — next anchor opens at local midnight. */
export function formatNextSessionAvailableLine(ms: number): string {
  return `Next session available in ${formatExpiresInHoursLabel(ms)}`;
}

/** Monday (local) YYYY-MM-DD for the week containing `dateKey`. */
export function mondayDateKeyForLocalWeekContaining(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const diffFromMon = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diffFromMon);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function sundayDateKeyFromMonday(mondayKey: string): string {
  return addDaysToDateKey(mondayKey, 6);
}

export function formatWeeklyGoalLine(done: number, goal: number = WEEKLY_SESSION_GOAL): string {
  const clamped = Math.min(Math.max(0, done), goal);
  return `Complete ${goal} sessions this week · ${clamped}/${goal}`;
}
