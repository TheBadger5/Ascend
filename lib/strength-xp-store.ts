"use client";

import { createEmptyTrainingXp, migrateTrainingXp, type TrainingXpState } from "./ascend-path-config";

export const PATH_XP_STORAGE_KEY = "ascend.path-xp.v1";

export function readStrengthXpFromStorage(): { raw: string | null; state: TrainingXpState } {
  if (typeof window === "undefined") {
    return { raw: null, state: createEmptyTrainingXp() };
  }
  const raw = window.localStorage.getItem(PATH_XP_STORAGE_KEY);
  if (!raw) {
    return { raw: null, state: createEmptyTrainingXp() };
  }
  try {
    return { raw, state: migrateTrainingXp(JSON.parse(raw)) };
  } catch {
    return { raw, state: createEmptyTrainingXp() };
  }
}

export function saveStrengthXpToStorage(state: TrainingXpState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PATH_XP_STORAGE_KEY, JSON.stringify(state));
}
