"use client";

import type { ExerciseVolumeRow } from "./exercise-progression";
import type { GymSession } from "./weekly-gym-program";

export const WEEKLY_VOLUME_TARGET_MIN = 10;
export const WEEKLY_VOLUME_TARGET_MAX = 20;
const OVERTRAINING_THRESHOLD = 22;

export type MuscleGroup = "chest" | "back" | "shoulders" | "quads" | "hamstrings_glutes" | "arms" | "core";
export type WeeklyVolumeByMuscle = Record<MuscleGroup, number>;

export type SessionAutoAdjustment = {
  volumeScale: number;
  intensityScale: number;
  deloadWeek: boolean;
  overThreshold: boolean;
};

const EMPTY_VOLUME: WeeklyVolumeByMuscle = {
  chest: 0,
  back: 0,
  shoulders: 0,
  quads: 0,
  hamstrings_glutes: 0,
  arms: 0,
  core: 0,
};

function inferPrimaryMuscle(exerciseName: string): MuscleGroup {
  const n = exerciseName.toLowerCase();
  if (n.includes("bench") || n.includes("incline") || n.includes("dip")) return "chest";
  if (n.includes("row") || n.includes("pull") || n.includes("pulldown")) return "back";
  if (n.includes("overhead") || n.includes("lateral") || n.includes("face pull")) return "shoulders";
  if (n.includes("squat") || n.includes("lunge") || n.includes("leg press")) return "quads";
  if (n.includes("deadlift") || n.includes("rdl") || n.includes("hip hinge")) return "hamstrings_glutes";
  if (n.includes("curl") || n.includes("triceps")) return "arms";
  if (n.includes("leg raise") || n.includes("dead bug") || n.includes("bird dog")) return "core";
  return "core";
}

function isoWeekNumber(d: Date): number {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil((((dt.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function isDeloadWeek(date: Date): boolean {
  const week = isoWeekNumber(date);
  return week % 4 === 0;
}

export function calculateWeeklyVolumeByMuscle(rows: ExerciseVolumeRow[]): WeeklyVolumeByMuscle {
  const out: WeeklyVolumeByMuscle = { ...EMPTY_VOLUME };
  for (const row of rows) {
    const muscle = inferPrimaryMuscle(row.exercise_name);
    const sets = Number.isFinite(row.sets_completed) ? Math.max(0, row.sets_completed) : 0;
    out[muscle] += sets;
  }
  return out;
}

export function getSessionAutoAdjustment(
  date: Date,
  session: GymSession,
  weeklyVolume: WeeklyVolumeByMuscle
): SessionAutoAdjustment {
  const deload = isDeloadWeek(date);
  const muscles = Array.from(new Set(session.exercises.map((e) => inferPrimaryMuscle(e.name))));
  const overThreshold = muscles.some((m) => (weeklyVolume[m] ?? 0) > OVERTRAINING_THRESHOLD);
  if (deload) {
    return { volumeScale: 0.6, intensityScale: 0.92, deloadWeek: true, overThreshold };
  }
  if (overThreshold) {
    return { volumeScale: 0.75, intensityScale: 0.96, deloadWeek: false, overThreshold: true };
  }
  return { volumeScale: 1, intensityScale: 1, deloadWeek: false, overThreshold: false };
}
