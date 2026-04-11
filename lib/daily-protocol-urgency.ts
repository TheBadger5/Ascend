/**
 * Daily protocol urgency: countdown to end of the local "protocol day" (default: midnight).
 * Extend later by changing how the deadline instant is computed.
 */

/** Protocol day ends at the start of the next calendar day (local midnight). */
export function msUntilProtocolDeadline(now: Date = new Date()): number {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, end.getTime() - now.getTime());
}

/**
 * Human-readable expiry for "Today's Protocol expires in …"
 * Uses whole hours when ≥ 1h; otherwise "less than 1 hour".
 */
export function formatExpiresInHoursLabel(ms: number): string {
  if (ms <= 0) return "0 hours";
  const hours = ms / 3600000;
  if (hours < 1) return "less than 1 hour";
  const h = Math.ceil(hours);
  return `${h} hour${h === 1 ? "" : "s"}`;
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(y, m - 1, d + deltaDays);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
