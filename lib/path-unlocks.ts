export type UnlockEffectType =
  | "pre_protocol_prompt"
  | "post_protocol_reflection"
  | "input_tracker"
  | "ui_modifier"
  | "protocol_enhancer"
  | "autoregulation"
  | "training_split_unlock"
  /** Metadata-only training milestone for progression messaging. */
  | "training_progression";

export type PathUnlock = {
  title: string;
  description: string;
  levelRequirement: number;
  pathId: string;
  effectType: UnlockEffectType;
  effectConfig: Record<string, unknown>;
};

const unlocks = (pathId: string, entries: Array<Omit<PathUnlock, "pathId">>): PathUnlock[] =>
  entries.map((entry) => ({ ...entry, pathId }));

/** Strength path: level milestones follow real programming progression, not UI features. */
export const PATH_UNLOCKS_BY_PATH: Record<string, PathUnlock[]> = {
  strength_training: unlocks("strength_training", [
    {
      levelRequirement: 1,
      title: "Core System",
      description: "Your full core strength system is active from day one.",
      effectType: "training_progression",
      effectConfig: { stage: "core_system" },
    },
    {
      levelRequirement: 2,
      title: "Improved Feedback",
      description: "Session feedback becomes sharper and more actionable.",
      effectType: "post_protocol_reflection",
      effectConfig: { stage: "improved_feedback" },
    },
    {
      levelRequirement: 3,
      title: "Smarter Progression",
      description: "Progression logic gets smarter with stronger failure handling and targeting.",
      effectType: "training_progression",
      effectConfig: {
        stage: "smarter_progression",
      },
    },
    {
      levelRequirement: 4,
      title: "Fatigue Optimisation",
      description: "Fatigue adjustment and deload timing become more precise.",
      effectType: "ui_modifier",
      effectConfig: {
        stage: "fatigue_optimisation",
        hint: "Fatigue and deload optimization are active — keep quality high.",
      },
    },
    {
      levelRequirement: 5,
      title: "Advanced Insights",
      description: "Deeper tracking and insight quality to optimize long-term outcomes.",
      effectType: "input_tracker",
      effectConfig: {
        stage: "advanced_insights",
      },
    },
  ]),
};

export const FOUNDATION_UNLOCK_LEVEL = 1;
export const PROGRESSION_UNLOCK_LEVEL = 2;
export const INTENSITY_UNLOCK_LEVEL = 3;
export const OPTIMISATION_UNLOCK_LEVEL = 4;
export const ADVANCED_UNLOCK_LEVEL = 5;
/** Backward-compatible alias used in existing weekly training logic. */
export const SPLIT_TRAINING_UNLOCK_LEVEL = PROGRESSION_UNLOCK_LEVEL;

export const getPathUnlocks = (pathId: string): PathUnlock[] => PATH_UNLOCKS_BY_PATH[pathId] ?? [];

export const getNewlyUnlockedForLevel = (pathId: string, previousLevel: number, nextLevel: number): PathUnlock[] =>
  getPathUnlocks(pathId).filter(
    (unlock) => unlock.levelRequirement > previousLevel && unlock.levelRequirement <= nextLevel
  );

export const getActivePathUnlocks = (pathId: string, level: number): PathUnlock[] =>
  getPathUnlocks(pathId).filter((unlock) => level >= unlock.levelRequirement);

/** Next milestone unlock (for “unlock required to progress” messaging). */
export function getNextStrengthUnlock(pathId: string, currentLevel: number): PathUnlock | null {
  const upcoming = getPathUnlocks(pathId)
    .filter((u) => u.levelRequirement > currentLevel)
    .sort((a, b) => a.levelRequirement - b.levelRequirement);
  return upcoming[0] ?? null;
}
