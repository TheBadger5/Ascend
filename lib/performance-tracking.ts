/**
 * Lightweight strength performance log from workout tracker fields (localStorage).
 * Not full analytics — last sessions + simple comparisons only.
 */

import type { PathUnlock } from "./path-unlocks";

export const PERFORMANCE_STORAGE_KEY = "ascend.performance-sessions.v1";

/** Read tracker field values from the same keys the protocol UI uses. */
export function collectTrackerStringsFromQuest(
  questId: number,
  getInput: (questId: number, key: string) => string,
  trackerUnlocks: PathUnlock[]
): { lift: string; setsReps: string; load: string } | null {
  if (trackerUnlocks.length === 0) return null;
  const unlock = trackerUnlocks[0];
  const fields = unlock.effectConfig.fields;
  if (!Array.isArray(fields)) return null;
  const prefix = `tracker:${unlock.pathId}:${unlock.title}`;
  const vals = fields
    .filter((f): f is string => typeof f === "string")
    .map((f) => getInput(questId, `${prefix}:${f}`).trim());
  if (vals.length === 0 || vals.every((v) => !v)) return null;
  return {
    lift: vals[0] ?? "",
    setsReps: vals[1] ?? "",
    load: vals[2] ?? "",
  };
}

export type PerformanceSessionEntry = {
  dateKey: string;
  lift: string;
  setsReps: string;
  load: string;
  parsed: {
    loadLb?: number;
    totalReps?: number;
    /** load × totalReps when both parse */
    estimatedVolume?: number;
  };
};

/** Parse "3x10", "3 × 8", "4x12" → total reps */
export function parseTotalReps(setsRepsRaw: string): number | undefined {
  const s = setsRepsRaw.trim().replace(/×/g, "x");
  const parts = s
    .split(/x/i)
    .map((p) => parseFloat(p.replace(/[^0-9.]/g, "")))
    .filter((n) => !Number.isNaN(n) && n > 0);
  if (parts.length >= 2) return Math.round(parts[0] * parts[1]);
  return undefined;
}

/** First numeric weight in the string (lb/kg agnostic). */
export function parseLoad(loadRaw: string): number | undefined {
  const m = loadRaw.match(/(\d+(?:\.\d+)?)/);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  return Number.isNaN(n) ? undefined : n;
}

export function buildSessionEntry(dateKey: string, lift: string, setsReps: string, load: string): PerformanceSessionEntry {
  const loadLb = parseLoad(load);
  const totalReps = parseTotalReps(setsReps);
  let estimatedVolume: number | undefined;
  if (loadLb != null && totalReps != null) {
    estimatedVolume = loadLb * totalReps;
  }
  return {
    dateKey,
    lift: lift.trim(),
    setsReps: setsReps.trim(),
    load: load.trim(),
    parsed: { loadLb, totalReps, estimatedVolume },
  };
}

function readAll(): PerformanceSessionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PerformanceSessionEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: PerformanceSessionEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PERFORMANCE_STORAGE_KEY, JSON.stringify(entries.slice(-40)));
}

/** Upsert by date (one anchor log per calendar day). */
export function appendPerformanceSession(entry: PerformanceSessionEntry): void {
  const list = readAll().filter((e) => e.dateKey !== entry.dateKey);
  list.push(entry);
  writeAll(list);
}

export function getPerformanceHistory(): PerformanceSessionEntry[] {
  return readAll().sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export function getLastTwoSessions(): {
  previous: PerformanceSessionEntry | null;
  current: PerformanceSessionEntry | null;
} {
  const sorted = getPerformanceHistory();
  if (sorted.length === 0) return { previous: null, current: null };
  if (sorted.length === 1) return { previous: null, current: sorted[0] ?? null };
  return {
    previous: sorted[sorted.length - 2] ?? null,
    current: sorted[sorted.length - 1] ?? null,
  };
}

/** Short comparison copy — minimal, user-facing. */
export function getPerformanceComparisonMessages(
  previous: PerformanceSessionEntry | null,
  current: PerformanceSessionEntry | null
): string[] {
  if (!previous || !current) return [];
  const p = previous.parsed;
  const c = current.parsed;
  const out: string[] = [];

  if (c.totalReps != null && p.totalReps != null && c.totalReps > p.totalReps) {
    out.push("Reps increased");
  }

  const loadUp = c.loadLb != null && p.loadLb != null && c.loadLb > p.loadLb;
  const volUp =
    c.estimatedVolume != null && p.estimatedVolume != null && c.estimatedVolume > p.estimatedVolume;
  if (loadUp || volUp) {
    out.push("You lifted more than last session");
  }

  return out;
}

/** Identity-first line when the latest session beats the prior log (reps, load, or volume). */
export function getStrengthIdentityLine(
  previous: PerformanceSessionEntry | null,
  current: PerformanceSessionEntry | null
): string | null {
  if (!previous || !current) return null;
  return getPerformanceComparisonMessages(previous, current).length > 0
    ? "You're stronger than last session"
    : null;
}
