"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/ascend-data";
import { getMaxXpForFreeTier } from "@/lib/monetization";
import { supabase } from "@/lib/supabase";
import { readStrengthXpFromStorage } from "@/lib/strength-xp-store";
import { loadSupabaseBackedStrengthXp } from "@/lib/strength-xp-sync";
import { useProEntitlement } from "@/lib/use-pro-entitlement";
import LoadingScreen from "../loading-screen";

type DailyHistoryEntry = {
  date: string;
  xpEarned: number;
  allCompleted: boolean;
  streak: number;
};

const getWeekKey = (date = new Date()) => {
  const dateAtMidnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const day = dateAtMidnight.getDay();
  const diffToMonday = (day + 6) % 7;
  dateAtMidnight.setDate(dateAtMidnight.getDate() - diffToMonday);
  const year = dateAtMidnight.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const daysSinceYearStart =
    Math.floor((dateAtMidnight.getTime() - firstDayOfYear.getTime()) / 86400000) + 1;
  const weekNumber = Math.ceil(daysSinceYearStart / 7);
  return `${year}-W${String(weekNumber).padStart(2, "0")}`;
};

const formatDate = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export default function StatsPage() {
  const { effectivePro, isPaidReady } = useProEntitlement();
  const [totalXP, setTotalXP] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [weeklyXP, setWeeklyXP] = useState(0);
  const [weeklyExecutedDays, setWeeklyExecutedDays] = useState(0);
  const [dailyHistory, setDailyHistory] = useState<DailyHistoryEntry[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [xpResolved, setXpResolved] = useState(false);

  useEffect(() => {
    if (!isPaidReady) return;
    const load = async () => {
      setXpResolved(false);
      const { raw: rawPathXp, state: localXpState } = readStrengthXpFromStorage();
      console.log("[XP DEBUG] stats raw ascend.path-xp.v1:", rawPathXp);
      const user = await getCurrentUser();
      if (!user) {
        const localXp = effectivePro ? localXpState.strength.xp : Math.min(localXpState.strength.xp, getMaxXpForFreeTier());
        setTotalXP(localXp);
        console.log("[XP DEBUG] stats XP used:", localXp);
        setXpResolved(true);
        setIsReady(true);
        return;
      }
      const supabaseBacked = await loadSupabaseBackedStrengthXp(user.id, localXpState);
      const profile = supabaseBacked.profile;
      setCurrentStreak(profile.current_streak);
      setBestStreak(profile.best_streak);
      const resolvedXp = effectivePro
        ? supabaseBacked.state.strength.xp
        : Math.min(supabaseBacked.state.strength.xp, getMaxXpForFreeTier());
      setTotalXP(resolvedXp);
      console.log("[XP DEBUG] stats XP used:", resolvedXp);
      setXpResolved(true);

      const { data: historyRows } = await supabase
        .from("history")
        .select("date,xp_earned,completed_all,streak")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(40);
      const normalized: DailyHistoryEntry[] = (historyRows ?? []).map((row) => ({
        date: row.date as string,
        xpEarned: Number(row.xp_earned ?? 0),
        allCompleted: Boolean(row.completed_all),
        streak: Number(row.streak ?? 0),
      }));
      setDailyHistory(normalized);

      const currentWeekKey = getWeekKey();
      const weekRows = normalized.filter((entry) => getWeekKey(new Date(`${entry.date}T00:00:00`)) === currentWeekKey);
      setWeeklyXP(weekRows.reduce((sum, entry) => sum + entry.xpEarned, 0));
      setWeeklyExecutedDays(weekRows.filter((entry) => entry.allCompleted).length);
      setIsReady(true);
    };
    load();
  }, [effectivePro, isPaidReady]);

  const totalDaysExecuted = useMemo(
    () => dailyHistory.filter((entry) => entry.allCompleted).length,
    [dailyHistory]
  );
  const recentHistory = useMemo(
    () => [...dailyHistory].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14),
    [dailyHistory]
  );
  const last7Days = useMemo(
    () => [...dailyHistory].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).reverse(),
    [dailyHistory]
  );
  const maxXPForChart = useMemo(
    () => Math.max(10, ...last7Days.map((entry) => entry.xpEarned)),
    [last7Days]
  );

  if (!isReady || !xpResolved) {
    return <LoadingScreen label="Loading system metrics..." />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center justify-center px-4 py-8">
        <section className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/95 px-6 py-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
          <h1 className="mb-2 text-4xl font-semibold tracking-tight text-zinc-50">Stats</h1>
          <p className="mb-8 text-sm text-zinc-400">Historical performance and consistency data.</p>

          <div className="grid w-full grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Strength XP</p>
              <p className="mt-1 text-3xl font-semibold text-zinc-100">{totalXP}</p>
            </div>
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Current Streak</p>
              <p className="mt-1 text-3xl font-semibold text-zinc-100">{currentStreak}</p>
            </div>
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Best Streak</p>
              <p className="mt-1 text-3xl font-semibold text-zinc-100">{bestStreak}</p>
            </div>
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Total Days Executed</p>
              <p className="mt-1 text-3xl font-semibold text-zinc-100">{totalDaysExecuted}</p>
            </div>
          </div>

          <div className="mt-5 grid w-full grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Strength XP This Week</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-100">{weeklyXP}</p>
            </div>
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                Days Executed This Week
              </p>
              <p className="mt-1 text-2xl font-semibold text-zinc-100">{weeklyExecutedDays}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Strength XP Last 7 Days</p>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {last7Days.length === 0 ? (
                <p className="col-span-7 text-sm text-zinc-500">No data yet.</p>
              ) : (
                last7Days.map((entry) => (
                  <div key={entry.date} className="flex flex-col items-center gap-2">
                    <div className="flex h-24 w-full items-end">
                      <div
                        className="w-full rounded-t bg-zinc-300/90"
                        style={{
                          height: `${Math.max(
                            6,
                            Math.round((entry.xpEarned / maxXPForChart) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">{formatDate(entry.date)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">History</p>
            <div className="mt-3 space-y-2">
              {recentHistory.length === 0 ? (
                <p className="text-sm text-zinc-500">No daily snapshots yet.</p>
              ) : (
                recentHistory.map((entry) => (
                  <div
                    key={entry.date}
                    className="flex items-center justify-between rounded-lg border border-zinc-700/80 bg-zinc-900/70 px-3 py-2"
                  >
                    <p className="text-sm text-zinc-200">{formatDate(entry.date)}</p>
                    <div className="flex items-center gap-5 text-xs text-zinc-400">
                      <span>{entry.xpEarned} Strength XP</span>
                      <span>{entry.allCompleted ? "Executed: Yes" : "Executed: No"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
