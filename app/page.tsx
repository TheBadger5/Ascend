"use client";
import { useEffect, useRef, useState } from "react";
import {
  createEmptyTrainingXp,
  ensureStrengthLine,
  getPathLevelFromXp,
  getSystemMetricsFromTrainingXp,
  STRENGTH_UNLOCK_PATH_ID,
  type TrainingXpState,
} from "@/lib/ascend-path-config";
import { applyXpDeltaWithGate, getProgressionSummary } from "@/lib/progression-gate";
import {
  FREE_MAX_PATH_LEVEL,
  getMaxXpForFreeTier,
  getSessionsRequiredForLevelUp,
  UPGRADE_LIMIT_MESSAGE,
} from "@/lib/monetization";
import {
  FIRST_SYSTEM_MOMENT_LINE_1,
  FIRST_SYSTEM_MOMENT_LINE_2,
  FIRST_SYSTEM_MOMENT_STORAGE_KEY,
  HOME_HERO_HEADLINE,
  HOME_HERO_SUBHEADLINE,
} from "@/lib/pro-conversion-copy";
import { getCurrentUser, type ProfileRow } from "@/lib/ascend-data";
import {
  getActivePathUnlocks,
  getNewlyUnlockedForLevel,
  getNextStrengthUnlock,
  getPathUnlocks,
  type PathUnlock,
} from "@/lib/path-unlocks";
import {
  findStrengthTaskByTitle,
  getStrengthBeltFromPathLevel,
  strengthTaskTitleIsProOnly,
  STRENGTH_BELT_LABELS,
} from "@/lib/strength-progression";
import {
  applySessionVolumeScale,
  getGymSessionForDate,
  getTodayTrainingHeadline,
  identifyGymSessionForDateAndSteps,
  toExerciseStep,
  type GymSession,
} from "@/lib/weekly-gym-program";
import {
  fetchExerciseVolumeRowsForRange,
  fetchExercisePerformanceRowsForNames,
  fetchExercisePerformanceRowsForRange,
  fetchLatestExerciseHistory,
  formatLastPerformance,
  getDoubleProgressionTarget,
  getExerciseLogVolume,
  normalizeExerciseName,
  parseExerciseSpecsFromSteps,
  parseRepsCsv,
  saveExerciseSessionLogs,
  type EffortRating,
  type ExerciseHistoryRow,
  type ExerciseSessionLogInsert,
} from "@/lib/exercise-progression";
import {
  calculateWeeklyVolumeByMuscle,
  getProgramWeekInfo,
  getSessionAutoAdjustment,
  type WeeklyVolumeByMuscle,
} from "@/lib/volume-fatigue";
import {
  PROTOCOL_COMPLETION_CONTEXT,
  PROTOCOL_COMPLETION_HEADLINE,
  PROTOCOL_COMPLETION_SUBLINE,
  STRONGER_THAN_LAST_SESSION_LINE,
  STREAK_CHAIN_REMINDER,
  formatStreakIdentityLine,
} from "@/lib/emotional-feedback";
import {
  INTEGRITY_PRESSURE_HINT,
  MISSED_YESTERDAY_SESSION,
  URGENCY_MAINTAIN_SYSTEM,
  streakPressureLine,
  trainingProtocolExpirySentence,
} from "@/lib/pressure-copy";
import {
  appendPerformanceSession,
  buildSessionEntry,
  collectTrackerStringsFromQuest,
  getLastTwoSessions,
  getStrengthIdentityLine,
} from "@/lib/performance-tracking";
import { addDaysToDateKey, msUntilProtocolDeadline } from "@/lib/daily-protocol-urgency";
import {
  getIntegrityStatusLabel,
  loadSystemIntegrityState,
  reconcileSkipPenalties,
  recordProtocolComplete,
  saveSystemIntegrityState,
} from "@/lib/system-integrity";
import { logProfileTableDebug } from "@/lib/profile-supabase-debug";
import { supabase } from "@/lib/supabase";
import { logUserEvent, USER_EVENT_TYPES } from "@/lib/user-events";
import ProLockedCard from "@/components/pro-locked-card";
import LoadingScreen from "./loading-screen";
import { effectiveLevelForPathUnlocks } from "@/lib/pro-gating";
import {
  getStrengthRank,
  loadStrengthIdentitySnapshot,
  nextIdentityNotice,
  saveStrengthIdentitySnapshot,
} from "@/lib/strength-identity";
import {
  formatUnlockCelebration,
  lockedPathTeaser,
  nextUnlockAnticipationLine,
  unlockLevelPreviewLine,
} from "@/lib/unlock-messaging";
import {
  applyReadinessAdjustments,
  loadReadinessForDate,
  saveReadinessForDate,
  SESSION_ADJUSTED_MESSAGE,
  type ReadinessLevel,
} from "@/lib/readiness-adjust";
import {
  STAY_CONSISTENT_REMINDER,
  formatNextSessionAvailableLine,
  formatWeeklyGoalLine,
  formatXpToNextLevelLine,
  mondayDateKeyForLocalWeekContaining,
  sundayDateKeyFromMonday,
} from "@/lib/retention-loops";
import { useProEntitlement } from "@/lib/use-pro-entitlement";
import { readStrengthXpFromStorage, saveStrengthXpToStorage } from "@/lib/strength-xp-store";
import {
  loadSupabaseBackedStrengthXp,
  logTrainingSessionToSupabase,
  persistStrengthXpToSupabase,
} from "@/lib/strength-xp-sync";
import {
  parseTrainingLevel,
  progressionSpeedForTrainingLevel,
  TRAINING_LEVEL_STORAGE_KEY,
  trainingLevelLabel,
  type TrainingLevel,
} from "@/lib/training-level";
const ONBOARDING_STORAGE_KEY = "ascend.onboarding.completed.v1";
const ONBOARDING_STEPS = [
  "A system to build strength, discipline, and a powerful body.",
  "Ascend is strength training: one training protocol each day, executed with intent.",
  "Every session earns XP. Three daily completions unlock the next level — no shortcuts.",
  "You are not chasing motivation. You are building a body that shows up.",
] as const;
const STRENGTH_PATH_ID = STRENGTH_UNLOCK_PATH_ID;
const formatStrengthXpGain = (xp: number) => `+${xp} Strength XP`;
const COMPOUND_LIFT_KEYWORDS = [
  "squat",
  "deadlift",
  "bench",
  "overhead press",
  "row",
  "pull-up",
  "pulldown",
];
const readinessFeedbackLine = (readiness: ReadinessLevel): string | null => {
  if (readiness === "fresh") return "Volume increased today. Load targets nudged up.";
  if (readiness === "tired") return "Volume reduced due to fatigue. Load targets nudged down.";
  return null;
};
const readinessForTrainingLevel = (readiness: ReadinessLevel, level: TrainingLevel): ReadinessLevel => {
  if (level === "beginner" && readiness === "fresh") return "normal";
  if (level === "advanced" && readiness === "tired") return "normal";
  return readiness;
};
const getExerciseIntentLabel = (exerciseName: string, index: number): "Main Lift" | "Accessory" | "Volume Builder" => {
  const n = exerciseName.toLowerCase();
  if (COMPOUND_LIFT_KEYWORDS.some((k) => n.includes(k)) || index <= 1) return "Main Lift";
  if (index <= 3) return "Accessory";
  return "Volume Builder";
};
const repRangeForTrainingLevel = (level: TrainingLevel, repLabel: string): string => {
  if (level === "beginner") return "8-12";
  if (level === "advanced") {
    const lower = repLabel.includes("12") || repLabel.includes("15");
    return lower ? "6-10" : "4-8";
  }
  return "6-10";
};
const setLabelForTrainingLevel = (level: TrainingLevel, setLabel: string): string => {
  const m = setLabel.match(/(\d+)(?:-(\d+))?/);
  if (!m) return setLabel;
  const min = Number.parseInt(m[1] ?? "0", 10);
  const max = m[2] ? Number.parseInt(m[2], 10) : min;
  if (!Number.isFinite(min) || min <= 0 || !Number.isFinite(max) || max <= 0) return setLabel;
  const scale = level === "beginner" ? 0.85 : level === "advanced" ? 1.2 : 1;
  const nMin = Math.max(1, Math.round(min * scale));
  const nMax = Math.max(nMin, Math.round(max * scale));
  return nMin === nMax ? String(nMin) : `${nMin}-${nMax}`;
};
const PRO_PROGRESS_MOMENT_PROMPT_KEY = "ascend.pro-progress-prompt.v1";
const EMPTY_WEEKLY_VOLUME: WeeklyVolumeByMuscle = {
  chest: 0,
  back: 0,
  shoulders: 0,
  quads: 0,
  hamstrings_glutes: 0,
  arms: 0,
  core: 0,
};
const EFFORT_OPTIONS: Array<{ value: EffortRating; label: string }> = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "hard", label: "Hard" },
  { value: "very_hard", label: "Very Hard" },
];

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

type UndoCompletionRecord =
  | {
      kind: "daily";
      dateKey: string;
      questId: number;
      previousXpState: TrainingXpState;
      previousCompleted: boolean[];
      xpAwarded: number;
      allDoneBeforeUndo: boolean;
    };
type ExerciseInputField = "weight" | "reps" | "sets" | "effort";

const getExerciseInputKey = (questId: number, exerciseName: string, field: ExerciseInputField): string =>
  `exercise:${questId}:${normalizeExerciseName(exerciseName)}:${field}`;

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

const tightenRepRange = (label: string): string => {
  const m = label.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return label;
  const lo = Number.parseInt(m[1] ?? "0", 10);
  const hi = Number.parseInt(m[2] ?? "0", 10);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo <= 0 || hi <= lo) return label;
  const nextLo = Math.max(2, lo - 1);
  const nextHi = Math.max(nextLo + 1, hi - 2);
  return label.replace(m[0], `${nextLo}-${nextHi}`);
};

const createDailyQuests = (
  previous: DailyQuest[] = [],
  trainingXp: TrainingXpState = createEmptyTrainingXp(),
  dateKey: string = getLocalDateKey(),
  isPaidUser = false,
  weeklyVolume: WeeklyVolumeByMuscle = EMPTY_WEEKLY_VOLUME,
  sessionOverride: GymSession | null = null,
  trainingLevel: TrainingLevel = "intermediate"
): DailyQuest[] => {
  void previous;
  const pathLevel = getPathLevelFromXp(trainingXp.strength?.xp ?? 0);
  const [y, m, d] = dateKey.split("-").map(Number);
  const localDate = new Date(y, m - 1, d);
  const base = sessionOverride ?? getGymSessionForDate(localDate);
  let session = base;
  if (trainingLevel === "advanced") {
    session = {
      ...session,
      exercises: session.exercises.map((e, idx) => (idx < 2 ? { ...e, reps: tightenRepRange(e.reps) } : e)),
    };
  }
  session = {
    ...session,
    exercises: session.exercises.map((e) => ({
      ...e,
      sets: setLabelForTrainingLevel(trainingLevel, e.sets),
      reps: repRangeForTrainingLevel(trainingLevel, e.reps),
    })),
  };
  const auto = getSessionAutoAdjustment(localDate, session, weeklyVolume);
  const fatigueSensitivityScale = trainingLevel === "beginner" ? 0.9 : trainingLevel === "advanced" ? 1.08 : 1;
  const adjustedAutoVolumeScale = Math.max(0.45, Math.min(1.25, auto.volumeScale * fatigueSensitivityScale));
  const paidAccelerationScale = isPaidUser && auto.volumeScale >= 0.99 ? 1.1 : 1;
  const adjustedSession = applySessionVolumeScale(session, adjustedAutoVolumeScale * paidAccelerationScale);
  const instructionNote =
    auto.intensityScale < 0.99
      ? ` Use roughly ${Math.round(auto.intensityScale * 100)}% of your normal load today.`
      : isPaidUser
        ? " Full system intelligence active: smarter pacing while progression remains stable."
        : "";
  return [
    {
      id: 1,
      category: "Strength",
      path: STRENGTH_PATH_ID,
      title: adjustedSession.title,
      instruction: `${adjustedSession.instruction}${instructionNote}`,
      steps: adjustedSession.exercises.map(toExerciseStep),
      why: adjustedSession.why,
      examples: adjustedSession.exercises.map((e) => `${e.name}: ${e.sets} x ${e.reps}`),
      minimum: adjustedSession.minimum,
      insight: `${adjustedSession.insight}${auto.deloadWeek ? " Deload week active: reduced sets and slightly lighter loading." : ""}`,
      task: adjustedSession.title,
    },
  ];
};

const pickProgressMessages = (input: {
  strengthImproved: boolean;
  liftedMore: boolean;
  newPersonalBest: boolean;
  volumeChangePercent: number | null;
}): string[] => {
  const messages: string[] = [];
  if (input.newPersonalBest) messages.push("New personal best.");
  if (input.liftedMore || input.strengthImproved) messages.push("You lifted more than last session.");
  if (input.volumeChangePercent != null && input.volumeChangePercent > 0) {
    messages.push(`Volume increased by ${input.volumeChangePercent}%.`);
  }
  return messages.slice(0, 3);
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
  const [xpResolved, setXpResolved] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [trainingXpState, setTrainingXpState] = useState<TrainingXpState>(createEmptyTrainingXp());
  const trainingXpStateRef = useRef<TrainingXpState>(createEmptyTrainingXp());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>("intermediate");
  const [trainingLevelSaving, setTrainingLevelSaving] = useState(false);
  const [trainingLevelNotice, setTrainingLevelNotice] = useState<string | null>(null);
  const pendingTrainingLevelSyncRef = useRef<TrainingLevel | null>(null);
  const [recentlyCompletedIds, setRecentlyCompletedIds] = useState<Record<number, boolean>>({});
  const [recentlyCompletedPathGain, setRecentlyCompletedPathGain] = useState<Record<number, string>>({});
  const [protocolCompletionFeedback, setProtocolCompletionFeedback] = useState<{
    streak: number;
    streakLine: string | null;
    stronger: boolean;
    strengthImproved: boolean;
    liftedMore: boolean;
    newPersonalBest: boolean;
    weeklyImproving: boolean;
    volumeChangePercent: number | null;
    progressMessages: string[];
    weeklyVolume: number;
    strongestLift: string | null;
  } | null>(null);
  const [unlockNotification, setUnlockNotification] = useState<string | null>(null);
  const [pendingPrePromptQuestId, setPendingPrePromptQuestId] = useState<number | null>(null);
  const [prePromptSatisfiedByQuest, setPrePromptSatisfiedByQuest] = useState<Record<number, boolean>>({});
  const [effectInputsByQuest, setEffectInputsByQuest] = useState<QuestEffectInputState>({});
  const [exerciseHistoryByName, setExerciseHistoryByName] = useState<Record<string, ExerciseHistoryRow>>({});
  const [focusTimerSecondsByQuest, setFocusTimerSecondsByQuest] = useState<Record<number, number>>({});
  const [focusTimerRunningByQuest, setFocusTimerRunningByQuest] = useState<Record<number, boolean>>({});
  const [optionalConditioningDone, setOptionalConditioningDone] = useState(false);
  const [systemIntegrityScore, setSystemIntegrityScore] = useState(100);
  const [dailyReadiness, setDailyReadiness] = useState<ReadinessLevel>("normal");
  const [weeklySessionsCount, setWeeklySessionsCount] = useState(0);
  const [weeklyStrengthStats, setWeeklyStrengthStats] = useState<{ totalVolume: number; strongestLift: string | null }>({
    totalVolume: 0,
    strongestLift: null,
  });
  const [undoCompletion, setUndoCompletion] = useState<UndoCompletionRecord | null>(null);
  const [identityNotice, setIdentityNotice] = useState<string | null>(null);
  const [yesterdayDailyMissed, setYesterdayDailyMissed] = useState(false);
  const [yesterdayProtocolTitle, setYesterdayProtocolTitle] = useState<string | null>(null);
  const [expiryMs, setExpiryMs] = useState(() =>
    typeof window !== "undefined" ? msUntilProtocolDeadline() : 0
  );
  const protocolDayKeyRef = useRef<string | null>(null);
  const firstSystemMomentPendingRef = useRef(false);
  const progressUpgradePromptPendingRef = useRef(false);
  const { isPaidUser, isPaidReady, effectivePro, refresh: refreshPaidAccess } = useProEntitlement();
  const [proConversionModalOpen, setProConversionModalOpen] = useState(false);
  const [firstSystemMomentOpen, setFirstSystemMomentOpen] = useState(false);

  useEffect(() => {
    if (effectivePro && proConversionModalOpen) {
      setProConversionModalOpen(false);
    }
  }, [effectivePro, proConversionModalOpen]);

  useEffect(() => {
    const load = async () => {
      let trainingXpForDaily: TrainingXpState = createEmptyTrainingXp();
      try {
        setXpResolved(false);
        setUndoCompletion(null);
        setOptionalConditioningDone(false);
        const storedLevelRaw = window.localStorage.getItem(TRAINING_LEVEL_STORAGE_KEY);
        const localStoredLevel = parseTrainingLevel(storedLevelRaw);
        console.log("[TRAINING LEVEL DEBUG] Supabase level: pending");
        console.log("[TRAINING LEVEL DEBUG] LocalStorage level:", localStoredLevel);
        let resolvedTrainingLevel: TrainingLevel = localStoredLevel ?? "intermediate";
        const hasCompletedOnboarding = window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
        if (!hasCompletedOnboarding) {
          setShowOnboarding(true);
          return;
        }
        setShowOnboarding(false);

        const { raw: rawPathXp, state: storedXpState } = readStrengthXpFromStorage();
        let normalizedXp = ensureStrengthLine(storedXpState);
        normalizedXp = ensureStrengthLine(normalizedXp);
        console.log("[XP DEBUG] homepage raw ascend.path-xp.v1:", rawPathXp);

        const resolvedPaid = await refreshPaidAccess();
        const user = await getCurrentUser();
        let profile: ProfileRow | null = null;
        if (user) {
          const supabaseBacked = await loadSupabaseBackedStrengthXp(user.id, normalizedXp);
          normalizedXp = supabaseBacked.state;
          profile = supabaseBacked.profile;
          const supabaseTrainingLevel = parseTrainingLevel(supabaseBacked.profile.training_level);
          console.log("[TRAINING LEVEL DEBUG] Supabase level:", supabaseTrainingLevel);
          if (supabaseTrainingLevel) {
            if (localStoredLevel && localStoredLevel !== supabaseTrainingLevel) {
              console.log(
                "[TRAINING LEVEL DEBUG] Overwrite Supabase with Local:",
                supabaseTrainingLevel,
                "->",
                localStoredLevel
              );
              resolvedTrainingLevel = localStoredLevel;
              const { error: levelSyncError } = await supabase
                .from("profiles")
                .update({ training_level: localStoredLevel })
                .eq("id", user.id);
              if (levelSyncError) {
                console.warn("[TRAINING LEVEL DEBUG] Failed to sync local level to Supabase:", levelSyncError.message);
              }
            } else {
              resolvedTrainingLevel = supabaseTrainingLevel;
            }
          } else if (localStoredLevel) {
            console.log("[TRAINING LEVEL DEBUG] Migrating local level to Supabase:", localStoredLevel);
            const { error: levelMigrateError } = await supabase
              .from("profiles")
              .update({ training_level: localStoredLevel })
              .eq("id", user.id);
            if (levelMigrateError) {
              console.warn("[TRAINING LEVEL DEBUG] Failed to migrate local level to Supabase:", levelMigrateError.message);
            }
          } else {
            console.log("[TRAINING LEVEL DEBUG] No stored level found; defaulting to intermediate.");
          }
          if (supabaseBacked.migratedFromLocal) {
            console.log("[XP DEBUG] migrated local XP to Supabase for user:", user.id);
          }
        }
        setTrainingLevel(resolvedTrainingLevel);
        window.localStorage.setItem(TRAINING_LEVEL_STORAGE_KEY, resolvedTrainingLevel);
        console.log("[TRAINING LEVEL DEBUG] Final level used:", resolvedTrainingLevel);
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
        trainingXpStateRef.current = normalizedXp;
        trainingXpForDaily = normalizedXp;
        if (rawPathXp != null || normalizedXp.strength.xp > 0 || user) {
          saveStrengthXpToStorage(normalizedXp);
        }
        const metrics = getSystemMetricsFromTrainingXp(normalizedXp);
        console.log("[XP DEBUG] homepage XP used:", metrics.totalXP);
        setTotalXP(metrics.totalXP);
        setLevel(metrics.level);
        setXpResolved(true);

        if (!user) {
          setSystemIntegrityScore(loadSystemIntegrityState(getLocalDateKey()).score);
          return;
        }
        if (!profile) return;
        setUserId(user.id);
        const today = getLocalDateKey();
        const weekMonForVolume = mondayDateKeyForLocalWeekContaining(today);
        const weekSunForVolume = sundayDateKeyFromMonday(weekMonForVolume);
        const weekVolumeRows = await fetchExerciseVolumeRowsForRange(user.id, weekMonForVolume, weekSunForVolume);
        const weeklyVolume = calculateWeeklyVolumeByMuscle(weekVolumeRows);

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
            const regenerated = createDailyQuests(
              previousTasks,
              trainingXpForDaily,
              today,
              false,
              weeklyVolume,
              null,
              resolvedTrainingLevel
            );
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
          const generated = createDailyQuests(
            previousTasks,
            trainingXpForDaily,
            today,
            resolvedPaid,
            weeklyVolume,
            null,
            resolvedTrainingLevel
          );
          const initialCompleted = Array.from({ length: generated.length }, () => false);
          const { data: inserted } = await supabase
            .from("daily_tasks")
            .insert({
              user_id: user.id,
              date: today,
              tasks: generated,
              completed: initialCompleted,
            })
            .select("id")
            .single();
          setDailyTaskId(inserted?.id ? String(inserted.id) : null);
          setDailyQuests(generated);
          setCompleted(initialCompleted);
        }

        if (nextStreak !== profile.current_streak) {
          logProfileTableDebug("page:loadStreakReconcile", "update", {
            query: 'from("profiles").update({ current_streak }).eq("id", user.id)',
            updateKeys: ["current_streak"],
          });
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
        if (typeof profile.system_integrity === "number" && Number.isFinite(profile.system_integrity)) {
          integrityState.score = profile.system_integrity;
          setSystemIntegrityScore(profile.system_integrity);
        }
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
        await persistStrengthXpToSupabase(user.id, trainingXpForDaily, { systemIntegrity: nextIntegrity.score });

        const weekMon = mondayDateKeyForLocalWeekContaining(today);
        const weekSun = sundayDateKeyFromMonday(weekMon);
        const { data: weekRows } = await supabase
          .from("daily_tasks")
          .select("tasks, completed")
          .eq("user_id", user.id)
          .gte("date", weekMon)
          .lte("date", weekSun);
        let weekCompleted = 0;
        for (const row of weekRows ?? []) {
          const wh = hydrateDailyQuests(row.tasks);
          const wRaw = (row.completed as boolean[]) ?? [];
          const { completed: wSingle } = normalizeSingleStrengthTask(wh, wRaw);
          if (wSingle[0]) weekCompleted += 1;
        }
        setWeeklySessionsCount(weekCompleted);
        const weekPerfRows = await fetchExercisePerformanceRowsForRange(user.id, weekMon, weekSun);
        const weekVolume = Math.round(totalVolumeFromRows(weekPerfRows));
        const strongest = weekPerfRows.reduce<{ exercise: string; weight: number } | null>(
          (best, row) => {
            if (!best || row.last_weight > best.weight) return { exercise: row.exercise_name, weight: row.last_weight };
            return best;
          },
          null
        );
        setWeeklyStrengthStats({
          totalVolume: weekVolume,
          strongestLift: strongest ? `${strongest.exercise} (${strongest.weight}kg)` : null,
        });
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

  useEffect(() => {
    if (!isReady) return;
    const saved = loadReadinessForDate(getLocalDateKey());
    setDailyReadiness(saved ?? "normal");
  }, [isReady, loadVersion]);

  useEffect(() => {
    if (!isPaidReady || !isReady || showOnboarding) return;
    const prev = loadStrengthIdentitySnapshot();
    const rank = getStrengthRank(level);
    const notice = nextIdentityNotice(prev, level);
    saveStrengthIdentitySnapshot({ lastLevel: level, lastRank: rank });
    if (!notice) return;
    setIdentityNotice(notice);
    const t = window.setTimeout(() => setIdentityNotice(null), 5200);
    return () => window.clearTimeout(t);
  }, [isPaidReady, isReady, level, showOnboarding]);

  useEffect(() => {
    if (!userId) return;
    const quests = dailyQuests;
    const names = quests.flatMap((q) => getQuestExerciseSpecs(q).map((s) => s.name));
    if (names.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const latest = await fetchLatestExerciseHistory(userId, names);
      if (cancelled) return;
      setExerciseHistoryByName((prev) => ({ ...prev, ...latest }));
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [dailyQuests, userId]);

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

  const getQuestExerciseSpecs = (quest: DailyQuest) => parseExerciseSpecsFromSteps(getProtocolDetailFromQuest(quest).steps);

  const hasAllExerciseInputsForQuest = (quest: DailyQuest) => {
    const specs = getQuestExerciseSpecs(quest);
    if (specs.length === 0) return true;
    const requiresEffort = trainingLevel === "advanced";
    return specs.every((spec) => {
      const weight = Number.parseFloat(getEffectInput(quest.id, getExerciseInputKey(quest.id, spec.name, "weight")));
      const reps = parseRepsCsv(getEffectInput(quest.id, getExerciseInputKey(quest.id, spec.name, "reps")));
      const setsRaw = getEffectInput(quest.id, getExerciseInputKey(quest.id, spec.name, "sets")).trim();
      const sets = setsRaw ? Number.parseInt(setsRaw, 10) : reps.length;
      const effortRaw = getEffectInput(quest.id, getExerciseInputKey(quest.id, spec.name, "effort")).trim().toLowerCase();
      const effortValid =
        effortRaw === "easy" || effortRaw === "moderate" || effortRaw === "hard" || effortRaw === "very_hard";
      return (
        Number.isFinite(weight) &&
        weight > 0 &&
        reps.length > 0 &&
        Number.isFinite(sets) &&
        sets > 0 &&
        (!requiresEffort || effortValid)
      );
    });
  };

  const buildExerciseLogEntriesForQuest = (quest: DailyQuest): ExerciseSessionLogInsert[] => {
    if (!userId) return [];
    const sessionDate = getLocalDateKey();
    const specs = getQuestExerciseSpecs(quest);
    const requiresEffort = trainingLevel === "advanced";
    const rows: ExerciseSessionLogInsert[] = [];
    for (const spec of specs) {
      const weight = Number.parseFloat(getEffectInput(quest.id, getExerciseInputKey(quest.id, spec.name, "weight")));
      const reps = parseRepsCsv(getEffectInput(quest.id, getExerciseInputKey(quest.id, spec.name, "reps")));
      const setsRaw = getEffectInput(quest.id, getExerciseInputKey(quest.id, spec.name, "sets")).trim();
      const setsCompleted = setsRaw ? Number.parseInt(setsRaw, 10) : reps.length;
      const effortRaw = getEffectInput(quest.id, getExerciseInputKey(quest.id, spec.name, "effort")).trim().toLowerCase();
      const effort =
        effortRaw === "easy" || effortRaw === "moderate" || effortRaw === "hard" || effortRaw === "very_hard"
          ? (effortRaw as EffortRating)
          : ("moderate" as EffortRating);
      if (
        !Number.isFinite(weight) ||
        weight <= 0 ||
        reps.length === 0 ||
        !Number.isFinite(setsCompleted) ||
        setsCompleted <= 0 ||
        (requiresEffort && effort == null)
      ) {
        continue;
      }
      rows.push({
        user_id: userId,
        exercise_name: spec.name,
        last_weight: Number(weight.toFixed(2)),
        last_reps: reps,
        sets_completed: setsCompleted,
        session_date: sessionDate,
        effort_rating: effort,
      });
    }
    return rows;
  };

  const applyTrainingXpState = (nextState: TrainingXpState) => {
    const safe = ensureStrengthLine(nextState);
    trainingXpStateRef.current = safe;
    saveStrengthXpToStorage(safe);
    const metrics = getSystemMetricsFromTrainingXp(safe);
    console.log("[XP DEBUG] XP after session completion:", metrics.totalXP);
    setTrainingXpState(safe);
    setTotalXP(metrics.totalXP);
    setLevel(metrics.level);
  };

  const applyTrainingXpDelta = (
    delta: number,
    opts?: { countDailySession?: boolean }
  ): { previousState: TrainingXpState; nextState: TrainingXpState } => {
    const paid = effectivePro;
    const sessionsReq = getSessionsRequiredForLevelUp(paid);
    const maxTotalXp = paid ? undefined : getMaxXpForFreeTier();
    const previousState = ensureStrengthLine(trainingXpStateRef.current);
    const xpBefore = previousState.strength.xp;
    const previousPathLevel = getPathLevelFromXp(xpBefore);
    const dateKey = opts?.countDailySession ? getLocalDateKey() : undefined;
    const nextState = applyXpDeltaWithGate(previousState, delta, {
      countDailySession: opts?.countDailySession,
      dateKey,
      sessionsRequired: sessionsReq,
      maxTotalXp,
    });
    const xpAfter = nextState.strength.xp;
    const updatedLevel = getPathLevelFromXp(nextState.strength.xp);
    const newlyUnlocked = getNewlyUnlockedForLevel(STRENGTH_PATH_ID, previousPathLevel, updatedLevel);
    if (newlyUnlocked.length > 0) {
      setUnlockNotification(formatUnlockCelebration(newlyUnlocked));
      window.setTimeout(() => setUnlockNotification(null), 5800);
    } else if (!paid && delta > 0 && xpBefore + delta > xpAfter) {
      window.setTimeout(() => setProConversionModalOpen(true), 0);
    }
    applyTrainingXpState(nextState);
    return { previousState, nextState };
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

  const strengthLevelForEvents = () => getPathLevelFromXp(trainingXpStateRef.current.strength?.xp ?? 0);
  const totalVolumeFromRows = (rows: Array<{ last_weight: number; last_reps: number[] }>) =>
    rows.reduce((sum, row) => sum + getExerciseLogVolume(row.last_weight, row.last_reps), 0);

  const handleComplete = async (idx: number) => {
    if (!userId || dailyTaskId === null || completed[idx]) return;
    const quest = dailyQuests[idx];
    if (!quest || !hasAllRequiredPrePrompts(quest) || !hasAllTrackerInputsForQuest(quest)) return;
    const xpBeforeComplete = trainingXpStateRef.current.strength?.xp ?? 0;
    const nextCompleted = [...completed];
    nextCompleted[idx] = true;
    setCompleted(nextCompleted);
    const questId = dailyQuests[idx]?.id;
    if (typeof questId === "number") {
      setRecentlyCompletedIds((prev) => ({ ...prev, [questId]: true }));
      setRecentlyCompletedPathGain((prev) => ({ ...prev, [questId]: formatStrengthXpGain(10) }));
      window.setTimeout(() => {
        setRecentlyCompletedIds((prev) => ({ ...prev, [questId]: false }));
        setRecentlyCompletedPathGain((prev) => {
          const next = { ...prev };
          delete next[questId];
          return next;
        });
      }, 1200);
    }

    const { previousState, nextState: nextXpState } = applyTrainingXpDelta(10, { countDailySession: idx === 0 });

    let strongerThanLast = false;
    let strengthImproved = false;
    let liftedMore = false;
    let newPersonalBest = false;
    let weeklyImproving = false;
    let volumeChangePercent: number | null = null;
    let weeklyVolumeTotal = 0;
    let strongestLiftLabel: string | null = null;
    if (idx === 0) {
      const exerciseLogs = buildExerciseLogEntriesForQuest(quest);
      await logTrainingSessionToSupabase({
        userId,
        sessionType: "daily_protocol",
        xpEarned: 10,
        totalVolume: totalVolumeFromRows(exerciseLogs),
        fatigueState: dailyReadiness,
        exerciseLogs,
      });
      if (exerciseLogs.length > 0) {
        await saveExerciseSessionLogs(exerciseLogs);
        setExerciseHistoryByName((prev) => {
          const next = { ...prev };
          for (const row of exerciseLogs) {
            next[normalizeExerciseName(row.exercise_name)] = {
              exercise_name: row.exercise_name,
              last_weight: row.last_weight,
              last_reps: row.last_reps,
              sets_completed: row.sets_completed,
              session_date: row.session_date,
              effort_rating: row.effort_rating,
              recent_efforts: [row.effort_rating],
            };
          }
          return next;
        });
        if (userId) {
          const today = getLocalDateKey();
          const lookbackStart = addDaysToDateKey(today, -35);
          const exerciseNames = exerciseLogs.map((e) => e.exercise_name);
          const historyForNames = await fetchExercisePerformanceRowsForNames(userId, exerciseNames);
          const previousRows = await fetchExercisePerformanceRowsForRange(userId, lookbackStart, today);
          const currentSessionVolume = totalVolumeFromRows(exerciseLogs);
          const previousDates = Array.from(
            new Set(previousRows.map((r) => r.session_date).filter((d) => d < today))
          ).sort();
          const previousDate = previousDates.length > 0 ? previousDates[previousDates.length - 1] : null;
          if (previousDate) {
            const lastSessionRows = previousRows.filter((r) => r.session_date === previousDate);
            const lastSessionVolume = totalVolumeFromRows(lastSessionRows);
            liftedMore = currentSessionVolume > lastSessionVolume;
            if (lastSessionVolume > 0 && currentSessionVolume > lastSessionVolume) {
              volumeChangePercent = Math.round(((currentSessionVolume - lastSessionVolume) / lastSessionVolume) * 100);
            }
          }

          for (const row of exerciseLogs) {
            const historical = historyForNames.filter(
              (h) => normalizeExerciseName(h.exercise_name) === normalizeExerciseName(row.exercise_name) && h.session_date < today
            );
            const latestPrior = historical
              .sort((a, b) => b.session_date.localeCompare(a.session_date))[0] ?? null;
            if (latestPrior) {
              const priorTotalReps = latestPrior.last_reps.reduce((sum, r) => sum + r, 0);
              const currentTotalReps = row.last_reps.reduce((sum, r) => sum + r, 0);
              if (row.last_weight > latestPrior.last_weight || currentTotalReps > priorTotalReps) {
                strengthImproved = true;
              }
            }
            const priorMaxWeight = historical.reduce((m, h) => Math.max(m, h.last_weight), 0);
            const priorMaxVol = historical.reduce((m, h) => Math.max(m, getExerciseLogVolume(h.last_weight, h.last_reps)), 0);
            const rowVol = getExerciseLogVolume(row.last_weight, row.last_reps);
            if (row.last_weight > priorMaxWeight || rowVol > priorMaxVol) {
              newPersonalBest = true;
              break;
            }
          }

          const weekMon = mondayDateKeyForLocalWeekContaining(today);
          const weekSun = sundayDateKeyFromMonday(weekMon);
          const prevWeekMon = addDaysToDateKey(weekMon, -7);
          const prevWeekSun = addDaysToDateKey(weekSun, -7);
          const thisWeekRows = await fetchExercisePerformanceRowsForRange(userId, weekMon, weekSun);
          const prevWeekRows = await fetchExercisePerformanceRowsForRange(userId, prevWeekMon, prevWeekSun);
          weeklyVolumeTotal = totalVolumeFromRows(thisWeekRows);
          const previousWeekVolume = totalVolumeFromRows(prevWeekRows);
          weeklyImproving = weeklyVolumeTotal > previousWeekVolume && previousWeekVolume > 0;
          const strongest = thisWeekRows.reduce<{ exercise: string; weight: number } | null>(
            (best, row) => {
              if (!best || row.last_weight > best.weight) return { exercise: row.exercise_name, weight: row.last_weight };
              return best;
            },
            null
          );
          strongestLiftLabel = strongest ? `${strongest.exercise} (${strongest.weight}kg)` : null;
        }
      }
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
      await persistStrengthXpToSupabase(userId, nextXpState, { systemIntegrity: bumped.score });
    } else {
      await persistStrengthXpToSupabase(userId, nextXpState);
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
      logProfileTableDebug("page:completeDailyAllTasks", "update", {
        query: 'from("profiles").update({ current_streak, best_streak }).eq("id", userId)',
        updateKeys: ["current_streak", "best_streak"],
      });
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
      if (!effectivePro && getPathLevelFromXp(trainingXpStateRef.current.strength?.xp ?? 0) >= FREE_MAX_PATH_LEVEL) {
        window.setTimeout(() => setProConversionModalOpen(true), 0);
      }
    }

    if (idx === 0) {
      setUndoCompletion({
        kind: "daily",
        dateKey: getLocalDateKey(),
        questId: quest.id,
        previousXpState: previousState,
        previousCompleted: [...completed],
        xpAwarded: 10,
        allDoneBeforeUndo: allDone,
      });
      if (typeof window !== "undefined" && !window.localStorage.getItem(FIRST_SYSTEM_MOMENT_STORAGE_KEY)) {
        firstSystemMomentPendingRef.current = true;
      }
      setWeeklySessionsCount((w) => w + 1);
      setProtocolCompletionFeedback({
        streak: streakAfterComplete,
        streakLine: formatStreakIdentityLine(streakAfterComplete),
        stronger: strongerThanLast,
        strengthImproved,
        liftedMore,
        newPersonalBest,
        weeklyImproving,
        volumeChangePercent,
        progressMessages: pickProgressMessages({
          strengthImproved,
          liftedMore,
          newPersonalBest,
          volumeChangePercent,
        }),
        weeklyVolume: Math.round(weeklyVolumeTotal),
        strongestLift: strongestLiftLabel,
      });
      if (!effectivePro && (strengthImproved || liftedMore || newPersonalBest || weeklyImproving)) {
        const prompted =
          typeof window !== "undefined" && window.localStorage.getItem(PRO_PROGRESS_MOMENT_PROMPT_KEY) === "1";
        if (!prompted) {
          progressUpgradePromptPendingRef.current = true;
          if (typeof window !== "undefined") {
            window.localStorage.setItem(PRO_PROGRESS_MOMENT_PROMPT_KEY, "1");
          }
        }
      }
    }
  };

  const regenerateTodaySessionForTrainingLevel = async (nextLevel: TrainingLevel) => {
    if (!userId || !dailyTaskId || dailyQuests.length === 0 || completed[0]) return;
    const today = getLocalDateKey();
    const [y, m, d] = today.split("-").map(Number);
    const localDate = new Date(y, m - 1, d);
    const currentQuest = dailyQuests[0];
    const currentSession = identifyGymSessionForDateAndSteps(localDate, currentQuest.steps);
    const weekMon = mondayDateKeyForLocalWeekContaining(today);
    const weekSun = sundayDateKeyFromMonday(weekMon);
    const weekVolumeRows = await fetchExerciseVolumeRowsForRange(userId, weekMon, weekSun);
    const weeklyVolume = calculateWeeklyVolumeByMuscle(weekVolumeRows);
    const regenerated = createDailyQuests(
      [],
      trainingXpStateRef.current,
      today,
      effectivePro,
      weeklyVolume,
      currentSession,
      nextLevel
    );
    setDailyQuests(regenerated);
    setExpandedQuestIds({});
    setProtocolStepChecks({});
    await supabase.from("daily_tasks").update({ tasks: regenerated }).eq("id", dailyTaskId);
  };

  const updateTrainingLevelSetting = async (nextLevel: TrainingLevel, opts?: { applyToToday?: boolean }) => {
    if (trainingLevelSaving) return;
    if (trainingLevel !== nextLevel) {
      console.log("[TRAINING LEVEL DEBUG] User level change:", trainingLevel, "->", nextLevel);
    }
    setTrainingLevel(nextLevel);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TRAINING_LEVEL_STORAGE_KEY, nextLevel);
      console.log("[TRAINING LEVEL DEBUG] LocalStorage level saved:", nextLevel);
    }
    setTrainingLevelSaving(true);
    try {
      if (userId) {
        const { error: saveError } = await supabase.from("profiles").update({ training_level: nextLevel }).eq("id", userId);
        if (saveError) {
          console.warn("[TRAINING LEVEL DEBUG] Supabase save failed:", saveError.message);
          pendingTrainingLevelSyncRef.current = nextLevel;
          setTrainingLevelNotice("Saved locally. Cloud sync pending.");
        } else {
          console.log("[TRAINING LEVEL DEBUG] Supabase level saved:", nextLevel);
        }
      } else {
        pendingTrainingLevelSyncRef.current = nextLevel;
        console.log("[TRAINING LEVEL DEBUG] No user yet; queued level sync:", nextLevel);
      }
      if (opts?.applyToToday) {
        await regenerateTodaySessionForTrainingLevel(nextLevel);
        setTrainingLevelNotice((prev) => prev ?? "Applied to today's session.");
      } else {
        setTrainingLevelNotice((prev) => prev ?? "Applies to your next generated session.");
      }
      window.setTimeout(() => setTrainingLevelNotice(null), 2600);
    } finally {
      setTrainingLevelSaving(false);
    }
  };

  useEffect(() => {
    if (!userId || !pendingTrainingLevelSyncRef.current) return;
    let cancelled = false;
    const syncPendingLevel = async () => {
      const pendingLevel = pendingTrainingLevelSyncRef.current;
      if (!pendingLevel) return;
      const { error } = await supabase.from("profiles").update({ training_level: pendingLevel }).eq("id", userId);
      if (cancelled) return;
      if (error) {
        console.warn("[TRAINING LEVEL DEBUG] Pending sync failed:", error.message);
        return;
      }
      console.log("[TRAINING LEVEL DEBUG] Pending sync succeeded:", pendingLevel);
      pendingTrainingLevelSyncRef.current = null;
    };
    void syncPendingLevel();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const canUndoQuestCompletion = (questId: number) => {
    if (!undoCompletion || undoCompletion.dateKey !== getLocalDateKey()) return false;
    return undoCompletion.kind === "daily" && undoCompletion.questId === questId;
  };

  const handleUndoCompletion = async (mode: { kind: "daily"; idx: number }) => {
    if (!userId || !undoCompletion || undoCompletion.dateKey !== getLocalDateKey()) return;
    if (undoCompletion.kind !== "daily") return;
    const nextCompleted = [...undoCompletion.previousCompleted];
    setCompleted(nextCompleted);
    setProtocolCompletionFeedback(null);
    setUnlockNotification(`Undo completion · -${undoCompletion.xpAwarded} Strength XP`);
    window.setTimeout(() => setUnlockNotification(null), 2000);
    applyTrainingXpState(undoCompletion.previousXpState);
    await persistStrengthXpToSupabase(userId, undoCompletion.previousXpState, { systemIntegrity: systemIntegrityScore });
    if (dailyTaskId) {
      await supabase.from("daily_tasks").update({ completed: nextCompleted }).eq("id", dailyTaskId);
    }
    if (undoCompletion.allDoneBeforeUndo) {
      const nextStreak = Math.max(0, currentStreak - 1);
      setWeeklySessionsCount((w) => Math.max(0, w - 1));
      setCurrentStreak(nextStreak);
      await supabase.from("profiles").update({ current_streak: nextStreak }).eq("id", userId);
      await supabase
        .from("history")
        .upsert({ user_id: userId, date: getLocalDateKey(), xp_earned: 0, completed_all: false, streak: nextStreak });
    }
    setUndoCompletion(null);
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
    stepCount: number
  ) => {
    const hasPrePromptEffects = getEffectsByType(quest, "pre_protocol_prompt").length > 0;
    if (hasPrePromptEffects && !prePromptSatisfiedByQuest[quest.id] && !expandedQuestIds[quest.id]) {
      setPendingPrePromptQuestId(quest.id);
      return;
    }
    if (!expandedQuestIds[quest.id] && userId) {
      logUserEvent(userId, USER_EVENT_TYPES.PROTOCOL_STARTED, {
        scope: "daily",
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

  const renderProtocolBlock = (quest: DailyQuest, mode: { kind: "daily"; idx: number }) => {
    const readinessForQuest: ReadinessLevel = mode.idx === 0 ? readinessForTrainingLevel(dailyReadiness, trainingLevel) : "normal";
    const effectiveQuest = readinessForQuest === "normal" ? quest : applyReadinessAdjustments(quest, readinessForQuest);
    const isDone = completed[mode.idx];
    const xpFallback = formatStrengthXpGain(10);
    const onExecute = () => {
      void handleComplete(mode.idx);
    };
    const details = getProtocolDetailFromQuest(effectiveQuest);
    const isRecentlyCompleted = Boolean(recentlyCompletedIds[quest.id]);
    const stepChecks = protocolStepChecks[quest.id] ?? [];
    const stepsCompleted = stepChecks.filter(Boolean).length;
    const questPathLevel = getQuestPathLevel(effectiveQuest);
    const protocolReady =
      hasAllRequiredPrePrompts(effectiveQuest) &&
      hasAllTrackerInputsForQuest(effectiveQuest) &&
      hasAllExerciseInputsForQuest(effectiveQuest);
    const prePromptEffects = getEffectsByType(effectiveQuest, "pre_protocol_prompt");
    const postReflectionEffects = getEffectsByType(effectiveQuest, "post_protocol_reflection");
    const inputTrackerEffects = getEffectsByType(effectiveQuest, "input_tracker");
    const uiModifierEffects = getEffectsByType(effectiveQuest, "ui_modifier");
    const autoregulationEffects = getEffectsByType(effectiveQuest, "autoregulation");
    const enhancerSteps = getEnhancerSteps(effectiveQuest);
    const renderedSteps = [...details.steps, ...enhancerSteps];
    const exerciseSpecs = parseExerciseSpecsFromSteps(details.steps);
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
              {effectiveQuest.title}
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
              Complete required prompts, tracker inputs, and exercise load/rep logs before execute.
            </p>
          )}
          {isDone && canUndoQuestCompletion(quest.id) && (
            <button
              type="button"
              className="text-center text-[11px] text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
              onClick={() => void handleUndoCompletion({ kind: "daily", idx: mode.idx })}
            >
              Undo completion
            </button>
          )}
          {!isDone && (
            <button
              type="button"
              className="text-center text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
              onClick={() => handleStartProtocol(effectiveQuest, renderedSteps.length)}
            >
              {expandedQuestIds[quest.id] ? "Hide training protocol" : "Training protocol details"}
            </button>
          )}
        </div>
        {pendingPrePromptQuestId === effectiveQuest.id && prePromptEffects.length > 0 && !expandedQuestIds[effectiveQuest.id] && (
          <div className="mt-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-3">
            <p className="text-xs text-zinc-300">Before you execute</p>
            <div className="mt-2 space-y-2">
              {prePromptEffects.map((unlock) => {
                const key = `pre:${unlock.pathId}:${unlock.title}`;
                return (
                  <div key={key}>
                    <p className="text-[11px] text-zinc-400">{getPromptFromConfig(unlock, "Provide input")}</p>
                    <input
                      value={getEffectInput(effectiveQuest.id, key)}
                      onChange={(event) => setEffectInput(effectiveQuest.id, key, event.target.value)}
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
                disabled={!hasAllRequiredPrePrompts(effectiveQuest)}
                onClick={() => {
                  setPendingPrePromptQuestId(null);
                  setPrePromptSatisfiedByQuest((prev) => ({ ...prev, [effectiveQuest.id]: true }));
                  if (userId) {
                    logUserEvent(userId, USER_EVENT_TYPES.PROTOCOL_STARTED, {
                      scope: "daily",
                      quest_id: effectiveQuest.id,
                      protocol_title: effectiveQuest.title,
                      strength_level: strengthLevelForEvents(),
                      via: "pre_prompt_continue",
                    });
                  }
                  toggleProtocol(effectiveQuest.id, renderedSteps.length);
                }}
              >
                Continue
              </button>
            </div>
          </div>
        )}
        {expandedQuestIds[effectiveQuest.id] && (
          <div className="mt-4 border-t border-zinc-700/70 pt-4 text-sm text-zinc-300">
            {prePromptEffects.map((unlock) => {
              const key = `pre:${unlock.pathId}:${unlock.title}`;
              const value = getEffectInput(effectiveQuest.id, key);
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
            {exerciseSpecs.length > 0 && (
              <div className="mb-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-3">
                <p className="text-xs font-medium text-zinc-300">Exercise progression log</p>
                <p className="mt-1 text-[11px] text-zinc-500">Double progression: hit top reps across sets, then add weight.</p>
                <div className="mt-3 space-y-3">
                  {exerciseSpecs.map((spec, idx) => {
                    const intentLabel = getExerciseIntentLabel(spec.name, idx);
                    const normalized = normalizeExerciseName(spec.name);
                    const last = exerciseHistoryByName[normalized] ?? null;
                    const weightKey = getExerciseInputKey(effectiveQuest.id, spec.name, "weight");
                    const repsKey = getExerciseInputKey(effectiveQuest.id, spec.name, "reps");
                    const setsKey = getExerciseInputKey(effectiveQuest.id, spec.name, "sets");
                    const effortKey = getExerciseInputKey(effectiveQuest.id, spec.name, "effort");
                    const selectedEffort = getEffectInput(effectiveQuest.id, effortKey);
                    const effortUnlocked = trainingLevel === "advanced";
                    return (
                      <div key={`${effectiveQuest.id}-${normalized}`} className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-zinc-100">{spec.name}</p>
                          <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-0.5 text-[10px] text-zinc-400">
                            {intentLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          {last ? `Last time: ${formatLastPerformance(last)}` : "Last time: no history yet"}
                        </p>
                        <p className="mt-1 text-[11px] text-emerald-400/90">
                          {getDoubleProgressionTarget(
                            spec,
                            last,
                            readinessForQuest,
                            progressionSpeedForTrainingLevel(trainingLevel)
                          )}
                        </p>
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <input
                            value={getEffectInput(effectiveQuest.id, weightKey)}
                            onChange={(event) => setEffectInput(effectiveQuest.id, weightKey, event.target.value)}
                            placeholder="Weight (kg)"
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                          />
                          <input
                            value={getEffectInput(effectiveQuest.id, repsKey)}
                            onChange={(event) => setEffectInput(effectiveQuest.id, repsKey, event.target.value)}
                            placeholder="Reps per set (e.g. 8,7,6)"
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                          />
                          <input
                            value={getEffectInput(effectiveQuest.id, setsKey)}
                            onChange={(event) => setEffectInput(effectiveQuest.id, setsKey, event.target.value)}
                            placeholder="Sets completed"
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                          />
                        </div>
                        {effortUnlocked ? (
                          <div className="mt-2">
                            <p className="text-[11px] text-zinc-500">How hard was that?</p>
                            <div className="mt-1.5 flex flex-wrap gap-2">
                              {EFFORT_OPTIONS.map((opt) => {
                                const active = selectedEffort === opt.value;
                                return (
                                  <button
                                    key={`${normalized}-${opt.value}`}
                                    type="button"
                                    onClick={() => setEffectInput(effectiveQuest.id, effortKey, opt.value)}
                                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                                      active
                                        ? "border-emerald-500/45 bg-emerald-950/30 text-emerald-100"
                                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-[11px] text-zinc-600">
                            Effort-based autoregulation is available on advanced training level.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                            value={getEffectInput(effectiveQuest.id, fieldKey)}
                            onChange={(event) => setEffectInput(effectiveQuest.id, fieldKey, event.target.value)}
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
              const choice = getEffectInput(effectiveQuest.id, key);
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
                    onChange={(event) => setEffectInput(effectiveQuest.id, key, event.target.value)}
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
                  const checked = protocolStepChecks[effectiveQuest.id]?.[stepIdx] ?? false;
                  return (
                    <li key={`${effectiveQuest.id}-${stepIdx}`} className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => toggleProtocolStep(effectiveQuest.id, stepIdx)}
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
                  value={getEffectInput(effectiveQuest.id, key)}
                  onChange={(event) => setEffectInput(effectiveQuest.id, key, event.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                  rows={3}
                />
              </div>
            );
          })}
      </li>
    );
  };

  if (!isReady || !xpResolved) return <LoadingScreen label="Loading…" />;

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
            {isFinalStep && (
              <div className="mx-auto mt-6 w-full max-w-sm text-left">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">What is your training level?</p>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {(["beginner", "intermediate", "advanced"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setTrainingLevel(lvl)}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                        trainingLevel === lvl
                          ? "border-zinc-400 bg-zinc-100 text-zinc-900"
                          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      {trainingLevelLabel(lvl)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              className="mx-auto mt-10 w-full max-w-sm rounded-full border border-zinc-500 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-all duration-200 hover:border-zinc-300 hover:bg-white"
              onClick={async () => {
                if (!isFinalStep) {
                  setOnboardingStep((step) => Math.min(step + 1, ONBOARDING_STEPS.length - 1));
                  return;
                }
                window.localStorage.setItem(TRAINING_LEVEL_STORAGE_KEY, trainingLevel);
                const user = await getCurrentUser();
                if (user) {
                  await supabase.from("profiles").update({ training_level: trainingLevel }).eq("id", user.id);
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

  const strengthRank = getStrengthRank(level);
  const pressureStreakLine = streakPressureLine(currentStreak);
  const pathXp = trainingXpState.strength?.xp ?? 0;
  const xpToNextRetentionLine = formatXpToNextLevelLine(pathXp);
  const pathLevelForUnlocks = getPathLevelFromXp(pathXp);
  const effUnlockLevel = effectiveLevelForPathUnlocks(pathLevelForUnlocks, effectivePro);
  const nextStrengthUnlock = getNextStrengthUnlock(STRENGTH_PATH_ID, effUnlockLevel);
  const unlockAnticipation = nextUnlockAnticipationLine({
    currentXp: pathXp,
    effectivePro,
    nextUnlock: nextStrengthUnlock,
  });
  const furtherLockedUnlocks = getPathUnlocks(STRENGTH_PATH_ID)
    .filter((u) => u.levelRequirement > effUnlockLevel)
    .sort((a, b) => a.levelRequirement - b.levelRequirement)
    .slice(1, 3);
  const todayForProgramWeek = new Date();
  const programWeek = getProgramWeekInfo(todayForProgramWeek);
  const effectiveDailyReadiness = readinessForTrainingLevel(dailyReadiness, trainingLevel);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {protocolCompletionFeedback && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700/90 bg-zinc-900/95 px-6 py-7 text-left shadow-[0_24px_80px_-40px_rgba(255,255,255,0.2)] transition-all duration-300">
            <p className="text-xl font-semibold leading-snug tracking-tight text-zinc-50">{PROTOCOL_COMPLETION_HEADLINE}</p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{PROTOCOL_COMPLETION_CONTEXT}</p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">{PROTOCOL_COMPLETION_SUBLINE}</p>
            {protocolCompletionFeedback.streakLine && (
              <div className="mt-6 border-t border-zinc-800/80 pt-5">
                <p className="text-sm leading-relaxed text-zinc-300">{protocolCompletionFeedback.streakLine}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{STREAK_CHAIN_REMINDER}</p>
              </div>
            )}
            {protocolCompletionFeedback.progressMessages.length > 0 ? (
              <div className="mt-5 space-y-2">
                {protocolCompletionFeedback.progressMessages.map((message) => (
                  <p key={message} className="text-sm font-medium leading-relaxed text-emerald-400/85">
                    {message}
                  </p>
                ))}
              </div>
            ) : (
              protocolCompletionFeedback.stronger && (
                <p className="mt-5 text-sm font-medium leading-relaxed text-emerald-500/85">
                  {STRONGER_THAN_LAST_SESSION_LINE}
                </p>
              )
            )}
            <div className="mt-4 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
              <p className="text-[11px] text-zinc-400">Total volume this week: {protocolCompletionFeedback.weeklyVolume.toLocaleString()}</p>
              {protocolCompletionFeedback.strongestLift && (
                <p className="mt-1 text-[11px] text-zinc-400">Strongest lift: {protocolCompletionFeedback.strongestLift}</p>
              )}
            </div>
            {!effectivePro && (
              <div className="mt-4">
                <p className="text-xs text-zinc-500">You're making progress. Unlock the full system to keep it going.</p>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline"
                  onClick={() => setProConversionModalOpen(true)}
                >
                  Unlock Full System
                </button>
              </div>
            )}
            <button
              type="button"
              className="mt-8 w-full rounded-full border border-zinc-600 bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors duration-200 hover:border-zinc-400 hover:bg-white"
              onClick={() => {
                setProtocolCompletionFeedback(null);
                if (firstSystemMomentPendingRef.current) {
                  firstSystemMomentPendingRef.current = false;
                  setFirstSystemMomentOpen(true);
                }
                if (!effectivePro && progressUpgradePromptPendingRef.current) {
                  progressUpgradePromptPendingRef.current = false;
                  setProConversionModalOpen(true);
                }
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
      {identityNotice && (
        <div className="fixed left-1/2 top-[4.5rem] z-[66] w-[min(90vw,20rem)] -translate-x-1/2 rounded-lg border border-zinc-700/90 bg-zinc-900/95 px-4 py-2.5 text-center text-xs font-medium leading-snug tracking-tight text-zinc-200 shadow-[0_12px_40px_-25px_rgba(255,255,255,0.2)]">
          {identityNotice}
          <button
            type="button"
            className="ml-2 inline align-baseline text-[10px] font-medium text-zinc-500 hover:text-zinc-300"
            onClick={() => setIdentityNotice(null)}
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}
      {unlockNotification && (
        <div className="fixed right-4 top-20 z-[65] max-w-md rounded-xl border border-emerald-900/40 bg-zinc-900/95 px-4 py-3 text-left text-xs leading-relaxed text-zinc-200 shadow-[0_12px_40px_-25px_rgba(16,185,129,0.12)] whitespace-pre-line">
          {unlockNotification}
        </div>
      )}
      {proConversionModalOpen && (
        <div className="fixed inset-0 z-[72] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            <button
              type="button"
              className="absolute -top-1 right-0 z-10 rounded-full px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-200"
              onClick={() => setProConversionModalOpen(false)}
              aria-label="Close"
            >
              Close
            </button>
            <ProLockedCard variant="standard" className="mt-6" />
          </div>
        </div>
      )}
      {firstSystemMomentOpen && (
        <div className="fixed inset-0 z-[73] flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-900/95 px-6 py-8 text-left shadow-[0_24px_80px_-40px_rgba(0,0,0,0.85)]">
            <p className="text-lg font-semibold leading-snug tracking-tight text-zinc-50">{FIRST_SYSTEM_MOMENT_LINE_1}</p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-500">{FIRST_SYSTEM_MOMENT_LINE_2}</p>
            <button
              type="button"
              className="mt-8 w-full rounded-full border border-zinc-600 bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors duration-200 hover:border-zinc-400 hover:bg-white"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(FIRST_SYSTEM_MOMENT_STORAGE_KEY, "1");
                }
                setFirstSystemMomentOpen(false);
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl justify-center px-4 py-10">
        <section className="w-full max-w-md">
          <div className="mb-8 border-b border-zinc-800/60 pb-8">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-[1.65rem]">{HOME_HERO_HEADLINE}</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">{HOME_HERO_SUBHEADLINE}</p>
          </div>
          <header className="mb-8 border-b border-zinc-800/90 pb-8">
            <div className="mb-6 border-b border-zinc-800/50 pb-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">System Integrity</p>
              <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm tabular-nums">
                <span className="font-medium text-zinc-200">{systemIntegrityScore}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-600">100</span>
                <span className="text-zinc-600">·</span>
                <span
                  className={
                    systemIntegrityScore >= 60 ? "text-xs font-medium text-zinc-500" : "text-xs font-medium text-amber-500/85"
                  }
                >
                  {getIntegrityStatusLabel(systemIntegrityScore)}
                </span>
              </p>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400/90">Strength System Active</p>
            <div className="mt-3 space-y-1">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-zinc-50">Strength Level {level}</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">
                Rank · <span className="text-zinc-400">{strengthRank}</span>
              </p>
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
          </header>

          <div className="mb-5 space-y-1.5 rounded-lg border border-zinc-800/60 bg-zinc-950/30 px-3 py-2.5">
            {completed[0] && dailyQuests.length > 0 && (
              <p className="text-[11px] leading-relaxed text-zinc-500">{formatNextSessionAvailableLine(expiryMs)}</p>
            )}
            {xpToNextRetentionLine && (
              <p className="text-[11px] leading-relaxed text-zinc-500">{xpToNextRetentionLine}</p>
            )}
            <p className="text-[11px] leading-relaxed text-zinc-500">{formatWeeklyGoalLine(weeklySessionsCount)}</p>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Total volume this week: {weeklyStrengthStats.totalVolume.toLocaleString()}
            </p>
            {weeklyStrengthStats.strongestLift && (
              <p className="text-[11px] leading-relaxed text-zinc-500">Strongest lift: {weeklyStrengthStats.strongestLift}</p>
            )}
            <p className="text-[10px] leading-relaxed text-zinc-600">{STAY_CONSISTENT_REMINDER}</p>
          </div>

          {isPaidReady && !isPaidUser && (
            <div className="mb-5">
              <ProLockedCard
                variant="compact"
                notice={
                  level >= FREE_MAX_PATH_LEVEL ? (
                    <p className="text-[11px] leading-relaxed text-amber-500/85">{UPGRADE_LIMIT_MESSAGE}</p>
                  ) : null
                }
              />
            </div>
          )}

          <p className="mb-2 text-sm font-medium leading-snug text-zinc-200">{getTodayTrainingHeadline(new Date())}</p>
          <p className="mb-3 text-[11px] text-zinc-600">
            Weekly structure rotates by weekday: Upper Push, Lower, Recovery, Upper Pull, Lower/Full, then recovery.
          </p>
          {nextStrengthUnlock && (
            <div className="mb-4 space-y-2 border-b border-zinc-800/60 pb-4">
              {unlockAnticipation && (
                <p className="text-[11px] font-medium leading-relaxed text-zinc-300">{unlockAnticipation}</p>
              )}
              <p className="text-[11px] leading-relaxed text-zinc-500">{unlockLevelPreviewLine(nextStrengthUnlock)}</p>
            </div>
          )}

          {furtherLockedUnlocks.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">Also coming</p>
              <ul className="mt-2 space-y-2">
                {furtherLockedUnlocks.map((u) => (
                  <li
                    key={`${u.title}-${u.levelRequirement}`}
                    className="rounded-lg border border-zinc-800/90 bg-zinc-950/50 px-3 py-2 opacity-[0.82]"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                      Level {u.levelRequirement} · {u.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-zinc-600">{lockedPathTeaser(u)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dailyQuests.length > 0 && !completed[0] && (
            <div className="mb-4 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-3">
              <p className="text-[11px] font-medium text-zinc-300">How do you feel today?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["fresh", "normal", "tired"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setDailyReadiness(r);
                      saveReadinessForDate(getLocalDateKey(), r);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      dailyReadiness === r
                        ? "border-emerald-500/45 bg-emerald-950/25 text-emerald-100/95"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {r === "fresh" ? "Fresh" : r === "normal" ? "Normal" : "Tired"}
                  </button>
                ))}
              </div>
              {(effectiveDailyReadiness === "fresh" || effectiveDailyReadiness === "tired") && (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] text-emerald-500/90">{SESSION_ADJUSTED_MESSAGE}</p>
                  <p className="text-[10px] text-zinc-500">{readinessFeedbackLine(effectiveDailyReadiness)}</p>
                </div>
              )}
            </div>
          )}
          <div className="mb-4 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-zinc-300">Training Level</p>
              <p className="text-[10px] text-zinc-500">{trainingLevelLabel(trainingLevel)}</p>
            </div>
            <p className="mt-1 text-[10px] text-zinc-500">This changes how challenging your sessions are.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["beginner", "intermediate", "advanced"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  disabled={trainingLevelSaving}
                  onClick={() => void updateTrainingLevelSetting(lvl)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    trainingLevel === lvl
                      ? "border-zinc-400 bg-zinc-100 text-zinc-900"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {trainingLevelLabel(lvl)}
                </button>
              ))}
            </div>
            {!completed[0] && dailyQuests.length > 0 && (
              <button
                type="button"
                disabled={trainingLevelSaving}
                onClick={() => void updateTrainingLevelSetting(trainingLevel, { applyToToday: true })}
                className="mt-2 text-[10px] text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
              >
                Apply to today&apos;s session
              </button>
            )}
            {trainingLevelNotice && <p className="mt-2 text-[10px] text-zinc-500">{trainingLevelNotice}</p>}
          </div>

          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Today's Training</h2>
          <p className="mb-2 text-[11px] text-zinc-400">
            Week {programWeek.weekNumber} - {programWeek.intent}
          </p>
          <div className="mb-3 space-y-1">
            <p className="text-[11px] text-zinc-400">You're on Week {programWeek.weekNumber} of your system.</p>
            <p className="text-[10px] text-zinc-500">
              {weeklySessionsCount >= 2 ? "Your training is progressing." : "Stay consistent. Your training is progressing."}
            </p>
            <p className="text-[10px] text-zinc-600">Your system is evolving.</p>
          </div>
          <p className="mb-1 text-[11px] leading-relaxed text-zinc-500">
            This session works by progressive overload: add a little more load, reps, or quality over time.
          </p>
          <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">
            Exercises are chosen to cover your main patterns first, then accessories to build weak points.
          </p>
          <div className="mb-4 space-y-2">
            {pressureStreakLine && (
              <p className="text-[11px] leading-relaxed text-zinc-500">{pressureStreakLine}</p>
            )}
            {yesterdayDailyMissed && (
              <p className="text-[11px] leading-relaxed text-amber-500/80">{MISSED_YESTERDAY_SESSION}</p>
            )}
            {dailyQuests.length > 0 && !completed[0] && (
              <>
                <p className="text-[11px] leading-relaxed text-zinc-500">{trainingProtocolExpirySentence(expiryMs)}</p>
                <p className="text-[11px] leading-relaxed text-zinc-600">{URGENCY_MAINTAIN_SYSTEM}</p>
                <p className="text-[10px] leading-relaxed text-zinc-600/75">{INTEGRITY_PRESSURE_HINT}</p>
              </>
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
          {dailyQuests.length > 0 && completed[0] && (
            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-100/95">Session Complete</p>
                <p className="mt-1 text-[11px] text-emerald-200/80">
                  Today&apos;s structured training is done. XP, progression, and logs are finalized.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/25 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Optional Conditioning</p>
                <p className="mt-1 text-[11px] text-zinc-500">Optional 10-20 min easy cardio. Not tied to XP or progression.</p>
                <button
                  type="button"
                  onClick={() => setOptionalConditioningDone((prev) => !prev)}
                  className="mt-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] text-zinc-300 transition-colors hover:border-zinc-600"
                >
                  {optionalConditioningDone ? "Conditioning logged (optional)" : "Mark optional conditioning done"}
                </button>
              </div>
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