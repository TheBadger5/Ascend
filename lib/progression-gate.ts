/**
 * Level-ups require real training volume: 3 distinct calendar days with a completed
 * daily protocol at your current level before XP can cross into the next level band.
 */

import {
  ensureStrengthLine,
  getPathLevelFromXp,
  type StrengthProgressionGate,
  type TrainingXpState,
} from "./ascend-path-config";

export const SESSIONS_REQUIRED_FOR_LEVEL_UP = 3;

/** Max XP while still inside level L (inclusive upper bound of that band). */
export function maxXpForLevel(level: number): number {
  return level * 100 - 1;
}

export function defaultProgression(forLevel: number): StrengthProgressionGate {
  return {
    sessionsTowardNextLevel: 0,
    sessionDatesThisLevel: [],
    trackedForLevel: forLevel,
  };
}

/** Attach or resync progression if level changed (e.g. migration, external edit). */
export function syncProgressionWithLevel(state: TrainingXpState): TrainingXpState {
  const line = ensureStrengthLine(state).strength;
  const lv = getPathLevelFromXp(line.xp);
  const existing = state.progression;
  if (!existing || existing.trackedForLevel !== lv) {
    return { ...state, progression: defaultProgression(lv) };
  }
  return state;
}

export function addDailySessionIfNewDay(
  state: TrainingXpState,
  dateKey: string,
  sessionsRequired: number = SESSIONS_REQUIRED_FOR_LEVEL_UP
): TrainingXpState {
  const s = syncProgressionWithLevel(state);
  const p = s.progression!;
  if (p.sessionDatesThisLevel.includes(dateKey)) return s;
  if (p.sessionsTowardNextLevel >= sessionsRequired) return s;
  return {
    ...s,
    progression: {
      ...p,
      sessionDatesThisLevel: [...p.sessionDatesThisLevel, dateKey],
      sessionsTowardNextLevel: p.sessionsTowardNextLevel + 1,
    },
  };
}

/**
 * Apply XP delta with level-up gating. Optionally count one daily session (distinct day)
 * before applying XP — use when the user completes the main daily protocol.
 */
export function applyXpDeltaWithGate(
  state: TrainingXpState,
  delta: number,
  opts?: {
    countDailySession?: boolean;
    dateKey?: string;
    sessionsRequired?: number;
    /** Absolute XP ceiling (e.g. free tier cap). */
    maxTotalXp?: number;
  }
): TrainingXpState {
  const sessionsRequired = opts?.sessionsRequired ?? SESSIONS_REQUIRED_FOR_LEVEL_UP;
  let s = syncProgressionWithLevel(state);
  if (opts?.countDailySession && opts.dateKey) {
    s = addDailySessionIfNewDay(s, opts.dateKey, sessionsRequired);
  }

  const xpBefore = s.strength.xp;
  const levelBefore = getPathLevelFromXp(xpBefore);
  let xpAfter = xpBefore + delta;
  const prog = s.progression!;

  const proposedLevel = getPathLevelFromXp(xpAfter);
  if (proposedLevel > levelBefore && prog.sessionsTowardNextLevel < sessionsRequired) {
    xpAfter = Math.min(xpAfter, maxXpForLevel(levelBefore));
  }

  if (opts?.maxTotalXp != null) {
    xpAfter = Math.min(xpAfter, opts.maxTotalXp);
  }

  const levelAfter = getPathLevelFromXp(xpAfter);
  let nextProg: StrengthProgressionGate = prog;

  if (levelAfter > levelBefore && prog.sessionsTowardNextLevel >= sessionsRequired) {
    nextProg = {
      sessionsTowardNextLevel: 0,
      sessionDatesThisLevel: [],
      trackedForLevel: levelAfter,
    };
  } else {
    nextProg = { ...prog, trackedForLevel: levelBefore };
  }

  return {
    strength: { xp: xpAfter, level: levelAfter },
    progression: nextProg,
  };
}

export function getProgressionSummary(
  state: TrainingXpState,
  opts?: { sessionsRequired?: number }
): {
  sessionsTowardNextLevel: number;
  sessionsRequired: number;
  atXpCapForLevel: boolean;
  canLevelUpWithCurrentXp: boolean;
} {
  const sessionsRequired = opts?.sessionsRequired ?? SESSIONS_REQUIRED_FOR_LEVEL_UP;
  const s = syncProgressionWithLevel(state);
  const xp = s.strength.xp;
  const lv = getPathLevelFromXp(xp);
  const p = s.progression!;
  const maxXp = maxXpForLevel(lv);
  const atCap = xp >= maxXp;
  const sessions = p.sessionsTowardNextLevel;
  const canLevel = sessions >= sessionsRequired;
  return {
    sessionsTowardNextLevel: sessions,
    sessionsRequired,
    atXpCapForLevel: atCap,
    canLevelUpWithCurrentXp: canLevel,
  };
}
