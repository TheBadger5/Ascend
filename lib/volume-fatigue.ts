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

export type ProgramWeekInfo = {
  weekNumber: 1 | 2 | 3 | 4;
  intent: string;
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

const DEFAULT_SESSIONS_PER_WEEK = 3;

export function getProgramWeekInfo(completedSessions: number, sessionsPerWeek = DEFAULT_SESSIONS_PER_WEEK): ProgramWeekInfo {
  const safeSessions = Math.max(0, Math.floor(completedSessions));
  const safeSessionsPerWeek = Math.max(1, Math.floor(sessionsPerWeek));
  const completedWeeks = Math.floor(safeSessions / safeSessionsPerWeek);
  const cycleWeek = ((completedWeeks % 4) + 1) as 1 | 2 | 3 | 4;
  const intent =
    cycleWeek === 1
      ? "Build baseline"
      : cycleWeek === 2
        ? "Increase volume"
        : cycleWeek === 3
          ? "Push intensity"
          : "Deload";
  return { weekNumber: cycleWeek, intent };
}

export function isDeloadWeek(programWeek: ProgramWeekInfo): boolean {
  return programWeek.weekNumber === 4;
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
  _date: Date,
  session: GymSession,
  weeklyVolume: WeeklyVolumeByMuscle,
  programWeek: ProgramWeekInfo
): SessionAutoAdjustment {
  const deload = isDeloadWeek(programWeek);
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
