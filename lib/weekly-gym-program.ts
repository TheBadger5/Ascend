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

export function getGymSessionForDate(d: Date): GymSession {
  return SESSION_BY_WEEKDAY[d.getDay()] ?? mondayUpperPush;
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
