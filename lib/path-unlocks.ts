export type UnlockEffectType =
  | "pre_protocol_prompt"
  | "post_protocol_reflection"
  | "input_tracker"
  | "ui_modifier"
  | "protocol_enhancer"
  | "autoregulation"
  /** Metadata only — weekly lower/upper/full split activates at this level (see `weekly-training.ts`). */
  | "training_split_unlock";

export type PathUnlock = {
  title: string;
  description: string;
  levelRequirement: 3 | 5 | 7 | 10 | 15;
  pathId: string;
  effectType: UnlockEffectType;
  effectConfig: Record<string, unknown>;
};

const unlocks = (pathId: string, entries: Array<Omit<PathUnlock, "pathId">>): PathUnlock[] =>
  entries.map((entry) => ({ ...entry, pathId }));

/** Strength path: each unlock gates meaningful training capability, not cosmetics. */
export const PATH_UNLOCKS_BY_PATH: Record<string, PathUnlock[]> = {
  strength_training: unlocks("strength_training", [
    {
      levelRequirement: 3,
      title: "Movement focus",
      description: "You must name a primary focus movement before opening the full protocol.",
      effectType: "pre_protocol_prompt",
      effectConfig: {
        prompt: "Select your focus movement for this session (e.g. squat, hinge, bench, pull).",
      },
    },
    {
      levelRequirement: 5,
      title: "Workout tracking",
      description: "Log load and reps for your working sets—required to execute when unlocked.",
      effectType: "input_tracker",
      effectConfig: { prompt: "Session log", fields: ["Lift / exercise", "Sets × reps", "Load"] },
    },
    {
      levelRequirement: 7,
      title: "Structured workout templates",
      description: "Adds a written set scheme step before your first working set.",
      effectType: "protocol_enhancer",
      effectConfig: {
        additionalStep: "Before your first working set, write your full set scheme (sets × reps @ target load).",
      },
    },
    {
      levelRequirement: 10,
      title: "Split week training",
      description: "Unlocks the weekly lower / upper / full rotation (push–pull–legs style structure).",
      effectType: "training_split_unlock",
      effectConfig: {},
    },
    {
      levelRequirement: 15,
      title: "Autoregulation",
      description: "Adjust session intensity based on readiness.",
      effectType: "autoregulation",
      effectConfig: {
        prompt: "Adjust today’s session intensity",
        options: ["Reduce volume", "Maintain plan", "Push progression"],
      },
    },
  ]),
};

export const MOVEMENT_FOCUS_UNLOCK_LEVEL = 3;
export const WORKOUT_TRACKING_UNLOCK_LEVEL = 5;
export const STRUCTURED_TEMPLATES_UNLOCK_LEVEL = 7;
export const SPLIT_TRAINING_UNLOCK_LEVEL = 10;

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
