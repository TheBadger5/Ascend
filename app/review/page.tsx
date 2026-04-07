"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentUser, getOrCreateProfile } from "@/lib/ascend-data";
import { supabase } from "@/lib/supabase";
import LoadingScreen from "../loading-screen";

const WEEKLY_REVIEW_UNLOCK_LEVEL = 10;

type ReflectionEntry = {
  weekKey: string;
  wentWell: string;
  improve: string;
  changeNextWeek: string;
  savedAt: string;
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

export default function WeeklyReviewPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [totalXPThisWeek, setTotalXPThisWeek] = useState(0);
  const [daysExecutedThisWeek, setDaysExecutedThisWeek] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [wentWell, setWentWell] = useState("");
  const [improve, setImprove] = useState("");
  const [changeNextWeek, setChangeNextWeek] = useState("");
  const [history, setHistory] = useState<ReflectionEntry[]>([]);
  const [isReady, setIsReady] = useState(false);
  const weekKey = useMemo(() => getWeekKey(), []);

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser();
      if (!user) {
        setIsReady(true);
        return;
      }
      setUserId(user.id);
      const profile = await getOrCreateProfile(user.id);
      const level = Math.floor(profile.total_xp / 100) + 1;
      setIsUnlocked(level >= WEEKLY_REVIEW_UNLOCK_LEVEL);
      setCurrentStreak(profile.current_streak);

      const { data: historyRows } = await supabase
        .from("history")
        .select("date,xp_earned,completed_all")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(30);
      const currentWeekRows = (historyRows ?? []).filter(
        (row) => getWeekKey(new Date(`${String(row.date)}T00:00:00`)) === weekKey
      );
      setTotalXPThisWeek(
        currentWeekRows.reduce((sum, row) => sum + Number(row.xp_earned ?? 0), 0)
      );
      setDaysExecutedThisWeek(currentWeekRows.filter((row) => Boolean(row.completed_all)).length);

      const { data: reflectionRows } = await supabase
        .from("weekly_reviews")
        .select("week_key,went_well,needs_improvement,next_change,created_at")
        .eq("user_id", user.id)
        .order("week_key", { ascending: false })
        .limit(12);
      const normalizedHistory: ReflectionEntry[] = (reflectionRows ?? []).map((row) => ({
        weekKey: String(row.week_key),
        wentWell: String(row.went_well ?? ""),
        improve: String(row.needs_improvement ?? ""),
        changeNextWeek: String(row.next_change ?? ""),
        savedAt: String(row.created_at ?? ""),
      }));
      setHistory(normalizedHistory);
      const currentWeekEntry = normalizedHistory.find((entry) => entry.weekKey === weekKey);
      if (currentWeekEntry) {
        setWentWell(currentWeekEntry.wentWell);
        setImprove(currentWeekEntry.improve);
        setChangeNextWeek(currentWeekEntry.changeNextWeek);
      }
      setIsReady(true);
    };
    load();
  }, [weekKey]);

  useEffect(() => {
    if (!isReady || !isUnlocked || !userId) {
      return;
    }
    const save = async () => {
      await supabase.from("weekly_reviews").upsert({
        user_id: userId,
        week_key: weekKey,
        went_well: wentWell.trim(),
        needs_improvement: improve.trim(),
        next_change: changeNextWeek.trim(),
      });
    };
    save();
  }, [changeNextWeek, improve, isReady, isUnlocked, userId, weekKey, wentWell]);

  if (!isReady) {
    return <LoadingScreen label="Loading weekly audit..." />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center justify-center px-4 py-8">
        <section className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/95 px-6 py-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
          <h1 className="mb-2 text-4xl font-semibold tracking-tight text-zinc-50">Weekly Review</h1>
          <p className="mb-8 text-sm text-zinc-400">Reflect, refine, and improve execution.</p>

          {!isUnlocked ? (
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
              <p className="text-sm font-medium text-zinc-200">Weekly Review is locked</p>
              <p className="mt-2 text-xs text-zinc-500">
                Reach Level {WEEKLY_REVIEW_UNLOCK_LEVEL} to unlock this system.
              </p>
            </div>
          ) : (
            <>
              <div className="grid w-full grid-cols-3 gap-3">
                <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    XP This Week
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-100">{totalXPThisWeek}</p>
                </div>
                <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    Days Executed
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-100">
                    {daysExecutedThisWeek}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    Current Streak
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-100">{currentStreak}</p>
                </div>
              </div>

              <div className="mt-5 space-y-4 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
                <div>
                  <label
                    htmlFor="went-well"
                    className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500"
                  >
                    What went well this week?
                  </label>
                  <textarea
                    id="went-well"
                    value={wentWell}
                    onChange={(event) => setWentWell(event.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="needs-improvement"
                    className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500"
                  >
                    What needs improvement?
                  </label>
                  <textarea
                    id="needs-improvement"
                    value={improve}
                    onChange={(event) => setImprove(event.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="change-next-week"
                    className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500"
                  >
                    What will you change next week?
                  </label>
                  <textarea
                    id="change-next-week"
                    value={changeNextWeek}
                    onChange={(event) => setChangeNextWeek(event.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  Reflection History
                </p>
                <div className="mt-3 space-y-3">
                  {history.length === 0 ? (
                    <p className="text-sm text-zinc-500">No weekly reflections saved yet.</p>
                  ) : (
                    history.map((entry) => (
                      <div
                        key={entry.weekKey}
                        className="rounded-lg border border-zinc-700/80 bg-zinc-900/70 px-3 py-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                          {entry.weekKey}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">Went well</p>
                        <p className="text-sm text-zinc-200">{entry.wentWell || "-"}</p>
                        <p className="mt-2 text-xs text-zinc-500">Needs improvement</p>
                        <p className="text-sm text-zinc-200">{entry.improve || "-"}</p>
                        <p className="mt-2 text-xs text-zinc-500">Change next week</p>
                        <p className="text-sm text-zinc-200">{entry.changeNextWeek || "-"}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
