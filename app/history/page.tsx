"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/ascend-data";
import { supabase } from "@/lib/supabase";
import LoadingScreen from "../loading-screen";

type SessionRow = {
  id: string;
  completed_at: string;
  session_type: string;
  total_volume: number;
};

type ExerciseLogRow = {
  session_id: string;
  exercise_name: string;
  weight: number;
  reps: number[];
  sets: number;
  logged_at: string;
};

type ExerciseIndicator = "More weight than last time" | "More reps than last time" | "New best";

type ExerciseLogView = ExerciseLogRow & {
  indicators: ExerciseIndicator[];
};

type SessionView = {
  id: string;
  completedAt: string;
  sessionLabel: string;
  totalVolume: number;
  exercises: ExerciseLogView[];
};

function formatSessionDate(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function totalReps(reps: number[]): number {
  return reps.reduce((sum, r) => sum + r, 0);
}

function totalVolume(weight: number, reps: number[]): number {
  return weight * totalReps(reps);
}

function normalizeSessionLabel(raw: string): string {
  const value = raw.toLowerCase();
  if (value.includes("upper")) return "Upper";
  if (value.includes("lower")) return "Lower";
  if (value.includes("recovery")) return "Recovery";
  if (value.includes("optional")) return "Optional";
  if (value.includes("full")) return "Full Body";
  return "Strength Session";
}

function sessionLabelFromTaskTitle(title: string | null, fallback: string): string {
  if (!title) return normalizeSessionLabel(fallback);
  return normalizeSessionLabel(title);
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser();
      if (!user) {
        setIsReady(true);
        return;
      }

      const { data: sessionRows } = await supabase
        .from("training_sessions")
        .select("id,completed_at,session_type,total_volume")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(60);

      const normalizedSessions: SessionRow[] = Array.isArray(sessionRows)
        ? sessionRows.map((row) => ({
            id: String(row.id),
            completed_at: String(row.completed_at ?? ""),
            session_type: String(row.session_type ?? "strength_session"),
            total_volume: Number(row.total_volume ?? 0),
          }))
        : [];

      if (normalizedSessions.length === 0) {
        setSessions([]);
        setIsReady(true);
        return;
      }

      const sessionIds = normalizedSessions.map((s) => s.id);
      const { data: logRows } = await supabase
        .from("exercise_logs")
        .select("session_id,exercise_name,weight,reps,sets,logged_at")
        .eq("user_id", user.id)
        .in("session_id", sessionIds)
        .order("logged_at", { ascending: true });

      const normalizedLogs: ExerciseLogRow[] = Array.isArray(logRows)
        ? logRows.map((row) => ({
            session_id: String(row.session_id),
            exercise_name: String(row.exercise_name ?? ""),
            weight: Number(row.weight ?? 0),
            reps: Array.isArray(row.reps) ? row.reps.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [],
            sets: Number(row.sets ?? 0),
            logged_at: String(row.logged_at ?? ""),
          }))
        : [];

      const dateKeys = Array.from(
        new Set(
          normalizedSessions.map((s) => {
            const d = new Date(s.completed_at);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          })
        )
      );
      const { data: taskRows } = await supabase
        .from("daily_tasks")
        .select("date,tasks")
        .eq("user_id", user.id)
        .in("date", dateKeys);
      const labelByDate = new Map<string, string>();
      for (const row of taskRows ?? []) {
        const tasks = Array.isArray(row.tasks) ? row.tasks : [];
        const first = (tasks[0] ?? {}) as { title?: string; task?: string };
        const title = typeof first.title === "string" ? first.title : typeof first.task === "string" ? first.task : null;
        if (typeof row.date === "string") {
          labelByDate.set(row.date, title ?? "");
        }
      }

      const logsBySession = new Map<string, ExerciseLogRow[]>();
      for (const log of normalizedLogs) {
        const rows = logsBySession.get(log.session_id) ?? [];
        rows.push(log);
        logsBySession.set(log.session_id, rows);
      }

      const ascSessions = [...normalizedSessions].reverse();
      const prevByExercise = new Map<string, ExerciseLogRow>();
      const bestByExercise = new Map<string, { bestWeight: number; bestVolume: number }>();
      const withIndicators = new Map<string, ExerciseLogView[]>();

      for (const session of ascSessions) {
        const logs = logsBySession.get(session.id) ?? [];
        const viewed: ExerciseLogView[] = [];
        for (const log of logs) {
          const key = log.exercise_name.trim().toLowerCase();
          const indicators: ExerciseIndicator[] = [];
          const previous = prevByExercise.get(key);
          if (previous) {
            if (log.weight > previous.weight) indicators.push("More weight than last time");
            if (totalReps(log.reps) > totalReps(previous.reps)) indicators.push("More reps than last time");
          }
          const best = bestByExercise.get(key);
          const thisVolume = totalVolume(log.weight, log.reps);
          if (!best || log.weight > best.bestWeight || thisVolume > best.bestVolume) {
            indicators.push("New best");
            bestByExercise.set(key, {
              bestWeight: Math.max(best?.bestWeight ?? 0, log.weight),
              bestVolume: Math.max(best?.bestVolume ?? 0, thisVolume),
            });
          }
          prevByExercise.set(key, log);
          viewed.push({ ...log, indicators: indicators.slice(0, 2) });
        }
        withIndicators.set(session.id, viewed);
      }

      const finalSessions: SessionView[] = normalizedSessions.map((session) => {
        const d = new Date(session.completed_at);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return {
          id: session.id,
          completedAt: session.completed_at,
          sessionLabel: sessionLabelFromTaskTitle(labelByDate.get(dateKey) ?? null, session.session_type),
          totalVolume: session.total_volume,
          exercises: withIndicators.get(session.id) ?? [],
        };
      });

      setSessions(finalSessions);
      setIsReady(true);
    };
    void load();
  }, []);

  const hasHistory = useMemo(() => sessions.length > 0, [sessions]);

  if (!isReady) {
    return <LoadingScreen label="Loading training history..." />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl justify-center px-4 py-8">
        <section className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/95 px-6 py-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-50">History</h1>
          <p className="mt-2 text-sm text-zinc-400">Past sessions and lift progression.</p>
          {!hasHistory ? (
            <p className="mt-8 text-sm text-zinc-500">No sessions logged yet.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {sessions.map((session) => (
                <article key={session.id} className="rounded-xl border border-zinc-800/90 bg-zinc-950/45 px-4 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-100">{session.sessionLabel}</p>
                    <p className="text-xs text-zinc-500">{formatSessionDate(session.completedAt)}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Total volume: {Math.round(session.totalVolume).toLocaleString()}
                  </p>
                  <div className="mt-3 space-y-2">
                    {session.exercises.map((exercise) => (
                      <div key={`${session.id}-${exercise.logged_at}-${exercise.exercise_name}`} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                        <p className="text-xs font-medium text-zinc-200">{exercise.exercise_name}</p>
                        <p className="mt-1 text-[11px] text-zinc-400">
                          {exercise.weight}kg · {exercise.reps.join(", ")} reps · {exercise.sets} sets
                        </p>
                        {exercise.indicators.length > 0 && (
                          <p className="mt-1 text-[11px] text-emerald-400/90">{exercise.indicators.join(" · ")}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
