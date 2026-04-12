"use client";

/**
 * When `public.profiles` has no baseline columns (migrations not applied), we persist
 * push/squat/plank metrics in localStorage per user so the app still works.
 */
export const BASELINE_PROFILE_OVERLAY_KEY = "ascend.baseline.profile-overlay.v1";

export type BaselineProfileOverlay = {
  pushups_max?: number | null;
  squats_max?: number | null;
  plank_time?: number | null;
  current_pushups_max?: number | null;
  current_squats_max?: number | null;
  current_plank_time?: number | null;
  baseline_completed_at?: string | null;
};

type Stored = { userId: string } & BaselineProfileOverlay;

export function loadBaselineOverlay(userId: string): BaselineProfileOverlay | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BASELINE_PROFILE_OVERLAY_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Stored;
    if (!p || p.userId !== userId) return null;
    const { userId: _id, ...rest } = p;
    void _id;
    return rest;
  } catch {
    return null;
  }
}

export function saveBaselineOverlay(userId: string, patch: BaselineProfileOverlay): void {
  if (typeof window === "undefined") return;
  const prev = loadBaselineOverlay(userId) ?? {};
  const next: Stored = { userId, ...prev, ...patch };
  window.localStorage.setItem(BASELINE_PROFILE_OVERLAY_KEY, JSON.stringify(next));
}
