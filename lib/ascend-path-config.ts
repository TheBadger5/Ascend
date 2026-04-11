/**
 * Ascend: single-line strength training XP. Unlock ids in path-unlocks use this key.
 */

export type PathProgress = { xp: number; level: number };

/** Distinct daily completions toward leveling up (see `progression-gate.ts`). */
export type StrengthProgressionGate = {
  sessionsTowardNextLevel: number;
  sessionDatesThisLevel: string[];
  trackedForLevel: number;
};

/** Persisted at ascend.path-xp.v1 — one strength line only */
export type TrainingXpState = {
  strength: PathProgress;
  progression?: StrengthProgressionGate;
};

/** Same id as `path-unlocks` entries for strength */
export const STRENGTH_UNLOCK_PATH_ID = "strength_training" as const;

export const getPathLevelFromXp = (xp: number) => Math.floor(xp / 100) + 1;

export function createEmptyTrainingXp(): TrainingXpState {
  return {
    strength: { xp: 0, level: 1 },
    progression: { sessionsTowardNextLevel: 0, sessionDatesThisLevel: [], trackedForLevel: 1 },
  };
}

export function ensureStrengthLine(state: TrainingXpState): TrainingXpState {
  if (state.strength && typeof state.strength.xp === "number") {
    const xp = Number(state.strength.xp);
    const lv = getPathLevelFromXp(xp);
    const withProg =
      state.progression && state.progression.trackedForLevel === lv
        ? state
        : { ...state, progression: { sessionsTowardNextLevel: 0, sessionDatesThisLevel: [], trackedForLevel: lv } };
    return withProg;
  }
  return { strength: { xp: 0, level: 1 }, progression: { sessionsTowardNextLevel: 0, sessionDatesThisLevel: [], trackedForLevel: 1 } };
}

export function getSystemMetricsFromTrainingXp(state: TrainingXpState): { totalXP: number; level: number } {
  const xp = Number(state.strength?.xp ?? 0);
  return { totalXP: xp, level: getPathLevelFromXp(xp) };
}

function sumLegacyPhysicalBuckets(raw: unknown): number {
  let totalXp = 0;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, Record<string, PathProgress>>;
    for (const bucketKey of ["physical", "mental", "social"] as const) {
      const bucket = o[bucketKey];
      if (bucket && typeof bucket === "object") {
        for (const p of Object.values(bucket)) {
          totalXp += Number(p?.xp ?? 0);
        }
      }
    }
  }
  return totalXp;
}

/**
 * Migrate localStorage XP into `{ strength }`.
 * Handles: new shape, legacy category buckets, and old `{ physical: { strength_training } }` only.
 */
export function migrateTrainingXp(raw: unknown): TrainingXpState {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o.strength && typeof o.strength === "object") {
      const s = o.strength as PathProgress;
      const xp = Number(s.xp ?? 0);
      const lv = getPathLevelFromXp(xp);
      const rawProg = o.progression as StrengthProgressionGate | undefined;
      const progression =
        rawProg &&
        typeof rawProg.sessionsTowardNextLevel === "number" &&
        Array.isArray(rawProg.sessionDatesThisLevel) &&
        typeof rawProg.trackedForLevel === "number"
          ? rawProg.trackedForLevel === lv
            ? rawProg
            : { sessionsTowardNextLevel: 0, sessionDatesThisLevel: [], trackedForLevel: lv }
          : { sessionsTowardNextLevel: 0, sessionDatesThisLevel: [], trackedForLevel: lv };
      return { strength: { xp, level: lv }, progression };
    }
  }
  const totalXp = sumLegacyPhysicalBuckets(raw);
  const lv = getPathLevelFromXp(totalXp);
  return {
    strength: { xp: totalXp, level: lv },
    progression: { sessionsTowardNextLevel: 0, sessionDatesThisLevel: [], trackedForLevel: lv },
  };
}
