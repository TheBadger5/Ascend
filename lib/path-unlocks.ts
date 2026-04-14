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
      title: "Foundation",
      description: "Basic weekly gym plan with core compounds and repeatable session structure.",
      effectType: "training_progression",
      effectConfig: { stage: "foundation" },
    },
    {
      levelRequirement: 2,
      title: "Progression",
      description: "Increased exercise variety and higher productive volume for faster adaptation.",
      effectType: "training_split_unlock",
      effectConfig: { stage: "progression" },
    },
    {
      levelRequirement: 3,
      title: "Intensity",
      description: "Heavier loading ranges and advanced progression methods on priority lifts.",
      effectType: "protocol_enhancer",
      effectConfig: {
        stage: "intensity",
        additionalStep: "For your top lift, complete one controlled top set, then two back-off sets at 90-92% load.",
      },
    },
    {
      levelRequirement: 4,
      title: "Optimisation",
      description: "Fatigue management and deload sequencing are automatically integrated.",
      effectType: "ui_modifier",
      effectConfig: {
        stage: "optimisation",
        hint: "Deload and fatigue controls are active this phase — quality reps over grind reps.",
      },
    },
    {
      levelRequirement: 5,
      title: "Advanced",
      description: "Full auto-regulated system: readiness + effort-driven load progression.",
      effectType: "autoregulation",
      effectConfig: {
        stage: "advanced",
        prompt: "Adjust today’s session intensity",
        options: ["Reduce volume", "Maintain plan", "Push progression"],
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
