"use client";

import { supabase } from "./supabase";

export type EffortRating = "easy" | "moderate" | "hard" | "very_hard";

export type ExerciseSpec = {
  name: string;
  plannedSets: number;
  repMin: number | null;
  repMax: number | null;
};

type TargetReadiness = "fresh" | "normal" | "tired";

export type ExerciseHistoryRow = {
  exercise_name: string;
  last_weight: number;
  last_reps: number[];
  sets_completed: number;
  session_date: string;
  effort_rating: EffortRating | null;
  recent_efforts: EffortRating[];
};

export type ExerciseSessionLogInsert = {
  user_id: string;
  exercise_name: string;
  last_weight: number;
  last_reps: number[];
  sets_completed: number;
  session_date: string;
  effort_rating: EffortRating;
};

export type ExerciseVolumeRow = {
  exercise_name: string;
  sets_completed: number;
  session_date: string;
};

export type ExercisePerformanceRow = {
  exercise_name: string;
  last_weight: number;
  last_reps: number[];
  session_date: string;
};

export function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase();
}

export function parseExerciseSpecFromStep(step: string): ExerciseSpec | null {
  const parts = step.split("—");
  if (parts.length < 2) return null;
  const name = parts[0]?.trim() ?? "";
  if (!name) return null;
  const body = parts.slice(1).join("—");
  const setsMatch = body.match(/(\d+)(?:-\d+)?\s*sets?/i);
  const repsMatch = body.match(/(\d+)\s*-\s*(\d+)\s*reps?/i);
  const plannedSets = setsMatch ? Number.parseInt(setsMatch[1] ?? "0", 10) : 3;
  const repMin = repsMatch ? Number.parseInt(repsMatch[1] ?? "0", 10) : null;
  const repMax = repsMatch ? Number.parseInt(repsMatch[2] ?? "0", 10) : null;
  return {
    name,
    plannedSets: Number.isFinite(plannedSets) && plannedSets > 0 ? plannedSets : 3,
    repMin: repMin != null && Number.isFinite(repMin) && repMin > 0 ? repMin : null,
    repMax: repMax != null && Number.isFinite(repMax) && repMax > 0 ? repMax : null,
  };
}

export function parseExerciseSpecsFromSteps(steps: string[]): ExerciseSpec[] {
  const out: ExerciseSpec[] = [];
  for (const step of steps) {
    const parsed = parseExerciseSpecFromStep(step);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function parseRepsCsv(input: string): number[] {
  return input
    .split(",")
    .map((p) => Number.parseInt(p.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function formatLastPerformance(row: ExerciseHistoryRow): string {
  const reps = row.last_reps.join(", ");
  const effort = row.effort_rating ? ` · ${row.effort_rating.replace("_", " ")}` : "";
  return `${row.last_weight}kg x ${reps}${effort}`;
}

export function getDoubleProgressionTarget(
  spec: ExerciseSpec,
  last: ExerciseHistoryRow | null,
  readiness: TargetReadiness = "normal"
): string {
  if (!last || spec.repMin == null || spec.repMax == null) {
    return "Target: establish baseline at a manageable load and log all sets.";
  }
  const repMin = spec.repMin;
  const repMax = spec.repMax;
  const reps = last.last_reps;
  const plannedSetCount = Math.max(1, spec.plannedSets);
  const performedSetCount = Math.max(1, last.sets_completed);
  const setCount = Math.min(plannedSetCount, performedSetCount, reps.length);
  const used = reps.slice(0, setCount);
  const topHitAllSets = used.length === setCount && used.every((r) => r >= repMax);
  const easyStreak = last.recent_efforts.length >= 2 && last.recent_efforts.slice(0, 2).every((r) => r === "easy");
  const veryHardRecent = last.recent_efforts[0] === "very_hard";
  const baseStep = easyStreak ? 5 : 2.5;
  const loadStep = readiness === "fresh" ? baseStep + 2.5 : baseStep;
  const tiredCut = readiness === "tired" ? 2.5 : 0;
  if (veryHardRecent) {
    const downWeight = Number(Math.max(0, last.last_weight - (2.5 + tiredCut)).toFixed(1));
    return `Target: maintain ${last.last_weight}kg (or reduce to ${downWeight}kg) and keep reps clean.`;
  }
  if (readiness === "tired") {
    const lightWeight = Number(Math.max(0, last.last_weight - tiredCut).toFixed(1));
    return `Target: conservative day — use ${lightWeight}kg and keep reps technically crisp.`;
  }
  if (topHitAllSets) {
    const nextWeight = Number((last.last_weight + loadStep).toFixed(1));
    return `Target: increase to ${nextWeight}kg and hit ${repMin}-${repMax} reps.`;
  }
  if (easyStreak) {
    return `Target: reps look comfortable — push hard toward ${repMax} each set, then jump load next session.`;
  }
  return `Target: keep ${last.last_weight}kg and add reps toward ${repMax} each set.`;
}

export async function fetchLatestExerciseHistory(
  userId: string,
  exerciseNames: string[]
): Promise<Record<string, ExerciseHistoryRow>> {
  if (exerciseNames.length === 0) return {};
  const uniq = Array.from(new Set(exerciseNames.map((n) => n.trim()).filter(Boolean)));
  const { data, error } = await supabase
    .from("exercise_history")
    .select("exercise_name,last_weight,last_reps,sets_completed,session_date,effort_rating,created_at")
    .eq("user_id", userId)
    .in("exercise_name", uniq)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error || !Array.isArray(data)) return {};
  const map: Record<string, ExerciseHistoryRow> = {};
  const recentByExercise: Record<string, EffortRating[]> = {};
  for (const row of data) {
    const key = normalizeExerciseName(String(row.exercise_name ?? ""));
    if (!key) continue;
    const effortRaw = String(row.effort_rating ?? "").toLowerCase();
    const effort =
      effortRaw === "easy" || effortRaw === "moderate" || effortRaw === "hard" || effortRaw === "very_hard"
        ? (effortRaw as EffortRating)
        : null;
    if (effort) {
      const list = recentByExercise[key] ?? [];
      if (list.length < 3) {
        list.push(effort);
        recentByExercise[key] = list;
      }
    }
    if (map[key]) continue;
    map[key] = {
      exercise_name: String(row.exercise_name),
      last_weight: Number(row.last_weight ?? 0),
      last_reps: Array.isArray(row.last_reps) ? row.last_reps.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [],
      sets_completed: Number(row.sets_completed ?? 0),
      session_date: String(row.session_date ?? ""),
      effort_rating: effort,
      recent_efforts: [],
    };
  }
  for (const key of Object.keys(map)) {
    map[key].recent_efforts = recentByExercise[key] ?? [];
  }
  return map;
}

export async function saveExerciseSessionLogs(entries: ExerciseSessionLogInsert[]): Promise<void> {
  if (entries.length === 0) return;
  const { error } = await supabase.from("exercise_history").insert(entries);
  if (error) {
    console.warn("[Ascend] exercise_history insert failed:", error.message);
  }
}

export async function fetchExerciseVolumeRowsForRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ExerciseVolumeRow[]> {
  const { data, error } = await supabase
    .from("exercise_history")
    .select("exercise_name,sets_completed,session_date")
    .eq("user_id", userId)
    .gte("session_date", startDate)
    .lte("session_date", endDate);
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => ({
    exercise_name: String(row.exercise_name ?? ""),
    sets_completed: Number(row.sets_completed ?? 0),
    session_date: String(row.session_date ?? ""),
  }));
}

export async function fetchExercisePerformanceRowsForRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ExercisePerformanceRow[]> {
  const { data, error } = await supabase
    .from("exercise_history")
    .select("exercise_name,last_weight,last_reps,session_date")
    .eq("user_id", userId)
    .gte("session_date", startDate)
    .lte("session_date", endDate);
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => ({
    exercise_name: String(row.exercise_name ?? ""),
    last_weight: Number(row.last_weight ?? 0),
    last_reps: Array.isArray(row.last_reps) ? row.last_reps.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [],
    session_date: String(row.session_date ?? ""),
  }));
}

export async function fetchExercisePerformanceRowsForNames(
  userId: string,
  exerciseNames: string[]
): Promise<ExercisePerformanceRow[]> {
  if (exerciseNames.length === 0) return [];
  const uniq = Array.from(new Set(exerciseNames.map((n) => n.trim()).filter(Boolean)));
  const { data, error } = await supabase
    .from("exercise_history")
    .select("exercise_name,last_weight,last_reps,session_date")
    .eq("user_id", userId)
    .in("exercise_name", uniq);
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => ({
    exercise_name: String(row.exercise_name ?? ""),
    last_weight: Number(row.last_weight ?? 0),
    last_reps: Array.isArray(row.last_reps) ? row.last_reps.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [],
    session_date: String(row.session_date ?? ""),
  }));
}

export function getExerciseLogVolume(weight: number, reps: number[]): number {
  return weight * reps.reduce((sum, r) => sum + (Number.isFinite(r) ? r : 0), 0);
}
