"use client";

/**
 * Structured weekly gym split used by the home "Today's Training" card.
 * Rotates by weekday in local time and always returns a deterministic session.
 */

export type GymExercise = {
  name: string;
  sets: string;
  reps: string;
  rest: string;
};

export type GymSession = {
  id: string;
  title: string;
  instruction: string;
  why: string;
  minimum: string;
  insight: string;
  exercises: GymExercise[];
};

type DaySplitKey = "upper_push" | "lower" | "recovery" | "upper_pull" | "lower_full" | "optional";

const mondayUpperPush: GymSession = {
  id: "day-1-upper-push",
  title: "Day 1 — Upper (Push Focus)",
  instruction: "Pressing priority with mandatory pull balance. Hit compounds first, then accessories.",
  why: "Builds pressing strength and upper-body hypertrophy while keeping weekly volume organized.",
  minimum: "Complete the first 4 exercises with planned sets/reps before adding accessories.",
  insight: "If all sets hit the top of the rep range with clean form, add load next week.",
  exercises: [
    { name: "Barbell Bench Press", sets: "4", reps: "5-8", rest: "2-3 min" },
    { name: "Chest-Supported Row", sets: "3", reps: "6-10", rest: "2 min" },
    { name: "Standing Overhead Press", sets: "3", reps: "6-8", rest: "2-3 min" },
    { name: "Incline Dumbbell Press", sets: "3", reps: "8-12", rest: "90-120 sec" },
    { name: "Lateral Raise", sets: "3", reps: "12-15", rest: "60-90 sec" },
    { name: "Cable or Ring Dips", sets: "2-3", reps: "8-12", rest: "90 sec" },
  ],
};

const tuesdayLower: GymSession = {
  id: "day-2-lower",
  title: "Day 2 — Lower",
  instruction: "Squat pattern first, then hinge and unilateral accessory work.",
  why: "Develops leg strength, trunk stability, and better force output for all lifts.",
  minimum: "Finish squat + hinge + one single-leg accessory at target effort.",
  insight: "Keep 1-2 reps in reserve on compounds to sustain quality across the week.",
  exercises: [
    { name: "Back Squat", sets: "4", reps: "5-8", rest: "2-3 min" },
    { name: "Romanian Deadlift", sets: "3", reps: "6-10", rest: "2 min" },
    { name: "Leg Press", sets: "3", reps: "10-12", rest: "90-120 sec" },
    { name: "Walking Lunge", sets: "3", reps: "8-12 / leg", rest: "90 sec" },
    { name: "Standing Calf Raise", sets: "3", reps: "12-15", rest: "60-90 sec" },
  ],
};

const wednesdayRecovery: GymSession = {
  id: "day-3-recovery",
  title: "Day 3 — Recovery Strength (Low Fatigue)",
  instruction: "Lighter strength session focused on quality reps and technique. Cardio/mobility are optional add-ons only.",
  why: "Maintains strength practice while controlling fatigue between hard days.",
  minimum: "Complete the first 4 resistance exercises; optional cardio/mobility comes after lifting.",
  insight: "This day protects recovery while keeping movement patterns sharp.",
  exercises: [
    { name: "Goblet Squat", sets: "3", reps: "8-12", rest: "90 sec" },
    { name: "Romanian Deadlift (Light)", sets: "3", reps: "8-10", rest: "90-120 sec" },
    { name: "Incline Dumbbell Press", sets: "3", reps: "8-12", rest: "90 sec" },
    { name: "Seated Cable Row", sets: "3", reps: "8-12", rest: "90 sec" },
    { name: "Optional: Bike Zone 2", sets: "1", reps: "15-20 min", rest: "n/a" },
    { name: "Optional: Mobility Flow", sets: "1-2", reps: "8-10 / side", rest: "45 sec" },
  ],
};

const thursdayUpperPull: GymSession = {
  id: "day-4-upper-pull",
  title: "Day 4 — Upper (Pull Focus)",
  instruction: "Pulling priority with mandatory push balance. Compounds first, then accessories.",
  why: "Improves posture, pulling strength, and shoulder balance against pressing volume.",
  minimum: "Complete row + vertical pull + one rear-delt movement before extras.",
  insight: "Progress reps first; when all sets hit top reps, increase load next week.",
  exercises: [
    { name: "Barbell Row", sets: "4", reps: "5-8", rest: "2-3 min" },
    { name: "Pull-up or Lat Pulldown", sets: "4", reps: "6-10", rest: "2 min" },
    { name: "Flat Dumbbell Press", sets: "3", reps: "6-10", rest: "2 min" },
    { name: "Chest-Supported Dumbbell Row", sets: "3", reps: "8-12", rest: "90-120 sec" },
    { name: "Face Pull", sets: "3", reps: "12-15", rest: "60-90 sec" },
    { name: "EZ-Bar Curl", sets: "2-3", reps: "10-12", rest: "60-90 sec" },
  ],
};

const fridayLowerFull: GymSession = {
  id: "day-5-lower-full",
  title: "Day 5 — Lower / Full Body",
  instruction: "Posterior-chain emphasis with full-body support work.",
  why: "Rounds out the week with hinge strength and total-body training density.",
  minimum: "Finish deadlift + squat pattern + one upper accessory to complete the split.",
  insight: "Keep deadlift quality high; stop sets when bar speed drops hard.",
  exercises: [
    { name: "Deadlift", sets: "3-4", reps: "3-6", rest: "2-3 min" },
    { name: "Front Squat or Hack Squat", sets: "3", reps: "6-10", rest: "2 min" },
    { name: "Bulgarian Split Squat", sets: "3", reps: "8-10 / leg", rest: "90-120 sec" },
    { name: "Seated Cable Row", sets: "3", reps: "8-12", rest: "90 sec" },
    { name: "Hanging Leg Raise", sets: "3", reps: "10-15", rest: "60-90 sec" },
  ],
};

const saturdayOptional: GymSession = {
  id: "day-6-optional",
  title: "Day 6 — Optional Full Body Strength",
  instruction: "Optional full-body resistance day. Conditioning work is optional after lifting.",
  why: "Adds productive practice volume without replacing core weekly sessions.",
  minimum: "Complete at least 4 resistance exercises first; extras are optional.",
  insight: "Keep this day submaximal so it supports, not sabotages, next week.",
  exercises: [
    { name: "Front Squat", sets: "3", reps: "5-8", rest: "2 min" },
    { name: "Romanian Deadlift", sets: "3", reps: "6-10", rest: "2 min" },
    { name: "Bench Press", sets: "3", reps: "5-8", rest: "2 min" },
    { name: "Lat Pulldown", sets: "3", reps: "8-12", rest: "90 sec" },
    { name: "Optional: Farmer Carry", sets: "3-4", reps: "20-30 m", rest: "60-90 sec" },
    { name: "Optional: Bike Intervals", sets: "5-6", reps: "20-30 sec", rest: "60-90 sec" },
  ],
};

const sundayRecovery: GymSession = {
  id: "day-7-recovery",
  title: "Day 7 — Technique Strength / Recovery",
  instruction: "Low-fatigue technique-focused resistance session. Mobility/cardio are optional extras.",
  why: "Keeps movement quality high while reducing systemic fatigue.",
  minimum: "Perform the first 4 resistance movements with conservative loading.",
  insight: "Technique work now improves heavy performance later in the week.",
  exercises: [
    { name: "Paused Squat (Light)", sets: "3", reps: "4-6", rest: "2 min" },
    { name: "Trap Bar Deadlift (Light)", sets: "3", reps: "4-6", rest: "2 min" },
    { name: "Overhead Press (Light)", sets: "3", reps: "6-8", rest: "90-120 sec" },
    { name: "Chest-Supported Row", sets: "3", reps: "8-10", rest: "90 sec" },
    { name: "Optional: Mobility Flow", sets: "1-2", reps: "8-10 / side", rest: "45 sec" },
  ],
};

const mondayUpperPushAlt: GymSession = {
  ...mondayUpperPush,
  id: "day-1-upper-push-alt",
  instruction: "Pressing priority with pull balance. Use alternate pressing angles to keep progress moving.",
  exercises: [
    { name: "Incline Barbell Bench Press", sets: "4", reps: "5-8", rest: "2-3 min" },
    { name: "Seated Cable Row", sets: "3", reps: "6-10", rest: "2 min" },
    { name: "Seated Dumbbell Shoulder Press", sets: "3", reps: "6-8", rest: "2-3 min" },
    { name: "Machine Chest Press", sets: "3", reps: "8-12", rest: "90-120 sec" },
    { name: "Cable Lateral Raise", sets: "3", reps: "12-15", rest: "60-90 sec" },
    { name: "Overhead Triceps Extension", sets: "2-3", reps: "10-12", rest: "90 sec" },
  ],
};

const tuesdayLowerAlt: GymSession = {
  ...tuesdayLower,
  id: "day-2-lower-alt",
  instruction: "Lower-body focus with machine + unilateral emphasis to keep pattern quality high.",
  exercises: [
    { name: "Front Squat", sets: "4", reps: "5-8", rest: "2-3 min" },
    { name: "Hip Thrust", sets: "3", reps: "6-10", rest: "2 min" },
    { name: "Hack Squat", sets: "3", reps: "8-12", rest: "90-120 sec" },
    { name: "Reverse Lunge", sets: "3", reps: "8-12 / leg", rest: "90 sec" },
    { name: "Seated Calf Raise", sets: "3", reps: "12-15", rest: "60-90 sec" },
  ],
};

const wednesdayRecoveryAlt: GymSession = {
  ...wednesdayRecovery,
  id: "day-3-recovery-alt",
  exercises: [
    { name: "Leg Press (Light)", sets: "3", reps: "10-12", rest: "90 sec" },
    { name: "Single-Leg Romanian Deadlift", sets: "3", reps: "8-10", rest: "90-120 sec" },
    { name: "Machine Incline Press", sets: "3", reps: "8-12", rest: "90 sec" },
    { name: "Lat Pulldown (Controlled)", sets: "3", reps: "8-12", rest: "90 sec" },
    { name: "Optional: Easy Bike", sets: "1", reps: "15-20 min", rest: "n/a" },
    { name: "Optional: Thoracic Mobility", sets: "1-2", reps: "8-10 / side", rest: "45 sec" },
  ],
};

const thursdayUpperPullAlt: GymSession = {
  ...thursdayUpperPull,
  id: "day-4-upper-pull-alt",
  exercises: [
    { name: "Pendlay Row", sets: "4", reps: "5-8", rest: "2-3 min" },
    { name: "Neutral-Grip Lat Pulldown", sets: "4", reps: "6-10", rest: "2 min" },
    { name: "Incline Dumbbell Press", sets: "3", reps: "6-10", rest: "2 min" },
    { name: "Single-Arm Cable Row", sets: "3", reps: "8-12", rest: "90-120 sec" },
    { name: "Rear Delt Fly", sets: "3", reps: "12-15", rest: "60-90 sec" },
    { name: "Hammer Curl", sets: "2-3", reps: "10-12", rest: "60-90 sec" },
  ],
};

const fridayLowerFullAlt: GymSession = {
  ...fridayLowerFull,
  id: "day-5-lower-full-alt",
  exercises: [
    { name: "Trap Bar Deadlift", sets: "3-4", reps: "3-6", rest: "2-3 min" },
    { name: "Leg Press (Heavy)", sets: "3", reps: "6-10", rest: "2 min" },
    { name: "Walking Lunge", sets: "3", reps: "8-10 / leg", rest: "90-120 sec" },
    { name: "Chest-Supported Row", sets: "3", reps: "8-12", rest: "90 sec" },
    { name: "Cable Crunch", sets: "3", reps: "10-15", rest: "60-90 sec" },
  ],
};

const saturdayOptionalAlt: GymSession = {
  ...saturdayOptional,
  id: "day-6-optional-alt",
  exercises: [
    { name: "Goblet Squat", sets: "3", reps: "8-12", rest: "2 min" },
    { name: "Romanian Deadlift", sets: "3", reps: "6-10", rest: "2 min" },
    { name: "Standing Overhead Press", sets: "3", reps: "5-8", rest: "2 min" },
    { name: "Seated Cable Row", sets: "3", reps: "8-12", rest: "90 sec" },
    { name: "Optional: Sled Push", sets: "4", reps: "20-30 m", rest: "60-90 sec" },
    { name: "Optional: Tempo Bike", sets: "1", reps: "10-15 min", rest: "n/a" },
  ],
};

const sundayRecoveryAlt: GymSession = {
  ...sundayRecovery,
  id: "day-7-recovery-alt",
  exercises: [
    { name: "Leg Press (Tempo)", sets: "3", reps: "8-10", rest: "2 min" },
    { name: "Romanian Deadlift (Light)", sets: "3", reps: "6-8", rest: "2 min" },
    { name: "Dumbbell Bench Press (Light)", sets: "3", reps: "8-10", rest: "90-120 sec" },
    { name: "Lat Pulldown (Light)", sets: "3", reps: "8-10", rest: "90 sec" },
    { name: "Optional: Mobility Flow", sets: "1-2", reps: "8-10 / side", rest: "45 sec" },
  ],
};

// JavaScript getDay(): 0=Sun ... 6=Sat
const SESSION_BY_WEEKDAY: Record<number, GymSession> = {
  0: sundayRecovery,
  1: mondayUpperPush,
  2: tuesdayLower,
  3: wednesdayRecovery,
  4: thursdayUpperPull,
  5: fridayLowerFull,
  6: saturdayOptional,
};

const SPLIT_BY_WEEKDAY: Record<number, DaySplitKey> = {
  0: "recovery",
  1: "upper_push",
  2: "lower",
  3: "recovery",
  4: "upper_pull",
  5: "lower_full",
  6: "optional",
};

const SESSION_VARIANTS_BY_SPLIT: Record<DaySplitKey, GymSession[]> = {
  upper_push: [mondayUpperPush, mondayUpperPushAlt],
  lower: [tuesdayLower, tuesdayLowerAlt],
  recovery: [wednesdayRecovery, wednesdayRecoveryAlt, sundayRecovery, sundayRecoveryAlt],
  upper_pull: [thursdayUpperPull, thursdayUpperPullAlt],
  lower_full: [fridayLowerFull, fridayLowerFullAlt],
  optional: [saturdayOptional, saturdayOptionalAlt],
};

export function getGymSessionForDate(d: Date): GymSession {
  return SESSION_BY_WEEKDAY[d.getDay()] ?? mondayUpperPush;
}

export function getGymSessionRefreshForDate(d: Date, excludeSessionId?: string): GymSession {
  const split = SPLIT_BY_WEEKDAY[d.getDay()] ?? "upper_push";
  const candidates = SESSION_VARIANTS_BY_SPLIT[split] ?? [getGymSessionForDate(d)];
  const withoutExcluded = excludeSessionId ? candidates.filter((s) => s.id !== excludeSessionId) : candidates;
  if (withoutExcluded.length > 0) {
    return withoutExcluded[0];
  }
  return candidates[0] ?? getGymSessionForDate(d);
}

export function identifyGymSessionForDateAndSteps(d: Date, steps: string[]): GymSession | null {
  const split = SPLIT_BY_WEEKDAY[d.getDay()] ?? "upper_push";
  const candidates = SESSION_VARIANTS_BY_SPLIT[split] ?? [getGymSessionForDate(d)];
  const key = JSON.stringify(steps);
  for (const session of candidates) {
    if (JSON.stringify(session.exercises.map(toExerciseStep)) === key) {
      return session;
    }
  }
  return null;
}

export function getTodayTrainingHeadline(d: Date): string {
  return getGymSessionForDate(d).title;
}

export function toExerciseStep(e: GymExercise): string {
  return `${e.name} — ${e.sets} sets · ${e.reps} reps · rest ${e.rest}`;
}

function scaleSetsLabel(label: string, scale: number): string {
  const m = label.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!m) return label;
  const minRaw = Number.parseInt(m[1] ?? "0", 10);
  const maxRaw = m[2] ? Number.parseInt(m[2], 10) : minRaw;
  const minScaled = Math.max(1, Math.round(minRaw * scale));
  const maxScaled = Math.max(minScaled, Math.round(maxRaw * scale));
  return minScaled === maxScaled ? String(minScaled) : `${minScaled}-${maxScaled}`;
}

export function applySessionVolumeScale(session: GymSession, scale: number): GymSession {
  if (scale >= 0.99) return session;
  return {
    ...session,
    exercises: session.exercises.map((e) => ({ ...e, sets: scaleSetsLabel(e.sets, scale) })),
  };
}
