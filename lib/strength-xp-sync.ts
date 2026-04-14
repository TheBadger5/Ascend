"use client";

import { getOrCreateProfile, type ProfileRow } from "@/lib/ascend-data";
import { saveStrengthXpToStorage } from "@/lib/strength-xp-store";
import { supabase } from "@/lib/supabase";
import { ensureStrengthLine, getPathLevelFromXp, type TrainingXpState } from "./ascend-path-config";
import type { ExerciseSessionLogInsert } from "./exercise-progression";

function profileToTrainingXpState(profile: ProfileRow): TrainingXpState {
  const xp = Number(profile.total_strength_xp ?? profile.total_xp ?? 0);
  const level = Number(profile.strength_level ?? profile.level ?? getPathLevelFromXp(xp));
  const trackedForLevel = Number(profile.strength_gate_tracked_level ?? level);
  return ensureStrengthLine({
    strength: { xp, level },
    progression: {
      sessionsTowardNextLevel: Number(profile.strength_gate_sessions ?? 0),
      sessionDatesThisLevel: Array.isArray(profile.strength_gate_dates) ? profile.strength_gate_dates : [],
      trackedForLevel,
    },
  });
}

export async function persistStrengthXpToSupabase(
  userId: string,
  state: TrainingXpState,
  extras?: { systemIntegrity?: number; baselineCompletedAt?: string | null }
): Promise<TrainingXpState> {
  const safe = ensureStrengthLine(state);
  const currentProfile = await getOrCreateProfile(userId);
  const currentState = profileToTrainingXpState(currentProfile);
  const resolvedXp = Math.max(currentState.strength.xp, safe.strength.xp);
  const resolvedLevel = getPathLevelFromXp(resolvedXp);
  const resolvedState =
    resolvedXp === safe.strength.xp
      ? ensureStrengthLine({ ...safe, strength: { xp: resolvedXp, level: resolvedLevel } })
      : ensureStrengthLine({
          ...currentState,
          strength: { xp: resolvedXp, level: resolvedLevel },
        });
  const updatePayload: Record<string, unknown> = {
    total_strength_xp: resolvedState.strength.xp,
    strength_level: resolvedState.strength.level,
    total_xp: resolvedState.strength.xp,
    level: resolvedState.strength.level,
    strength_gate_sessions: resolvedState.progression?.sessionsTowardNextLevel ?? 0,
    strength_gate_dates: resolvedState.progression?.sessionDatesThisLevel ?? [],
    strength_gate_tracked_level: resolvedState.progression?.trackedForLevel ?? resolvedState.strength.level,
  };
  if (extras?.systemIntegrity != null) {
    updatePayload.system_integrity = extras.systemIntegrity;
  }
  if (extras?.baselineCompletedAt !== undefined) {
    updatePayload.baseline_completed_at = extras.baselineCompletedAt;
  }
  const { error } = await supabase.from("profiles").update(updatePayload).eq("id", userId);
  if (error) {
    console.warn("[Ascend] profile strength XP sync failed:", error.message);
    return resolvedState;
  }
  saveStrengthXpToStorage(resolvedState);
  return resolvedState;
}

export async function loadSupabaseBackedStrengthXp(userId: string, localState: TrainingXpState): Promise<{
  state: TrainingXpState;
  profile: ProfileRow;
  migratedFromLocal: boolean;
}> {
  const profile = await getOrCreateProfile(userId);
  const supabaseState = profileToTrainingXpState(profile);
  const localStrength = ensureStrengthLine(localState);
  console.log("[XP DEBUG] Supabase XP:", supabaseState.strength.xp);
  console.log("[XP DEBUG] LocalStorage XP:", localStrength.strength.xp);
  const shouldMigrateFromLocal = supabaseState.strength.xp <= 0 && localStrength.strength.xp > 0;

  if (shouldMigrateFromLocal) {
    const persisted = await persistStrengthXpToSupabase(userId, localStrength);
    console.log("[XP DEBUG] Final XP used (migrated):", persisted.strength.xp);
    saveStrengthXpToStorage(persisted);
    return { state: persisted, profile, migratedFromLocal: true };
  }

  saveStrengthXpToStorage(supabaseState);
  console.log("[XP DEBUG] Final XP used (supabase):", supabaseState.strength.xp);
  return { state: supabaseState, profile, migratedFromLocal: false };
}

export async function logTrainingSessionToSupabase(args: {
  userId: string;
  sessionType: string;
  xpEarned: number;
  totalVolume: number;
  fatigueState: string;
  exerciseLogs: ExerciseSessionLogInsert[];
}): Promise<void> {
  const { userId, sessionType, xpEarned, totalVolume, fatigueState, exerciseLogs } = args;
  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .insert({
      user_id: userId,
      session_type: sessionType,
      completed_at: new Date().toISOString(),
      xp_earned: xpEarned,
      total_volume: totalVolume,
      fatigue_state: fatigueState,
    })
    .select("id")
    .single();
  if (sessionError) {
    console.warn("[Ascend] training_sessions insert failed:", sessionError.message);
    return;
  }
  if (!session?.id || exerciseLogs.length === 0) return;

  const rows = exerciseLogs.map((log) => ({
    user_id: userId,
    session_id: String(session.id),
    exercise_name: log.exercise_name,
    weight: log.last_weight,
    reps: log.last_reps,
    sets: log.sets_completed,
    rpe: log.effort_rating,
    logged_at: new Date().toISOString(),
  }));
  const { error: logsError } = await supabase.from("exercise_logs").insert(rows);
  if (logsError) {
    console.warn("[Ascend] exercise_logs insert failed:", logsError.message);
  }
}
