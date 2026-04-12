"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  createEmptyTrainingXp,
  ensureStrengthLine,
  getPathLevelFromXp,
  getSystemMetricsFromTrainingXp,
  migrateTrainingXp,
  STRENGTH_UNLOCK_PATH_ID,
  type TrainingXpState,
} from "@/lib/ascend-path-config";
import { applyXpDeltaWithGate, getProgressionSummary } from "@/lib/progression-gate";
import {
  FREE_MAX_PATH_LEVEL,
  getMaxXpForFreeTier,
  getSessionsRequiredForLevelUp,
  GUMROAD_ASCEND_CHECKOUT_URL,
  UPGRADE_LIMIT_MESSAGE,
} from "@/lib/monetization";
import { getCurrentUser, getOrCreateProfile, type ProfileRow } from "@/lib/ascend-data";
import {
  getActivePathUnlocks,
  getNewlyUnlockedForLevel,
  getNextStrengthUnlock,
  SPLIT_TRAINING_UNLOCK_LEVEL,
  type PathUnlock,
} from "@/lib/path-unlocks";
import {
  findStrengthTaskByTitle,
  getStrengthBeltFromPathLevel,
  getStrengthTrainingPoolForPathLevel,
  getStrengthTrainingPoolForPathLevelAndFocus,
  strengthTaskTitleIsProOnly,
  STRENGTH_BELT_LABELS,
  type StrengthTaskPoolEntry,
} from "@/lib/strength-progression";
import {
  getEffectiveTrainingFocus,
  getTodayFocusHeadline,
  parseLocalDateKey,
} from "@/lib/weekly-training";
import {
  PROTOCOL_COMPLETION_CONTEXT,
  PROTOCOL_COMPLETION_HEADLINE,
  formatStreakIdentityLine,
} from "@/lib/emotional-feedback";
import {
  appendPerformanceSession,
  buildSessionEntry,
  collectTrackerStringsFromQuest,
  getLastTwoSessions,
  getStrengthIdentityLine,
} from "@/lib/performance-tracking";
import {
  addDaysToDateKey,
  formatExpiresInHoursLabel,
  msUntilProtocolDeadline,
} from "@/lib/daily-protocol-urgency";
import {
  getIntegrityStatusLabel,
  loadSystemIntegrityState,
  reconcileSkipPenalties,
  recordProtocolComplete,
  saveSystemIntegrityState,
} from "@/lib/system-integrity";
import { supabase } from "@/lib/supabase";
import { logUserEvent, USER_EVENT_TYPES } from "@/lib/user-events";
import LoadingScreen from "./loading-screen";
import RefreshAccessButton from "./refresh-access-button";
import { effectiveLevelForPathUnlocks } from "@/lib/pro-gating";
import { useProEntitlement } from "@/lib/use-pro-entitlement";

const PATH_XP_STORAGE_KEY = "ascend.path-xp.v1";
const ONBOARDING_STORAGE_KEY = "ascend.onboarding.completed.v1";
const ONBOARDING_STEPS = [
  "A system to build strength, discipline, and a powerful body.",
  "Ascend is strength training: one training protocol each day, executed with intent.",
  "Every session earns XP. Three daily completions unlock the next level — no shortcuts.",
  "You are not chasing motivation. You are building a body that shows up.",
] as const;
const STRENGTH_PATH_ID = STRENGTH_UNLOCK_PATH_ID;
const SESSION_PROTOCOL_XP = 10;
const SESSION_COMPLETION_BONUS_XP = 15;
const SESSION_QUEST_ID_BASE = 2000;

const poolEntryToDailyQuest = (entry: StrengthTaskPoolEntry, id: number): DailyQuest => ({
  id,
  category: "Strength",
  path: STRENGTH_PATH_ID,
  title: entry.title,
  instruction: entry.instruction,
  steps: entry.steps,
  why: entry.why,
  examples: entry.examples,
  minimum: entry.minimum,
  insight: entry.insight,
  task: entry.title,
});

type DailyQuest = {
  id: number;
  category: string;
  path: string;
  title: string;
  instruction: string;
  steps: string[];
  why: string;
  examples: string[];
  minimum: string;
  insight: string;
  task?: string;
};
type TaskDetail = { instruction: string; steps: string[]; whyItMatters: string; insight: string; examples: string[]; minimumViable: string };
type TaskPoolEntry = { title: string; instruction: string; steps: string[]; why: string; insight: string; examples: string[]; minimum: string };
type QuestEffectInputState = Record<number, Record<string, string>>;

const hasStructuredQuestShape = (value: unknown): value is DailyQuest => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.category === "string" &&
    typeof item.title === "string" &&
    typeof item.path === "string" &&
    typeof item.instruction === "string" &&
    Array.isArray(item.steps) &&
    typeof item.why === "string" &&
    Array.isArray(item.examples) &&
    typeof item.minimum === "string" &&
    typeof item.insight === "string"
  );
};

const FALLBACK_PROTOCOL_DETAIL: TaskDetail = {
  instruction: "Run a focused 5-minute protocol on the selected objective.",
  steps: [
    "Define one clear output.",
    "Execute one focused block.",
    "Record one improvement for next run.",
  ],
  whyItMatters: "Maintains execution continuity when protocol metadata is missing.",
  insight: "Missing protocol metadata should be patched; execution still continues.",
  examples: ["Write for 5 minutes", "Run one drill", "Ship one micro-output"],
  minimumViable: "Do one focused 5-minute block.",
};

const warnedMissingProtocolTitles = new Set<string>();

const getProtocolDetailFromQuest = (quest: DailyQuest): TaskDetail => {
  if (hasStructuredQuestShape(quest)) {
    return {
      instruction: quest.instruction,
      steps: quest.steps,
      whyItMatters: quest.why,
      insight: quest.insight,
      examples: quest.examples,
      minimumViable: quest.minimum,
    };
  }
  const title = (quest as { title?: string; task?: string }).title ?? (quest as { task?: string }).task ?? "Unknown task";
  if (!warnedMissingProtocolTitles.has(title)) {
    warnedMissingProtocolTitles.add(title);
    console.warn(`[Ascend] Missing structured protocol metadata for "${title}". Reason: legacy or incomplete task object.`);
  }
  return FALLBACK_PROTOCOL_DETAIL;
};

const findTaskPoolEntryByTitle = (title: string): { path: string; entry: TaskPoolEntry } | null => {
  const strength = findStrengthTaskByTitle(title);
  if (strength) {
    return { path: STRENGTH_PATH_ID, entry: strength };
  }
  return null;
};

const LEGACY_TITLE_ALIAS: Record<string, string> = {
  "Spend 10 minutes learning": "Spend 15 minutes learning",
  "Make one positive social connection": "Reach out to someone you value",
};

const hydrateQuest = (quest: unknown, index: number): DailyQuest => {
  if (hasStructuredQuestShape(quest)) {
    return { ...quest, id: Number(quest.id ?? index + 1), task: quest.title };
  }

  const raw = (quest ?? {}) as Record<string, unknown>;
  const titleCandidate = typeof raw.title === "string" ? raw.title : typeof raw.task === "string" ? raw.task : "";
  const normalizedTitle = LEGACY_TITLE_ALIAS[titleCandidate] ?? titleCandidate;
  const found = findTaskPoolEntryByTitle(normalizedTitle);

  if (found) {
    return {
      id: Number(raw.id ?? index + 1),
      category: typeof raw.category === "string" ? raw.category : "Strength",
      path: found.path,
      title: found.entry.title,
      instruction: found.entry.instruction,
      steps: found.entry.steps,
      why: found.entry.why,
      examples: found.entry.examples,
      minimum: found.entry.minimum,
      insight: found.entry.insight,
      task: found.entry.title,
    };
  }

  const fallbackTitle = titleCandidate || `Legacy protocol ${index + 1}`;
  console.warn(`[Ascend] Hydration fallback for "${fallbackTitle}". Reason: missing pool metadata.`);
  return {
    id: Number(raw.id ?? index + 1),
    category: typeof raw.category === "string" ? raw.category : "Unknown",
    path: "fallback",
    title: fallbackTitle,
    instruction: FALLBACK_PROTOCOL_DETAIL.instruction,
    steps: FALLBACK_PROTOCOL_DETAIL.steps,
    why: FALLBACK_PROTOCOL_DETAIL.whyItMatters,
    examples: FALLBACK_PROTOCOL_DETAIL.examples,
    minimum: FALLBACK_PROTOCOL_DETAIL.minimumViable,
    insight: FALLBACK_PROTOCOL_DETAIL.insight,
    task: fallbackTitle,
  };
};

const hydrateDailyQuests = (tasks: unknown): DailyQuest[] => {
  if (!Array.isArray(tasks)) return [];
  return tasks.map((quest, idx) => hydrateQuest(quest, idx));
};

/** One strength protocol per day; collapse legacy multi-task rows */
const normalizeSingleStrengthTask = (
  tasks: DailyQuest[],
  completed: boolean[]
): { tasks: DailyQuest[]; completed: boolean[] } => {
  const strengthIdx = tasks.findIndex((q) => q.path === STRENGTH_PATH_ID);
  if (strengthIdx >= 0) {
    return {
      tasks: [tasks[strengthIdx]],
      completed: [completed[strengthIdx] ?? false],
    };
  }
  if (tasks.length >= 1) {
    return { tasks: [tasks[0]], completed: [completed[0] ?? false] };
  }
  return { tasks: [], completed: [] };
};

const getLocalDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const dayDiff = (a: string, b: string) =>
  Math.floor((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);

const getCurrentRank = (level: number) => {
  if (level >= 20) return "Black Belt";
  if (level >= 15) return "Brown Belt";
  if (level >= 10) return "Purple Belt";
  if (level >= 5) return "Blue Belt";
  return "White Belt";
};

const createDailyQuests = (
  previous: DailyQuest[] = [],
  trainingXp: TrainingXpState = createEmptyTrainingXp(),
  dateKey: string = getLocalDateKey(),
  isPaidUser = false
): DailyQuest[] => {
  const previousTitle = previous[0]?.title ?? previous[0]?.task ?? "";
  const pathLevel = getPathLevelFromXp(trainingXp.strength?.xp ?? 0);
  const focus = getEffectiveTrainingFocus(parseLocalDateKey(dateKey), pathLevel, {
    forceFreeTierSchedule: !isPaidUser,
  });
  const pool = getStrengthTrainingPoolForPathLevelAndFocus(pathLevel, focus, { isPaidUser });
  const filtered = pool.filter((item) => item.title !== previousTitle);
  const candidates = filtered.length > 0 ? filtered : pool;
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return [
    {
      id: 1,
      category: "Strength",
      path: STRENGTH_PATH_ID,
      title: chosen.title,
      instruction: chosen.instruction,
      steps: chosen.steps,
      why: chosen.why,
      examples: chosen.examples,
      minimum: chosen.minimum,
      insight: chosen.insight,
      task: chosen.title,
    },
  ];
};

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [dailyTaskId, setDailyTaskId] = useState<string | null>(null);
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([]);
  const [completed, setCompleted] = useState<boolean[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [expandedQuestIds, setExpandedQuestIds] = useState<Record<number, boolean>>({});
  const [protocolStepChecks, setProtocolStepChecks] = useState<Record<number, boolean[]>>({});
  const [isReady, setIsReady] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [trainingXpState, setTrainingXpState] = useState<TrainingXpState>(createEmptyTrainingXp());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [recentlyCompletedIds, setRecentlyCompletedIds] = useState<Record<number, boolean>>({});
  const [recentlyCompletedPathGain, setRecentlyCompletedPathGain] = useState<Record<number, string>>({});
  const [protocolCompletionFeedback, setProtocolCompletionFeedback] = useState<{
    streak: number;
    streakLine: string | null;
    stronger: boolean;
  } | null>(null);
  const [unlockNotification, setUnlockNotification] = useState<string | null>(null);
  const [pendingPrePromptQuestId, setPendingPrePromptQuestId] = useState<number | null>(null);
  const [prePromptSatisfiedByQuest, setPrePromptSatisfiedByQuest] = useState<Record<number, boolean>>({});
  const [effectInputsByQuest, setEffectInputsByQuest] = useState<QuestEffectInputState>({});
  const [focusTimerSecondsByQuest, setFocusTimerSecondsByQuest] = useState<Record<number, number>>({});
  const [focusTimerRunningByQuest, setFocusTimerRunningByQuest] = useState<Record<number, boolean>>({});
  const [trainingSessionOpen, setTrainingSessionOpen] = useState(false);
  const [sessionOptions, setSessionOptions] = useState<Array<{ entry: StrengthTaskPoolEntry; id: number }>>([]);
  const [sessionActiveQuest, setSessionActiveQuest] = useState<DailyQuest | null>(null);
  const [sessionExecutedById, setSessionExecutedById] = useState<Record<number, boolean>>({});
  const [systemIntegrityScore, setSystemIntegrityScore] = useState(100);
  const [yesterdayDailyMissed, setYesterdayDailyMissed] = useState(false);
  const [yesterdayProtocolTitle, setYesterdayProtocolTitle] = useState<string | null>(null);
  const [expiryMs, setExpiryMs] = useState(() =>
    typeof window !== "undefined" ? msUntilProtocolDeadline() : 0
  );
  const protocolDayKeyRef = useRef<string | null>(null);
  /** Wall-clock start of the extra training session UI (for `session_length_seconds`). */
  const trainingSessionStartedAtRef = useRef<number | null>(null);
  const { isPaidUser, isPaidReady, effectivePro, refresh: refreshPaidAccess } = useProEntitlement();

  useEffect(() => {
    const load = async () => {
      let trainingXpForDaily: TrainingXpState = createEmptyTrainingXp();
      try {
        const hasCompletedOnboarding = window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
        if (!hasCompletedOnboarding) {
          setShowOnboarding(true);
          return;
        }
        setShowOnboarding(false);

        const rawPathXp = window.localStorage.getItem(PATH_XP_STORAGE_KEY);
        let normalizedXp = migrateTrainingXp(rawPathXp ? JSON.parse(rawPathXp) : null);
        normalizedXp = ensureStrengthLine(normalizedXp);

        const resolvedPaid = await refreshPaidAccess();
        const user = await getCurrentUser();
        let profile: ProfileRow | null = null;
        if (user) {
          profile = (await getOrCreateProfile(user.id)) as ProfileRow;
        }
        if (!resolvedPaid) {
          const cap = getMaxXpForFreeTier();
          if (normalizedXp.strength.xp > cap) {
            normalizedXp = ensureStrengthLine({
              ...normalizedXp,
              strength: { xp: cap, level: getPathLevelFromXp(cap) },
            });
          }
        }
        setTrainingXpState(normalizedXp);
        trainingXpForDaily = normalizedXp;
        window.localStorage.setItem(PATH_XP_STORAGE_KEY, JSON.stringify(normalizedXp));
        const metrics = getSystemMetricsFromTrainingXp(normalizedXp);
        setTotalXP(metrics.totalXP);
        setLevel(metrics.level);

        if (!user) {
          setSystemIntegrityScore(loadSystemIntegrityState(getLocalDateKey()).score);
          return;
        }
        if (!profile) return;
        setUserId(user.id);
        const today = getLocalDateKey();

        const { data: todayRow } = await supabase
          .from("daily_tasks")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();

        const { data: previousRows } = await supabase
          .from("daily_tasks")
          .select("*")
          .eq("user_id", user.id)
          .lt("date", today)
          .order("date", { ascending: false })
          .limit(1);
        const previous = previousRows?.[0];
        const previousTasks = hydrateDailyQuests(previous?.tasks);

        let nextStreak = profile.current_streak;
        if (previous) {
          const allDone = Array.isArray(previous.completed) && previous.completed.every(Boolean);
          const gap = dayDiff(previous.date as string, today);
          if (gap > 1 || !allDone) {
            nextStreak = 0;
          }
          await supabase.from("history").upsert({
            user_id: user.id,
            date: previous.date,
            xp_earned: (previous.completed as boolean[]).filter(Boolean).length * 10,
            completed_all: allDone,
            streak: allDone ? profile.current_streak : 0,
          });
        }

        if (todayRow) {
          const hydratedTodayTasks = hydrateDailyQuests(todayRow.tasks);
          const rawCompleted = (todayRow.completed as boolean[]) ?? [];
          let { tasks: singleTasks, completed: singleCompleted } = normalizeSingleStrengthTask(
            hydratedTodayTasks,
            rawCompleted
          );
          const firstTitle = singleTasks[0]?.title ?? singleTasks[0]?.task ?? "";
          if (!resolvedPaid && firstTitle && strengthTaskTitleIsProOnly(firstTitle)) {
            const regenerated = createDailyQuests(previousTasks, trainingXpForDaily, today, false);
            singleTasks = regenerated;
            singleCompleted = Array.from({ length: regenerated.length }, () => false);
            await supabase
              .from("daily_tasks")
              .update({ tasks: singleTasks, completed: singleCompleted })
              .eq("id", todayRow.id);
          }
          setDailyTaskId(String(todayRow.id));
          setDailyQuests(singleTasks);
          setCompleted(singleCompleted);
          if (
            JSON.stringify(singleTasks) !== JSON.stringify(todayRow.tasks) ||
            JSON.stringify(singleCompleted) !== JSON.stringify(todayRow.completed)
          ) {
            await supabase
              .from("daily_tasks")
              .update({ tasks: singleTasks, completed: singleCompleted })
              .eq("id", todayRow.id);
          }
        } else {
          const generated = createDailyQuests(previousTasks, trainingXpForDaily, today, resolvedPaid);
          const initialCompleted = Array.from({ length: generated.length }, () => false);
          const { data: inserted } = await supabase
            .from("daily_tasks")
            .insert({ user_id: user.id, date: today, tasks: generated, completed: initialCompleted })
            .select("id")
            .single();
          setDailyTaskId(inserted?.id ? String(inserted.id) : null);
          setDailyQuests(generated);
          setCompleted(initialCompleted);
        }

        if (nextStreak !== profile.current_streak) {
          await supabase.from("profiles").update({ current_streak: nextStreak }).eq("id", user.id);
        }
        setCurrentStreak(nextStreak);
        setBestStreak(profile.best_streak);

        const yesterdayKey = addDaysToDateKey(today, -1);
        const { data: yesterdayRow } = await supabase
          .from("daily_tasks")
          .select("tasks, completed")
          .eq("user_id", user.id)
          .eq("date", yesterdayKey)
          .maybeSingle();

        let missedYesterday = false;
        let missedYesterdayTitle: string | null = null;
        if (yesterdayRow) {
          const hy = hydrateDailyQuests(yesterdayRow.tasks);
          const yRawCompleted = (yesterdayRow.completed as boolean[]) ?? [];
          const { tasks: ySingleTasks, completed: ySingleCompleted } = normalizeSingleStrengthTask(hy, yRawCompleted);
          if (!ySingleCompleted[0]) {
            missedYesterday = true;
            missedYesterdayTitle = ySingleTasks[0]?.title ?? null;
          }
        }
        setYesterdayDailyMissed(missedYesterday);
        setYesterdayProtocolTitle(missedYesterdayTitle);

        const integrityState = loadSystemIntegrityState(today);
        const { data: pastForIntegrity } = await supabase
          .from("daily_tasks")
          .select("date, completed, tasks")
          .eq("user_id", user.id)
          .lt("date", today)
          .gte("date", integrityState.firstTrackedDateKey)
          .order("date", { ascending: true });

        const missedDates: string[] = [];
        for (const row of pastForIntegrity ?? []) {
          const hydrated = hydrateDailyQuests(row.tasks);
          const rawCompleted = (row.completed as boolean[]) ?? [];
          const { completed: singleCompleted } = normalizeSingleStrengthTask(hydrated, rawCompleted);
          const dateStr = String(row.date);
          if (dateStr >= integrityState.firstTrackedDateKey && !singleCompleted[0]) {
            missedDates.push(dateStr);
          }
        }
        const nextIntegrity = reconcileSkipPenalties(missedDates, integrityState);
        saveSystemIntegrityState(nextIntegrity);
        setSystemIntegrityScore(nextIntegrity.score);
      } finally {
        setIsReady(true);
      }
    };
    load();
  }, [loadVersion, refreshPaidAccess]);

  useEffect(() => {
    if (!isReady) return;
    const tick = () => {
      const todayKey = getLocalDateKey();
      if (protocolDayKeyRef.current !== null && todayKey !== protocolDayKeyRef.current) {
        setLoadVersion((v) => v + 1);
      }
      protocolDayKeyRef.current = todayKey;
      setExpiryMs(msUntilProtocolDeadline());
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [isReady, loadVersion]);

  const xpInCurrentLevel = totalXP % 100;
  const levelProgressPercent = xpInCurrentLevel;
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  };
  const getQuestPathLevel = (_quest: DailyQuest): number => getPathLevelFromXp(trainingXpState.strength?.xp ?? 0);
  const getActiveEffectsForQuest = (quest: DailyQuest): PathUnlock[] =>
    getActivePathUnlocks(STRENGTH_PATH_ID, getQuestPathLevel(quest));
  const getEffectsByType = (quest: DailyQuest, effectType: PathUnlock["effectType"]) =>
    getActiveEffectsForQuest(quest).filter((unlock) => unlock.effectType === effectType);
  const getEffectInput = (questId: number, key: string) => effectInputsByQuest[questId]?.[key] ?? "";
  const setEffectInput = (questId: number, key: string, value: string) => {
    setEffectInputsByQuest((prev) => ({
      ...prev,
      [questId]: {
        ...(prev[questId] ?? {}),
        [key]: value,
      },
    }));
  };
  const getPromptFromConfig = (unlock: PathUnlock, fallback: string) =>
    typeof unlock.effectConfig.prompt === "string" ? unlock.effectConfig.prompt : fallback;
  const getTrackerFields = (unlock: PathUnlock): string[] => {
    const fields = unlock.effectConfig.fields;
    if (Array.isArray(fields)) {
      return fields.filter((value): value is string => typeof value === "string");
    }
    return ["Value"];
  };
  const getEnhancerSteps = (quest: DailyQuest): string[] =>
    getEffectsByType(quest, "protocol_enhancer")
      .map((unlock) => unlock.effectConfig.additionalStep)
      .filter((value): value is string => typeof value === "string");
  const hasAllRequiredPrePrompts = (quest: DailyQuest) => {
    const prompts = getEffectsByType(quest, "pre_protocol_prompt");
    return prompts.every((unlock) => {
      const key = `pre:${unlock.pathId}:${unlock.title}`;
      return Boolean(getEffectInput(quest.id, key).trim());
    });
  };

  const hasAllTrackerInputsForQuest = (quest: DailyQuest) => {
    const trackers = getEffectsByType(quest, "input_tracker");
    if (trackers.length === 0) return true;
    return trackers.every((unlock) => {
      const fields = getTrackerFields(unlock);
      const prefix = `tracker:${unlock.pathId}:${unlock.title}`;
      return fields.every((field) => {
        const fieldKey = `${prefix}:${field}`;
        return Boolean(getEffectInput(quest.id, fieldKey).trim());
      });
    });
  };

  const applyTrainingXpDelta = (delta: number, opts?: { countDailySession?: boolean }) => {
    const paid = effectivePro;
    const sessionsReq = getSessionsRequiredForLevelUp(paid);
    const maxTotalXp = paid ? undefined : getMaxXpForFreeTier();
    setTrainingXpState((prev) => {
      const line = ensureStrengthLine(prev).strength;
      const xpBefore = line.xp;
      const previousPathLevel = getPathLevelFromXp(xpBefore);
      const dateKey = opts?.countDailySession ? getLocalDateKey() : undefined;
      const nextState = applyXpDeltaWithGate(prev, delta, {
        countDailySession: opts?.countDailySession,
        dateKey,
        sessionsRequired: sessionsReq,
        maxTotalXp,
      });
      const xpAfter = nextState.strength.xp;
      const updatedLevel = getPathLevelFromXp(nextState.strength.xp);
      const newlyUnlocked = getNewlyUnlockedForLevel(STRENGTH_PATH_ID, previousPathLevel, updatedLevel);
      if (newlyUnlocked.length > 0) {
        const label = newlyUnlocked.map((u) => u.title).join(" · ");
        setUnlockNotification(`You've unlocked a new training capability: ${label}`);
        window.setTimeout(() => setUnlockNotification(null), 4200);
      } else if (!paid && delta > 0 && xpBefore + delta > xpAfter) {
        window.setTimeout(() => {
          setUnlockNotification(UPGRADE_LIMIT_MESSAGE);
          window.setTimeout(() => setUnlockNotification(null), 5200);
        }, 0);
      }
      window.localStorage.setItem(PATH_XP_STORAGE_KEY, JSON.stringify(nextState));
      const metrics = getSystemMetricsFromTrainingXp(nextState);
      setTotalXP(metrics.totalXP);
      setLevel(metrics.level);
      return nextState;
    });
  };

  const startFocusTimer = (questId: number) => {
    setFocusTimerSecondsByQuest((prev) => ({
      ...prev,
      [questId]: prev[questId] ?? 25 * 60,
    }));
    setFocusTimerRunningByQuest((prev) => ({ ...prev, [questId]: true }));
  };
  const pauseFocusTimer = (questId: number) => {
    setFocusTimerRunningByQuest((prev) => ({ ...prev, [questId]: false }));
  };
  const resetFocusTimer = (questId: number) => {
    setFocusTimerRunningByQuest((prev) => ({ ...prev, [questId]: false }));
    setFocusTimerSecondsByQuest((prev) => ({ ...prev, [questId]: 25 * 60 }));
  };

  useEffect(() => {
    const runningQuestIds = Object.keys(focusTimerRunningByQuest).filter(
      (questId) => focusTimerRunningByQuest[Number(questId)]
    );
    if (runningQuestIds.length === 0) return;
    const timer = window.setInterval(() => {
      setFocusTimerSecondsByQuest((prev) => {
        const next = { ...prev };
        for (const questId of runningQuestIds) {
          const key = Number(questId);
          const current = next[key] ?? 25 * 60;
          if (current <= 1) {
            next[key] = 0;
            setFocusTimerRunningByQuest((running) => ({ ...running, [key]: false }));
          } else {
            next[key] = current - 1;
          }
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focusTimerRunningByQuest]);

  const strengthLevelForEvents = () => getPathLevelFromXp(trainingXpState.strength?.xp ?? 0);

  const handleComplete = async (idx: number) => {
    if (!userId || dailyTaskId === null || completed[idx]) return;
    const quest = dailyQuests[idx];
    if (!quest || !hasAllRequiredPrePrompts(quest) || !hasAllTrackerInputsForQuest(quest)) return;
    const xpBeforeComplete = trainingXpState.strength?.xp ?? 0;
    const nextCompleted = [...completed];
    nextCompleted[idx] = true;
    setCompleted(nextCompleted);
    const questId = dailyQuests[idx]?.id;
    if (typeof questId === "number") {
      setRecentlyCompletedIds((prev) => ({ ...prev, [questId]: true }));
      setRecentlyCompletedPathGain((prev) => ({ ...prev, [questId]: "+10 XP" }));
      window.setTimeout(() => {
        setRecentlyCompletedIds((prev) => ({ ...prev, [questId]: false }));
        setRecentlyCompletedPathGain((prev) => {
          const next = { ...prev };
          delete next[questId];
          return next;
        });
      }, 1200);
    }

    applyTrainingXpDelta(10, { countDailySession: idx === 0 });

    let strongerThanLast = false;
    if (idx === 0) {
      const trackers = getEffectsByType(quest, "input_tracker");
      const collected = collectTrackerStringsFromQuest(quest.id, getEffectInput, trackers);
      if (collected) {
        appendPerformanceSession(
          buildSessionEntry(getLocalDateKey(), collected.lift, collected.setsReps, collected.load)
        );
        const { previous, current } = getLastTwoSessions();
        strongerThanLast = getStrengthIdentityLine(previous, current) !== null;
      }
      const si = loadSystemIntegrityState(getLocalDateKey());
      const bumped = recordProtocolComplete(si);
      saveSystemIntegrityState(bumped);
      setSystemIntegrityScore(bumped.score);
    }

    await supabase.from("daily_tasks").update({ completed: nextCompleted }).eq("id", dailyTaskId);

    if (idx === 0 && userId) {
      logUserEvent(userId, USER_EVENT_TYPES.PROTOCOL_COMPLETED, {
        quest_id: quest.id,
        protocol_title: quest.title,
        strength_level: getPathLevelFromXp(xpBeforeComplete + 10),
      });
    }

    const allDone = nextCompleted.every(Boolean);
    let streakAfterComplete = currentStreak;
    if (allDone) {
      const nextStreak = currentStreak + 1;
      streakAfterComplete = nextStreak;
      const nextBest = Math.max(bestStreak, nextStreak);
      setCurrentStreak(nextStreak);
      setBestStreak(nextBest);
      await supabase
        .from("profiles")
        .update({ current_streak: nextStreak, best_streak: nextBest })
        .eq("id", userId);
      await supabase.from("history").upsert({
        user_id: userId,
        date: getLocalDateKey(),
        xp_earned: nextCompleted.filter(Boolean).length * 10,
        completed_all: true,
        streak: nextStreak,
      });
    }

    if (idx === 0) {
      setProtocolCompletionFeedback({
        streak: streakAfterComplete,
        streakLine: formatStreakIdentityLine(streakAfterComplete),
        stronger: strongerThanLast,
      });
    }
  };

  const openTrainingSession = () => {
    if (!effectivePro) {
      setUnlockNotification(`${UPGRADE_LIMIT_MESSAGE} · Full system required for extra sessions.`);
      window.setTimeout(() => setUnlockNotification(null), 5200);
      window.open(GUMROAD_ASCEND_CHECKOUT_URL, "_blank", "noopener,noreferrer");
      return;
    }
    const pathLevel = getPathLevelFromXp(trainingXpState.strength?.xp ?? 0);
    const pool = getStrengthTrainingPoolForPathLevel(pathLevel, { isPaidUser: true });
    const dailyTitle = dailyQuests[0]?.title ?? "";
    const filtered = pool.filter((e) => e.title !== dailyTitle);
    const usePool = filtered.length > 0 ? filtered : pool;
    const rows = usePool.map((entry, i) => ({
      entry,
      id: SESSION_QUEST_ID_BASE + i,
    }));
    setSessionOptions(rows);
    setSessionExecutedById({});
    setSessionActiveQuest(null);
    setTrainingSessionOpen(true);
    if (userId) {
      logUserEvent(userId, USER_EVENT_TYPES.SESSION_STARTED, {});
    }
  };

  useEffect(() => {
    if (effectivePro) return;
    setTrainingSessionOpen(false);
    setSessionOptions([]);
    setSessionActiveQuest(null);
    setSessionExecutedById({});
  }, [effectivePro]);

  const handleSessionProtocolExecute = (quest: DailyQuest) => {
    if (sessionExecutedById[quest.id]) return;
    if (!hasAllRequiredPrePrompts(quest) || !hasAllTrackerInputsForQuest(quest)) return;
    setSessionExecutedById((prev) => ({ ...prev, [quest.id]: true }));
    applyTrainingXpDelta(SESSION_PROTOCOL_XP);
    setRecentlyCompletedIds((prev) => ({ ...prev, [quest.id]: true }));
    setRecentlyCompletedPathGain((prev) => ({ ...prev, [quest.id]: `+${SESSION_PROTOCOL_XP} XP` }));
    window.setTimeout(() => {
      setRecentlyCompletedIds((prev) => ({ ...prev, [quest.id]: false }));
      setRecentlyCompletedPathGain((prev) => {
        const next = { ...prev };
        delete next[quest.id];
        return next;
      });
    }, 1200);
  };

  const endTrainingSession = () => {
    const extraCount = Object.values(sessionExecutedById).filter(Boolean).length;
    const sessionStartedAt = trainingSessionStartedAtRef.current;
    trainingSessionStartedAtRef.current = null;
    const sessionLengthSeconds =
      sessionStartedAt != null ? Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000)) : undefined;
    if (userId) {
      logUserEvent(userId, USER_EVENT_TYPES.SESSION_COMPLETED, {
        extra_protocols_completed: extraCount,
        strength_level: strengthLevelForEvents(),
        ...(sessionLengthSeconds != null ? { session_length_seconds: sessionLengthSeconds } : {}),
      });
    }
    if (extraCount >= 1) {
      applyTrainingXpDelta(SESSION_COMPLETION_BONUS_XP);
      setUnlockNotification(`Session ended · +${SESSION_COMPLETION_BONUS_XP} bonus XP`);
      window.setTimeout(() => setUnlockNotification(null), 2800);
    }
    setTrainingSessionOpen(false);
    setSessionOptions([]);
    setSessionActiveQuest(null);
    setSessionExecutedById({});
  };

  const toggleProtocol = (questId: number, stepCount: number) => {
    setExpandedQuestIds((prev) => {
      const nextOpen = !prev[questId];
      if (nextOpen) {
        setProtocolStepChecks((current) => {
          if (current[questId]) return current;
          return { ...current, [questId]: Array.from({ length: stepCount }, () => false) };
        });
      }
      return { ...prev, [questId]: nextOpen };
    });
  };
  const handleStartProtocol = (
    quest: DailyQuest,
    stepCount: number,
    mode: { kind: "daily" | "session" }
  ) => {
    const hasPrePromptEffects = getEffectsByType(quest, "pre_protocol_prompt").length > 0;
    if (hasPrePromptEffects && !prePromptSatisfiedByQuest[quest.id] && !expandedQuestIds[quest.id]) {
      setPendingPrePromptQuestId(quest.id);
      return;
    }
    if (!expandedQuestIds[quest.id] && userId) {
      logUserEvent(userId, USER_EVENT_TYPES.PROTOCOL_STARTED, {
        scope: mode.kind,
        quest_id: quest.id,
        protocol_title: quest.title,
        strength_level: strengthLevelForEvents(),
      });
    }
    toggleProtocol(quest.id, stepCount);
  };

  const toggleProtocolStep = (questId: number, stepIdx: number) => {
    setProtocolStepChecks((prev) => {
      const current = prev[questId] ?? [];
      const next = [...current];
      next[stepIdx] = !next[stepIdx];
      return { ...prev, [questId]: next };
    });
  };

  const renderProtocolBlock = (quest: DailyQuest, mode: { kind: "daily"; idx: number } | { kind: "session" }) => {
    const isDone = mode.kind === "daily" ? completed[mode.idx] : Boolean(sessionExecutedById[quest.id]);
    const xpFallback = mode.kind === "daily" ? "+10 XP" : `+${SESSION_PROTOCOL_XP} XP`;
    const onExecute = () => {
      if (mode.kind === "daily") {
        void handleComplete(mode.idx);
      } else {
        handleSessionProtocolExecute(quest);
      }
    };
    const details = getProtocolDetailFromQuest(quest);
    const isRecentlyCompleted = Boolean(recentlyCompletedIds[quest.id]);
    const stepChecks = protocolStepChecks[quest.id] ?? [];
    const stepsCompleted = stepChecks.filter(Boolean).length;
    const questPathLevel = getQuestPathLevel(quest);
    const protocolReady = hasAllRequiredPrePrompts(quest) && hasAllTrackerInputsForQuest(quest);
    const prePromptEffects = getEffectsByType(quest, "pre_protocol_prompt");
    const postReflectionEffects = getEffectsByType(quest, "post_protocol_reflection");
    const inputTrackerEffects = getEffectsByType(quest, "input_tracker");
    const uiModifierEffects = getEffectsByType(quest, "ui_modifier");
    const autoregulationEffects = getEffectsByType(quest, "autoregulation");
    const enhancerSteps = getEnhancerSteps(quest);
    const renderedSteps = [...details.steps, ...enhancerSteps];
    const protocolProgressPercent =
      renderedSteps.length > 0 ? Math.round((stepsCompleted / renderedSteps.length) * 100) : 0;
    const isProtocolOpen = Boolean(expandedQuestIds[quest.id]);
    const focusSeconds = focusTimerSecondsByQuest[quest.id] ?? 25 * 60;
    const focusRunning = Boolean(focusTimerRunningByQuest[quest.id]);
    return (
      <li
        key={quest.id}
        className={`rounded-xl border px-4 py-5 transition-all duration-300 ${
          isRecentlyCompleted
            ? "border-emerald-500/25 bg-emerald-950/20"
            : "border-zinc-800 bg-zinc-900/40"
        }`}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              {STRENGTH_BELT_LABELS[getStrengthBeltFromPathLevel(questPathLevel)]} · L{questPathLevel}
            </p>
            <p className={`mt-2 text-base font-medium leading-snug ${isDone ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
              {quest.title}
            </p>
            {isRecentlyCompleted && (
              <p className="mt-2 text-xs font-medium text-emerald-400/90">{recentlyCompletedPathGain[quest.id] ?? xpFallback}</p>
            )}
            {isProtocolOpen && !isDone && (
              <p className="mt-2 text-xs text-zinc-500">
                {stepsCompleted}/{renderedSteps.length} steps
              </p>
            )}
          </div>
          <button
            type="button"
            className="w-full rounded-lg bg-zinc-100 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            disabled={isDone || !protocolReady}
            onClick={onExecute}
          >
            {isDone ? "Executed" : "Execute"}
          </button>
          {!isDone && !protocolReady && (
            <p className="text-center text-xs text-amber-400/95">
              Unlock required to progress further — complete movement focus and session log above.
            </p>
          )}
          {!isDone && (
            <button
              type="button"
              className="text-center text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
              onClick={() => handleStartProtocol(quest, renderedSteps.length, mode)}
            >
              {expandedQuestIds[quest.id] ? "Hide training protocol" : "Training protocol details"}
            </button>
          )}
        </div>
        {pendingPrePromptQuestId === quest.id && prePromptEffects.length > 0 && !expandedQuestIds[quest.id] && (
          <div className="mt-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-3">
            <p className="text-xs text-zinc-300">Before you execute</p>
            <div className="mt-2 space-y-2">
              {prePromptEffects.map((unlock) => {
                const key = `pre:${unlock.pathId}:${unlock.title}`;
                return (
                  <div key={key}>
                    <p className="text-[11px] text-zinc-400">{getPromptFromConfig(unlock, "Provide input")}</p>
                    <input
                      value={getEffectInput(quest.id, key)}
                      onChange={(event) => setEffectInput(quest.id, key, event.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="rounded-full border border-zinc-500 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-400"
                disabled={!hasAllRequiredPrePrompts(quest)}
                onClick={() => {
                  setPendingPrePromptQuestId(null);
                  setPrePromptSatisfiedByQuest((prev) => ({ ...prev, [quest.id]: true }));
                  if (userId) {
                    logUserEvent(userId, USER_EVENT_TYPES.PROTOCOL_STARTED, {
                      scope: mode.kind,
                      quest_id: quest.id,
                      protocol_title: quest.title,
                      strength_level: strengthLevelForEvents(),
                      via: "pre_prompt_continue",
                    });
                  }
                  toggleProtocol(quest.id, renderedSteps.length);
                }}
              >
                Continue
              </button>
            </div>
          </div>
        )}
        {expandedQuestIds[quest.id] && (
          <div className="mt-4 border-t border-zinc-700/70 pt-4 text-sm text-zinc-300">
            {prePromptEffects.map((unlock) => {
              const key = `pre:${unlock.pathId}:${unlock.title}`;
              const value = getEffectInput(quest.id, key);
              if (!value) return null;
              return (
                <p key={key} className="mb-2 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300">
                  {unlock.title}: {value}
                </p>
              );
            })}
            {uiModifierEffects.some(
              (unlock) => typeof unlock.effectConfig.uiKind === "string" && unlock.effectConfig.uiKind === "focus_timer_25m"
            ) && (
              <div className="mb-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2">
                <p className="text-xs text-zinc-300">Focus block timer (25 min)</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-100">{formatDuration(focusSeconds)}</p>
                  <div className="flex items-center gap-2">
                    {focusRunning ? (
                      <button
                        type="button"
                        className="rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                        onClick={() => pauseFocusTimer(quest.id)}
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                        onClick={() => startFocusTimer(quest.id)}
                      >
                        Start
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                      onClick={() => resetFocusTimer(quest.id)}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
            {uiModifierEffects
              .map((unlock) => unlock.effectConfig.hint)
              .filter((hint): hint is string => typeof hint === "string")
              .map((hint) => (
                <p key={hint} className="mb-2 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400">
                  {hint}
                </p>
              ))}
            {inputTrackerEffects.map((unlock) => {
              const fields = getTrackerFields(unlock);
              const prefix = `tracker:${unlock.pathId}:${unlock.title}`;
              return (
                <div key={prefix} className="mb-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2">
                  <p className="text-xs text-zinc-300">
                    {getPromptFromConfig(unlock, `${unlock.title} tracker`)}
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {fields.map((field) => {
                      const fieldKey = `${prefix}:${field}`;
                      return (
                        <input
                          key={fieldKey}
                          value={getEffectInput(quest.id, fieldKey)}
                          onChange={(event) => setEffectInput(quest.id, fieldKey, event.target.value)}
                          placeholder={field}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {autoregulationEffects.map((unlock) => {
              const key = `auto:${unlock.pathId}:${unlock.title}`;
              const raw = unlock.effectConfig.options;
              const options = Array.isArray(raw)
                ? raw.filter((o): o is string => typeof o === "string")
                : ["Reduce volume", "Maintain plan", "Push progression"];
              const choice = getEffectInput(quest.id, key);
              const hint =
                choice === "Reduce volume"
                  ? "Today: remove one working set or use 5–10% less load. Prioritize crisp reps."
                  : choice === "Maintain plan"
                    ? "Execute the protocol as written—no extra volume."
                    : choice === "Push progression"
                      ? "Add one rep, a small load bump, or one extra quality set if bar speed stays high."
                      : null;
              return (
                <div key={key} className="mb-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2">
                  <p className="text-xs text-zinc-300">{getPromptFromConfig(unlock, "Session adjustment")}</p>
                  <select
                    value={choice}
                    onChange={(event) => setEffectInput(quest.id, key, event.target.value)}
                    className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                  >
                    <option value="">Select intensity…</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {hint && <p className="mt-2 text-[11px] text-zinc-500">{hint}</p>}
                </div>
              );
            })}
            <div className="mb-3 rounded-lg border border-zinc-700/80 bg-zinc-900/70 px-3 py-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Training protocol progress</span>
                <span>
                  {stepsCompleted}/{renderedSteps.length}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-300 transition-all duration-300"
                  style={{ width: `${protocolProgressPercent}%` }}
                />
              </div>
            </div>
            <p><span className="text-zinc-500">Execution:</span> {details.instruction}</p>
            <div className="mt-3">
              <p className="text-zinc-500">Step-by-step</p>
              <ul className="mt-2 space-y-2">
                {renderedSteps.map((step, stepIdx) => {
                  const checked = protocolStepChecks[quest.id]?.[stepIdx] ?? false;
                  return (
                    <li key={`${quest.id}-${stepIdx}`} className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => toggleProtocolStep(quest.id, stepIdx)}
                        className={`mt-0.5 h-4 w-4 rounded border transition-colors ${
                          checked
                            ? "border-zinc-300 bg-zinc-200"
                            : "border-zinc-600 bg-zinc-900"
                        }`}
                        aria-label={`Toggle step ${stepIdx + 1}`}
                      />
                      <span className={checked ? "text-zinc-500 line-through" : "text-zinc-300"}>
                        {stepIdx + 1}. {step}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="mt-3"><span className="text-zinc-500">Why it matters:</span> {details.whyItMatters}</p>
            <p className="mt-2"><span className="text-zinc-500">Insight:</span> {details.insight}</p>
            <p className="mt-2"><span className="text-zinc-500">Examples:</span> {details.examples.join(", ")}</p>
            <p className="mt-2"><span className="text-zinc-500">Minimum viable:</span> {details.minimumViable}</p>
          </div>
        )}
        {isDone &&
          postReflectionEffects.map((unlock) => {
            const key = `reflect:${unlock.pathId}:${unlock.title}`;
            return (
              <div key={key} className="mt-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-3">
                <p className="text-xs text-zinc-300">{getPromptFromConfig(unlock, "Reflect on this training protocol")}</p>
                <textarea
                  value={getEffectInput(quest.id, key)}
                  onChange={(event) => setEffectInput(quest.id, key, event.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                  rows={3}
                />
              </div>
            );
          })}
      </li>
    );
  };

  if (!isReady) return <LoadingScreen label="Loading…" />;

  if (showOnboarding) {
    const isFinalStep = onboardingStep === ONBOARDING_STEPS.length - 1;
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center justify-center px-4 py-8">
          <section className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/95 px-8 py-12 text-center shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Step {onboardingStep + 1} of {ONBOARDING_STEPS.length}
            </p>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              {ONBOARDING_STEPS[onboardingStep]}
            </h1>
            <button
              className="mx-auto mt-10 w-full max-w-sm rounded-full border border-zinc-500 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-all duration-200 hover:border-zinc-300 hover:bg-white"
              onClick={() => {
                if (!isFinalStep) {
                  setOnboardingStep((step) => Math.min(step + 1, ONBOARDING_STEPS.length - 1));
                  return;
                }
                window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
                setShowOnboarding(false);
                setLoadVersion((v) => v + 1);
              }}
            >
              {isFinalStep ? "Begin Ascending" : "Continue"}
            </button>
          </section>
        </main>
      </div>
    );
  }

  if (!isPaidReady) {
    return <LoadingScreen label="Loading…" />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {protocolCompletionFeedback && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700/90 bg-zinc-900/95 px-6 py-7 text-left shadow-[0_24px_80px_-40px_rgba(255,255,255,0.2)] transition-all duration-300">
            <p className="text-xl font-semibold leading-snug tracking-tight text-zinc-50">{PROTOCOL_COMPLETION_HEADLINE}</p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{PROTOCOL_COMPLETION_CONTEXT}</p>
            {protocolCompletionFeedback.streakLine && (
              <p className="mt-5 text-sm leading-relaxed text-zinc-300">{protocolCompletionFeedback.streakLine}</p>
            )}
            {protocolCompletionFeedback.stronger && (
              <p className="mt-4 text-sm font-medium leading-relaxed text-emerald-500/90">
                {"You're stronger than last session"}
              </p>
            )}
            <button
              type="button"
              className="mt-8 w-full rounded-full border border-zinc-600 bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors duration-200 hover:border-zinc-400 hover:bg-white"
              onClick={() => setProtocolCompletionFeedback(null)}
            >
              Continue
            </button>
          </div>
        </div>
      )}
      {unlockNotification && (
        <div className="fixed right-4 top-20 z-[65] max-w-sm rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-2.5 text-left text-xs leading-snug text-zinc-200 shadow-[0_12px_40px_-25px_rgba(255,255,255,0.35)]">
          {unlockNotification}
        </div>
      )}
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl justify-center px-4 py-10">
        <section className="w-full max-w-md">
          <header className="mb-8 border-b border-zinc-800/90 pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400/90">Strength System Active</p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-zinc-50">Level {level}</p>
              <p className="text-sm text-zinc-500">{getCurrentRank(level)}</p>
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Experience</span>
                <span className="tabular-nums text-zinc-400">
                  {xpInCurrentLevel}/100 XP
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500/85 transition-[width] duration-300"
                  style={{ width: `${levelProgressPercent}%` }}
                />
              </div>
              {(() => {
                const prog = getProgressionSummary(trainingXpState, {
                  sessionsRequired: getSessionsRequiredForLevelUp(effectivePro),
                });
                return (
                  <div className="mt-4 space-y-1.5 border-t border-zinc-800/80 pt-4">
                    <p className="text-[11px] text-zinc-400">
                      <span className="tabular-nums text-zinc-200">
                        {prog.sessionsTowardNextLevel}/{prog.sessionsRequired}
                      </span>{" "}
                      sessions completed to advance
                    </p>
                    {prog.atXpCapForLevel && !prog.canLevelUpWithCurrentXp && (
                      <p className="text-[11px] leading-snug text-amber-400/90">
                        XP capped at this level — complete {prog.sessionsRequired} distinct daily protocols before you can level up.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
              System Integrity:{" "}
              <span className="tabular-nums text-zinc-400">{systemIntegrityScore}%</span>
              <span className="text-zinc-600"> · {getIntegrityStatusLabel(systemIntegrityScore)}</span>
            </p>
            {(() => {
              const streakLine = formatStreakIdentityLine(currentStreak);
              return streakLine ? (
                <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">{streakLine}</p>
              ) : null;
            })()}
          </header>

          {isPaidReady && !isPaidUser && level >= FREE_MAX_PATH_LEVEL && (
            <div className="mb-5 rounded-lg border border-zinc-800/80 bg-zinc-900/35 px-3 py-2.5">
              <p className="text-[11px] leading-relaxed text-zinc-500">
                {UPGRADE_LIMIT_MESSAGE}.{" "}
                <a
                  href={GUMROAD_ASCEND_CHECKOUT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-zinc-300 underline-offset-2 hover:text-zinc-100 hover:underline"
                >
                  Get Early Access on Gumroad
                </a>
              </p>
              <div className="mt-2 border-t border-zinc-800/50 pt-2">
                <RefreshAccessButton />
              </div>
            </div>
          )}

          <p className="mb-2 text-sm font-medium leading-snug text-zinc-200">
            {getTodayFocusHeadline(
              getEffectiveTrainingFocus(new Date(), getPathLevelFromXp(trainingXpState.strength?.xp ?? 0), {
                forceFreeTierSchedule: !effectivePro,
              })
            )}
          </p>
          {getPathLevelFromXp(trainingXpState.strength?.xp ?? 0) < SPLIT_TRAINING_UNLOCK_LEVEL && (
            <p className="mb-3 text-[11px] text-zinc-600">
              Until Level {SPLIT_TRAINING_UNLOCK_LEVEL}, each training day uses a full-body protocol.
            </p>
          )}
          {(() => {
            const nextUnlock = getNextStrengthUnlock(
              STRENGTH_PATH_ID,
              effectiveLevelForPathUnlocks(
                getPathLevelFromXp(trainingXpState.strength?.xp ?? 0),
                effectivePro
              )
            );
            if (!nextUnlock) return null;
            return (
              <p className="mb-4 text-[11px] leading-relaxed text-zinc-500">
                Unlock required to progress further — reach Level {nextUnlock.levelRequirement} for {nextUnlock.title}.
              </p>
            );
          })()}

          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Today's training protocol</h2>
          <div className="mb-4 space-y-2">
            {yesterdayDailyMissed && (
              <p className="text-[11px] leading-relaxed text-amber-500/85">{"You missed today's session"}</p>
            )}
            {dailyQuests.length > 0 && !completed[0] && (
              <p className="text-[11px] text-zinc-500">
                {"Today's Protocol expires in "}
                {formatExpiresInHoursLabel(expiryMs)}
              </p>
            )}
          </div>
          {yesterdayDailyMissed && yesterdayProtocolTitle && (
            <div className="mb-4 rounded-lg border border-zinc-800/90 bg-zinc-900/35 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Missed</p>
              <p className="mt-1 text-sm text-zinc-500 line-through">{yesterdayProtocolTitle}</p>
            </div>
          )}
          <ul className="flex flex-col gap-4">
            {dailyQuests.map((quest, idx) => renderProtocolBlock(quest, { kind: "daily", idx }))}
          </ul>
          {dailyQuests.length > 0 && completed[0] && !trainingSessionOpen && (
            <div className="mt-6">
              {effectivePro ? (
                <button
                  type="button"
                  onClick={openTrainingSession}
                  className="w-full rounded-xl border border-emerald-500/25 bg-emerald-950/15 py-3 text-sm font-semibold text-emerald-100/95 transition-colors hover:border-emerald-400/40 hover:bg-emerald-950/30"
                >
                  Continue training
                </button>
              ) : (
                <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/35 px-4 py-4 text-center">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Pro</p>
                  <p className="mt-2 text-sm text-zinc-400">Extra training session is locked.</p>
                  <a
                    href={GUMROAD_ASCEND_CHECKOUT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-xs font-medium text-zinc-300 underline-offset-2 hover:text-zinc-100 hover:underline"
                  >
                    Get Early Access on Gumroad
                  </a>
                </div>
              )}
            </div>
          )}
          {trainingSessionOpen && (
            <div className="mt-8 rounded-xl border border-zinc-800/90 bg-zinc-900/25 px-4 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Training session</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Add protocols from your unlocked pool. {SESSION_PROTOCOL_XP} XP each · end the session for +{SESSION_COMPLETION_BONUS_XP} bonus XP after at least one extra protocol.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {sessionOptions.map(({ entry, id }) => {
                  const active = sessionActiveQuest?.id === id;
                  const done = Boolean(sessionExecutedById[id]);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSessionActiveQuest(poolEntryToDailyQuest(entry, id))}
                      className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        active
                          ? "border-emerald-500/35 bg-emerald-950/20 text-zinc-100"
                          : done
                            ? "border-zinc-700/80 bg-zinc-900/40 text-zinc-500"
                            : "border-zinc-800 bg-zinc-950/30 text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      <span className="font-medium">{entry.title}</span>
                      {done ? <span className="ml-2 text-xs text-emerald-500/90">Executed</span> : null}
                    </button>
                  );
                })}
              </div>
              {sessionActiveQuest ? (
                <div className="mt-6">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Active protocol</p>
                  <ul className="flex flex-col gap-4">{renderProtocolBlock(sessionActiveQuest, { kind: "session" })}</ul>
                </div>
              ) : (
                <p className="mt-5 text-center text-xs text-zinc-600">Select a protocol to run it.</p>
              )}
              <button
                type="button"
                onClick={endTrainingSession}
                className="mt-6 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                End training session
              </button>
            </div>
          )}
          <p className="mt-8 text-center text-xs text-zinc-600">
            Streak {currentStreak} · Best {bestStreak}
          </p>
        </section>
      </main>
    </div>
  );
}