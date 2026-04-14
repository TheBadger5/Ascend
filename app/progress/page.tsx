"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createEmptyTrainingXp,
  ensureStrengthLine,
  getPathLevelFromXp,
  migrateTrainingXp,
  STRENGTH_UNLOCK_PATH_ID,
  type TrainingXpState,
} from "@/lib/ascend-path-config";
import { getProgressionSummary } from "@/lib/progression-gate";
import { getMaxXpForFreeTier, getSessionsRequiredForLevelUp } from "@/lib/monetization";
import { getCurrentUser, getOrCreateProfile } from "@/lib/ascend-data";
import { fetchLatestExerciseHistory, type ExerciseHistoryRow } from "@/lib/exercise-progression";
import { useProEntitlement } from "@/lib/use-pro-entitlement";
import FreeVsProComparison from "@/components/free-vs-pro-comparison";
import ProLockedCard from "@/components/pro-locked-card";
import { getPathUnlocks } from "@/lib/path-unlocks";
import { lockedPathTeaser, unlockLevelPreviewLine } from "@/lib/unlock-messaging";
import { getLastTwoSessions, getStrengthIdentityLine, type PerformanceSessionEntry } from "@/lib/performance-tracking";
import LoadingScreen from "../loading-screen";

function formatSessionDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sessionSummaryLine(e: PerformanceSessionEntry): string {
  const parts = [e.lift, e.setsReps, e.load].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

const PATH_XP_STORAGE_KEY = "ascend.path-xp.v1";

const CALIBRATION_GROUPS = {
  lower: ["Back Squat", "Leg Press", "Front Squat"],
  bench: ["Barbell Bench Press", "Bench Press", "Flat Dumbbell Press"],
  pull: ["Barbell Row", "Pull-up or Lat Pulldown", "Lat Pulldown", "Chest-Supported Row", "Seated Cable Row"],
} as const;

function pickCalibrationLift(
  history: Record<string, ExerciseHistoryRow>,
  names: readonly string[]
): ExerciseHistoryRow | null {
  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (history[key]) return history[key];
  }
  return null;
}

function formatCalibration(row: ExerciseHistoryRow | null): string {
  if (!row) return "Not logged yet";
  const reps = row.last_reps.join(", ");
  return `${row.exercise_name}: ${row.last_weight}kg x ${reps}`;
}

export default function ProgressPage() {
  const { isPaidUser, isPaidReady, effectivePro } = useProEntitlement();
  const [trainingXp, setTrainingXp] = useState<TrainingXpState>(createEmptyTrainingXp());
  const [isReady, setIsReady] = useState(false);
  const [perfPair, setPerfPair] = useState<{
    previous: PerformanceSessionEntry | null;
    current: PerformanceSessionEntry | null;
  }>({ previous: null, current: null });
  const [calibration, setCalibration] = useState<{
    lower: ExerciseHistoryRow | null;
    bench: ExerciseHistoryRow | null;
    pull: ExerciseHistoryRow | null;
  }>({ lower: null, bench: null, pull: null });

  useEffect(() => {
    if (!isPaidReady) return;
    const load = async () => {
      const storedXp = window.localStorage.getItem(PATH_XP_STORAGE_KEY);
      let xpState = migrateTrainingXp(storedXp ? JSON.parse(storedXp) : null);
      xpState = ensureStrengthLine(xpState);
      if (!effectivePro) {
        const cap = getMaxXpForFreeTier();
        if (xpState.strength.xp > cap) {
          xpState = ensureStrengthLine({
            ...xpState,
            strength: { xp: cap, level: getPathLevelFromXp(cap) },
          });
        }
      }
      setTrainingXp(xpState);
      window.localStorage.setItem(PATH_XP_STORAGE_KEY, JSON.stringify(xpState));
      setPerfPair(getLastTwoSessions());
      const user = await getCurrentUser();
      if (user) {
        await getOrCreateProfile(user.id);
        const names = [
          ...CALIBRATION_GROUPS.lower,
          ...CALIBRATION_GROUPS.bench,
          ...CALIBRATION_GROUPS.pull,
        ];
        const history = await fetchLatestExerciseHistory(user.id, names);
        setCalibration({
          lower: pickCalibrationLift(history, CALIBRATION_GROUPS.lower),
          bench: pickCalibrationLift(history, CALIBRATION_GROUPS.bench),
          pull: pickCalibrationLift(history, CALIBRATION_GROUPS.pull),
        });
      }
      setIsReady(true);
    };
    void load();
  }, [isPaidReady, effectivePro]);

  if (!isReady) {
    return <LoadingScreen label="Loading training progress..." />;
  }

  const progress = trainingXp.strength;
  const strengthLevel = getPathLevelFromXp(progress.xp);
  const xpInLevel = progress.xp % 100;
  const xpToNext = 100 - xpInLevel;
  const progGate = getProgressionSummary(trainingXp, {
    sessionsRequired: getSessionsRequiredForLevelUp(effectivePro),
  });
  const strengthIdentityLine = getStrengthIdentityLine(perfPair.previous, perfPair.current);
  const calibrationReady = Boolean(calibration.lower && calibration.bench && calibration.pull);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center justify-center px-4 py-8">
        <section className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/95 px-6 py-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
          <h1 className="mb-2 text-4xl font-semibold tracking-tight text-zinc-50">Progress</h1>
          <p className="mb-8 text-sm text-zinc-400">Strength level, calibration, and unlocks</p>

          <div className="mb-6 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Initial strength calibration</p>
            <p className="mt-2 text-[11px] text-zinc-500">
              Established from your first logged gym sessions (weight + reps), not bodyweight tests.
            </p>
            <div className="mt-3 space-y-1.5 text-[12px]">
              <p className="text-zinc-300">{formatCalibration(calibration.lower)}</p>
              <p className="text-zinc-300">{formatCalibration(calibration.bench)}</p>
              <p className="text-zinc-300">{formatCalibration(calibration.pull)}</p>
            </div>
            <p className={`mt-3 text-[11px] ${calibrationReady ? "text-emerald-400/90" : "text-zinc-500"}`}>
              {calibrationReady
                ? "Calibration complete. Progression now tracks gym performance only."
                : "Complete sessions containing squat/leg press, bench, and row/pulldown to finish calibration."}
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Strength level</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-50">{strengthLevel}</p>
            <p className="mt-1 text-sm text-zinc-400">Derived from your total training XP</p>
          </div>

          {(perfPair.previous || perfPair.current) && (
            <div className="mb-6 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Session log</p>
              <p className="mt-1 text-[11px] text-zinc-500">Last logged daily protocol (lift · sets × reps · load)</p>
              {perfPair.previous && (
                <p className="mt-3 text-xs text-zinc-400">
                  <span className="text-zinc-500">Previous · {formatSessionDateLabel(perfPair.previous.dateKey)}</span>
                  <br />
                  <span className="text-zinc-200">{sessionSummaryLine(perfPair.previous)}</span>
                </p>
              )}
              {perfPair.current && (
                <p className={`text-xs text-zinc-400 ${perfPair.previous ? "mt-2" : "mt-3"}`}>
                  <span className="text-zinc-500">Latest · {formatSessionDateLabel(perfPair.current.dateKey)}</span>
                  <br />
                  <span className="text-zinc-200">{sessionSummaryLine(perfPair.current)}</span>
                </p>
              )}
              {strengthIdentityLine && (
                <p className="mt-3 border-t border-zinc-700/60 pt-3 text-xs font-medium leading-relaxed text-emerald-400/90">
                  {strengthIdentityLine}
                </p>
              )}
            </div>
          )}

          <div className="mb-6 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Experience</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">{progress.xp} XP</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-700">
              <div className="h-full rounded-full bg-zinc-300 transition-all duration-300" style={{ width: `${xpInLevel}%` }} />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {progGate.atXpCapForLevel && !progGate.canLevelUpWithCurrentXp
                ? `At XP cap for level ${strengthLevel} — need ${progGate.sessionsRequired} daily sessions to advance`
                : `${xpToNext} XP toward level ${strengthLevel + 1}`}
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Level-up gate</p>
            <p className="mt-2 text-sm text-zinc-200">
              <span className="tabular-nums font-semibold">
                {progGate.sessionsTowardNextLevel}/{progGate.sessionsRequired}
              </span>{" "}
              distinct daily protocols completed at this level
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              You must finish {progGate.sessionsRequired} daily protocols (Execute on the daily anchor workout) on separate days before XP can push you to the next level.
            </p>
          </div>

          {isPaidReady && !isPaidUser && (
            <div className="mb-6">
              <ProLockedCard variant="standard">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Free vs Pro</p>
                  <div className="mt-2">
                    <FreeVsProComparison />
                  </div>
                </div>
              </ProLockedCard>
              <p className="mt-4 text-center text-[11px] text-zinc-600">
                <Link href="/upgrade" className="font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline">
                  Full comparison
                </Link>
              </p>
            </div>
          )}

          <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Unlocks</p>
            <div className="mt-3 space-y-2">
              {getPathUnlocks(STRENGTH_UNLOCK_PATH_ID).map((unlock) => {
                const isUnlocked = strengthLevel >= unlock.levelRequirement;
                return (
                  <div
                    key={`${unlock.title}-${unlock.levelRequirement}`}
                    className={`rounded-lg border px-3 py-2 ${
                      isUnlocked ? "border-zinc-600/90 bg-zinc-900/60" : "border-zinc-700/80 bg-zinc-900/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-medium ${isUnlocked ? "text-zinc-200" : "text-zinc-400"}`}>{unlock.title}</p>
                      <span className={`text-[10px] ${isUnlocked ? "text-zinc-300" : "text-zinc-500"}`}>
                        {isUnlocked ? "Unlocked" : `Locked · L${unlock.levelRequirement}`}
                      </span>
                    </div>
                    {isUnlocked ? (
                      <p className="mt-1 text-[11px] leading-snug text-zinc-500">{unlock.description}</p>
                    ) : (
                      <>
                        <p className="mt-1 text-[11px] leading-snug text-zinc-600">{unlockLevelPreviewLine(unlock)}</p>
                        <p className="mt-1 text-[11px] leading-snug text-zinc-600/85">{lockedPathTeaser(unlock)}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
