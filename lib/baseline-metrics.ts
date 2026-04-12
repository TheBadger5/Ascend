/**
 * Day-1 baseline tests + current re-tests live on `public.profiles`:
 * - pushups_max, squats_max, plank_time = Day 1 snapshot (plank_time = seconds, optional)
 * - current_* = latest self-reported numbers (updated on Progress)
 *
 * Progression: we compare current vs baseline for feedback; optional weekly snapshot in
 * localStorage powers a simple “vs last week” line without extra tables.
 */

import type { ProfileRow } from "./ascend-data";

export const BASELINE_WEEK_SNAPSHOT_KEY = "ascend.baseline.week-snapshot.v1";

export type WeekSnapshot = {
  weekKey: string;
  pushups: number;
  squats: number;
  plank: number | null;
};

export function hasCompletedBaseline(profile: ProfileRow | null): boolean {
  if (!profile) return false;
  return (
    typeof profile.pushups_max === "number" &&
    profile.pushups_max > 0 &&
    typeof profile.squats_max === "number" &&
    profile.squats_max > 0
  );
}

export function getWeekKey(d = new Date()): string {
  const y = d.getFullYear();
  const oneJan = new Date(y, 0, 1);
  const day = Math.floor((d.getTime() - oneJan.getTime()) / 86400000);
  const week = Math.floor(day / 7);
  return `${y}-W${String(week).padStart(2, "0")}`;
}

export function loadWeekSnapshot(): WeekSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BASELINE_WEEK_SNAPSHOT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as WeekSnapshot;
    if (p && typeof p.weekKey === "string" && typeof p.pushups === "number") return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveWeekSnapshot(s: WeekSnapshot): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BASELINE_WEEK_SNAPSHOT_KEY, JSON.stringify(s));
}

/** Call when user saves current metrics on Progress — updates snapshot when week changes or first time. */
export function maybeRefreshWeekSnapshot(profile: ProfileRow): WeekSnapshot {
  const push = profile.current_pushups_max ?? profile.pushups_max ?? 0;
  const sq = profile.current_squats_max ?? profile.squats_max ?? 0;
  const pl =
    profile.current_plank_time != null
      ? profile.current_plank_time
      : profile.plank_time != null
        ? profile.plank_time
        : null;
  const wk = getWeekKey();
  const prev = loadWeekSnapshot();
  const next: WeekSnapshot = { weekKey: wk, pushups: push, squats: sq, plank: pl };
  if (!prev || prev.weekKey !== wk) {
    saveWeekSnapshot(next);
    return next;
  }
  saveWeekSnapshot(next);
  return prev;
}

export function deltaSinceBaseline(profile: ProfileRow): {
  pushups: number | null;
  squats: number | null;
  plank: number | null;
} {
  const baseP = profile.pushups_max;
  const baseS = profile.squats_max;
  const basePl = profile.plank_time;
  const curP = profile.current_pushups_max ?? baseP;
  const curS = profile.current_squats_max ?? baseS;
  const curPl = profile.current_plank_time ?? basePl;
  return {
    pushups: baseP != null && curP != null ? curP - baseP : null,
    squats: baseS != null && curS != null ? curS - baseS : null,
    plank:
      basePl != null && curPl != null && basePl > 0 ? curPl - basePl : basePl == null && curPl != null ? curPl : null,
  };
}

export function improvementLines(profile: ProfileRow | null): string[] {
  if (!profile || !hasCompletedBaseline(profile)) return [];
  const d = deltaSinceBaseline(profile);
  const lines: string[] = [];
  if (d.pushups != null && d.pushups !== 0) {
    lines.push(
      d.pushups > 0
        ? `You improved +${d.pushups} push-up${d.pushups === 1 ? "" : "s"} since Day 1.`
        : `${d.pushups} push-ups vs Day 1 — stay consistent.`
    );
  }
  if (d.squats != null && d.squats !== 0) {
    lines.push(
      d.squats > 0
        ? `You improved +${d.squats} squat rep${d.squats === 1 ? "" : "s"} since Day 1.`
        : `${d.squats} squat reps vs Day 1 — stay consistent.`
    );
  }
  if (d.plank != null && d.plank !== 0 && profile.plank_time != null) {
    lines.push(
      d.plank > 0
        ? `Plank: +${d.plank}s vs Day 1.`
        : `Plank: ${d.plank}s vs Day 1.`
    );
  }
  const snap = loadWeekSnapshot();
  const curP = profile.current_pushups_max ?? profile.pushups_max ?? 0;
  const curS = profile.current_squats_max ?? profile.squats_max ?? 0;
  if (snap && snap.weekKey !== getWeekKey()) {
    if (curP > snap.pushups || curS > snap.squats) {
      lines.push("You are stronger than last week.");
    }
  }
  return lines;
}

/**
 * One-line hint under the daily protocol — scales encouragement from baseline tier + level.
 */
export function protocolScalingHint(profile: ProfileRow | null, pathLevel: number): string | null {
  if (!profile || !hasCompletedBaseline(profile)) return null;
  const p = profile.pushups_max ?? 0;
  const tier =
    p < 12 ? "Build volume patiently — small wins compound." : p < 25 ? "Solid baseline — chase clean reps." : "Strong baseline — prioritize recovery and progression.";
  const levelNote =
    pathLevel <= 3
      ? " Early levels: nail consistency before intensity."
      : pathLevel <= 7
        ? " Your programming scales with your level — keep logging sessions."
        : " Advanced work scales from this baseline — trust the process.";
  return `${tier}${levelNote}`;
}
