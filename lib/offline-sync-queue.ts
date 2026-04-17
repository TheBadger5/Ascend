"use client";

import { persistStrengthXpToSupabase } from "@/lib/strength-xp-sync";
import { supabase } from "@/lib/supabase";
import { ensureStrengthLine, type TrainingXpState } from "./ascend-path-config";
import type { ExerciseSessionLogInsert } from "./exercise-progression";

const OFFLINE_QUEUE_KEY = "ascend.offline-sync-queue.v1";

type QueuedAction =
  | {
      id: string;
      kind: "session_log";
      createdAt: string;
      payload: {
        sessionType: string;
        xpEarned: number;
        totalVolume: number;
        fatigueState: string;
        exerciseLogs: ExerciseSessionLogInsert[];
        completedAtIso: string;
        sessionDate: string;
      };
    }
  | {
      id: string;
      kind: "exercise_history";
      createdAt: string;
      payload: {
        entries: ExerciseSessionLogInsert[];
      };
    }
  | {
      id: string;
      kind: "xp_sync";
      createdAt: string;
      payload: {
        state: TrainingXpState;
        systemIntegrity?: number;
      };
    };

function readQueue(): QueuedAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedAction[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedAction[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function actionId(kind: QueuedAction["kind"]): string {
  return `${kind}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
}

export function enqueueOfflineSessionSync(payload: {
  sessionType: string;
  xpEarned: number;
  totalVolume: number;
  fatigueState: string;
  exerciseLogs: ExerciseSessionLogInsert[];
  completedAtIso: string;
  sessionDate: string;
}) {
  const queue = readQueue();
  queue.push({ id: actionId("session_log"), kind: "session_log", createdAt: new Date().toISOString(), payload });
  queue.push({
    id: actionId("exercise_history"),
    kind: "exercise_history",
    createdAt: new Date().toISOString(),
    payload: { entries: payload.exerciseLogs },
  });
  writeQueue(queue);
}

export function enqueueOfflineXpSync(payload: { state: TrainingXpState; systemIntegrity?: number }) {
  const queue = readQueue();
  queue.push({ id: actionId("xp_sync"), kind: "xp_sync", createdAt: new Date().toISOString(), payload });
  writeQueue(queue);
}

export function getOfflineQueueSize(): number {
  return readQueue().length;
}

async function syncSessionLog(userId: string, action: Extract<QueuedAction, { kind: "session_log" }>): Promise<boolean> {
  const p = action.payload;
  const dayStart = `${p.sessionDate}T00:00:00.000Z`;
  const dayEnd = `${p.sessionDate}T23:59:59.999Z`;
  const { data: existingRows } = await supabase
    .from("training_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("session_type", p.sessionType)
    .eq("xp_earned", p.xpEarned)
    .gte("completed_at", dayStart)
    .lte("completed_at", dayEnd)
    .limit(1);
  if ((existingRows ?? []).length > 0) return true;

  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .insert({
      user_id: userId,
      session_type: p.sessionType,
      completed_at: p.completedAtIso,
      xp_earned: p.xpEarned,
      total_volume: p.totalVolume,
      fatigue_state: p.fatigueState,
    })
    .select("id")
    .single();
  if (sessionError || !session?.id) return false;

  if (p.exerciseLogs.length === 0) return true;
  const rows = p.exerciseLogs.map((log) => ({
    user_id: userId,
    session_id: String(session.id),
    exercise_name: log.exercise_name,
    weight: log.last_weight,
    reps: log.last_reps,
    sets: log.sets_completed,
    rpe: log.effort_rating,
    logged_at: p.completedAtIso,
  }));
  const { error: logsError } = await supabase.from("exercise_logs").insert(rows);
  return !logsError;
}

async function syncExerciseHistory(userId: string, action: Extract<QueuedAction, { kind: "exercise_history" }>): Promise<boolean> {
  const entries = action.payload.entries;
  if (entries.length === 0) return true;
  for (const entry of entries) {
    const { data: existing } = await supabase
      .from("exercise_history")
      .select("id")
      .eq("user_id", userId)
      .eq("exercise_name", entry.exercise_name)
      .eq("session_date", entry.session_date)
      .limit(1);
    if ((existing ?? []).length > 0) continue;
    const { error } = await supabase.from("exercise_history").insert(entry);
    if (error) return false;
  }
  return true;
}

async function syncXp(userId: string, action: Extract<QueuedAction, { kind: "xp_sync" }>): Promise<boolean> {
  const result = await persistStrengthXpToSupabase(userId, ensureStrengthLine(action.payload.state), {
    systemIntegrity: action.payload.systemIntegrity,
  });
  return (result.strength?.xp ?? 0) >= (action.payload.state.strength?.xp ?? 0);
}

export async function flushOfflineQueue(userId: string): Promise<{ synced: number; remaining: number }> {
  const queue = readQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };
  const remaining: QueuedAction[] = [];
  let synced = 0;
  for (const action of queue) {
    try {
      const ok =
        action.kind === "session_log"
          ? await syncSessionLog(userId, action)
          : action.kind === "exercise_history"
            ? await syncExerciseHistory(userId, action)
            : await syncXp(userId, action);
      if (ok) {
        synced += 1;
      } else {
        remaining.push(action);
      }
    } catch {
      remaining.push(action);
    }
  }
  writeQueue(remaining);
  return { synced, remaining: remaining.length };
}
