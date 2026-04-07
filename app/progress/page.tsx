"use client";

import { useEffect, useState } from "react";
import { getPathUnlocks } from "@/lib/path-unlocks";
import LoadingScreen from "../loading-screen";
const PATH_STORAGE_KEY = "ascend.path-selections.v1";
const PATH_XP_STORAGE_KEY = "ascend.path-xp.v1";
const CATEGORY_ORDER = ["physical", "mental", "social"] as const;
const CATEGORY_LABELS = {
  physical: "Physical Health",
  mental: "Mental Health",
  social: "Social Health",
} as const;
const PATH_OPTIONS = {
  physical: [
    { id: "strength_training", label: "Strength Training" },
    { id: "cardio_conditioning", label: "Cardio / Conditioning" },
    { id: "martial_arts", label: "Martial Arts" },
    { id: "nutrition", label: "Nutrition" },
    { id: "sleep_recovery", label: "Sleep / Recovery" },
  ],
  mental: [
    { id: "learning_skill_acquisition", label: "Learning / Skill Acquisition" },
    { id: "focus_deep_work", label: "Focus / Deep Work" },
    { id: "reflection_awareness", label: "Reflection / Awareness" },
    { id: "financial_mastery", label: "Financial Mastery" },
  ],
  social: [
    { id: "relationships", label: "Relationships" },
    { id: "communication", label: "Communication" },
    { id: "confidence_exposure", label: "Confidence / Exposure" },
  ],
} as const;
const LEGACY_PATH_ID_MIGRATION: Record<string, string> = {
  strength: "strength_training",
  cardio: "cardio_conditioning",
  learning: "learning_skill_acquisition",
  focus: "focus_deep_work",
  reflection: "reflection_awareness",
  confidence: "confidence_exposure",
};
type CategoryKey = (typeof CATEGORY_ORDER)[number];
type PathProgress = { xp: number; level: number };
type PathSelections = Record<CategoryKey, string>;
type PathXpState = Record<CategoryKey, Record<string, PathProgress>>;

const createEmptyPathXpState = (): PathXpState => ({
  physical: {},
  mental: {},
  social: {},
});
const normalizePathId = (pathId: string) => LEGACY_PATH_ID_MIGRATION[pathId] ?? pathId;

export default function ProgressPage() {
  const [pathSelections, setPathSelections] = useState<PathSelections | null>(null);
  const [pathXpState, setPathXpState] = useState<PathXpState>(createEmptyPathXpState());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const load = () => {
      const storedPaths = window.localStorage.getItem(PATH_STORAGE_KEY);
      if (storedPaths) {
        const parsed = JSON.parse(storedPaths) as PathSelections;
        const normalized: PathSelections = {
          physical: normalizePathId(
            typeof parsed?.physical === "object"
              ? (parsed.physical as { primary?: string })?.primary ?? "strength_training"
              : parsed?.physical ?? "strength_training"
          ),
          mental: normalizePathId(
            typeof parsed?.mental === "object"
              ? (parsed.mental as { primary?: string })?.primary ?? "learning_skill_acquisition"
              : parsed?.mental ?? "learning_skill_acquisition"
          ),
          social: normalizePathId(
            typeof parsed?.social === "object"
              ? (parsed.social as { primary?: string })?.primary ?? "relationships"
              : parsed?.social ?? "relationships"
          ),
        };
        setPathSelections(normalized);
      }
      const storedXp = window.localStorage.getItem(PATH_XP_STORAGE_KEY);
      if (storedXp) {
        const parsed = JSON.parse(storedXp) as PathXpState;
        const normalized = createEmptyPathXpState();
        for (const category of CATEGORY_ORDER) {
          for (const [rawPathId, value] of Object.entries(parsed?.[category] ?? {})) {
            const pathId = normalizePathId(rawPathId);
            const xp = Number(value?.xp ?? 0);
            normalized[category][pathId] = { xp, level: Math.floor(xp / 100) + 1 };
          }
        }
        setPathXpState(normalized);
      }
      setIsReady(true);
    };
    load();
  }, []);

  if (!isReady) {
    return <LoadingScreen label="Loading system progress..." />;
  }

  const activePaths = pathSelections
    ? CATEGORY_ORDER.flatMap((category) => {
        const ids = [pathSelections[category]];
        return ids.map((pathId) => {
          const label = PATH_OPTIONS[category].find((option) => option.id === pathId)?.label ?? pathId;
          const progress = pathXpState[category]?.[pathId] ?? { xp: 0, level: 1 };
          return { category, categoryLabel: CATEGORY_LABELS[category], pathId, label, ...progress };
        });
      })
    : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center justify-center px-4 py-8">
        <section className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/95 px-6 py-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
          <h1 className="mb-2 text-4xl font-semibold tracking-tight text-zinc-50">
            System Progress
          </h1>
          <p className="mb-8 text-sm text-zinc-400">Path-specific system performance overview</p>

          <div className="space-y-3">
            {activePaths.length === 0 ? (
              <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4 text-sm text-zinc-400">
                No active paths configured yet.
              </div>
            ) : (
              activePaths.map((path) => (
                <div key={`${path.category}-${path.pathId}`} className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
                  {(() => {
                    const xpInLevel = path.xp % 100;
                    const xpToNextLevel = 100 - xpInLevel;
                    return (
                      <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-zinc-100">{path.categoryLabel} / {path.label}</p>
                    <p className="text-xs text-zinc-300">Level {path.level}</p>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-700">
                    <div className="h-full rounded-full bg-zinc-300 transition-all duration-300" style={{ width: `${xpInLevel}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>Current XP: {path.xp}</span>
                    <span>{xpToNextLevel} XP to Level {path.level + 1}</span>
                  </div>
                  <div className="mt-3 border-t border-zinc-700/70 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Unlocks</p>
                    <div className="mt-2 space-y-2">
                      {getPathUnlocks(path.pathId).map((unlock) => {
                        const isUnlocked = path.level >= unlock.levelRequirement;
                        return (
                          <div
                            key={`${path.pathId}-${unlock.levelRequirement}`}
                            className={`rounded-lg border px-3 py-2 ${
                              isUnlocked
                                ? "border-zinc-600/90 bg-zinc-900/60"
                                : "border-zinc-700/80 bg-zinc-900/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-xs font-medium ${isUnlocked ? "text-zinc-200" : "text-zinc-400"}`}>
                                {unlock.title}
                              </p>
                              <span className={`text-[10px] ${isUnlocked ? "text-zinc-300" : "text-zinc-500"}`}>
                                {isUnlocked ? "Unlocked" : `Locked · L${unlock.levelRequirement}`}
                              </span>
                            </div>
                            <p className={`mt-1 text-[11px] ${isUnlocked ? "text-zinc-500" : "text-zinc-600"}`}>
                              Effect: {unlock.effectType.replaceAll("_", " ")}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
