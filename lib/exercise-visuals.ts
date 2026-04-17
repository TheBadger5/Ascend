export type ExerciseVisual = {
  src: string;
  label: string;
  source: string;
};

const VISUAL_SOURCE = "Ascend movement SVG pack";

const EXERCISE_VISUAL_MAP: Record<string, Omit<ExerciseVisual, "source">> = {
  "barbell bench press": { src: "/exercise-visuals/push.svg", label: "Barbell bench press demo" },
  "bench press": { src: "/exercise-visuals/push.svg", label: "Bench press demo" },
  "incline barbell bench press": { src: "/exercise-visuals/push.svg", label: "Incline barbell bench press demo" },
  "incline dumbbell press": { src: "/exercise-visuals/push.svg", label: "Incline dumbbell press demo" },
  "flat dumbbell press": { src: "/exercise-visuals/push.svg", label: "Flat dumbbell press demo" },
  "dumbbell bench press": { src: "/exercise-visuals/push.svg", label: "Dumbbell bench press demo" },
  "standing overhead press": { src: "/exercise-visuals/push.svg", label: "Standing overhead press demo" },
  "overhead press": { src: "/exercise-visuals/push.svg", label: "Overhead press demo" },
  "seated dumbbell shoulder press": { src: "/exercise-visuals/push.svg", label: "Seated dumbbell shoulder press demo" },
  "machine chest press": { src: "/exercise-visuals/push.svg", label: "Machine chest press demo" },
  "cable or ring dips": { src: "/exercise-visuals/push.svg", label: "Dips demo" },
  "chest-supported row": { src: "/exercise-visuals/pull.svg", label: "Chest-supported row demo" },
  "chest-supported dumbbell row": { src: "/exercise-visuals/pull.svg", label: "Chest-supported dumbbell row demo" },
  "seated cable row": { src: "/exercise-visuals/pull.svg", label: "Seated cable row demo" },
  "barbell row": { src: "/exercise-visuals/pull.svg", label: "Barbell row demo" },
  "pendlay row": { src: "/exercise-visuals/pull.svg", label: "Pendlay row demo" },
  "single-arm cable row": { src: "/exercise-visuals/pull.svg", label: "Single-arm cable row demo" },
  "pull-up or lat pulldown": { src: "/exercise-visuals/pull.svg", label: "Pull-up or lat pulldown demo" },
  "lat pulldown": { src: "/exercise-visuals/pull.svg", label: "Lat pulldown demo" },
  "neutral-grip lat pulldown": { src: "/exercise-visuals/pull.svg", label: "Neutral-grip lat pulldown demo" },
  "back squat": { src: "/exercise-visuals/squat.svg", label: "Back squat demo" },
  "front squat": { src: "/exercise-visuals/squat.svg", label: "Front squat demo" },
  "front squat or hack squat": { src: "/exercise-visuals/squat.svg", label: "Front squat or hack squat demo" },
  "goblet squat": { src: "/exercise-visuals/squat.svg", label: "Goblet squat demo" },
  "paused squat": { src: "/exercise-visuals/squat.svg", label: "Paused squat demo" },
  "leg press": { src: "/exercise-visuals/squat.svg", label: "Leg press demo" },
  "hack squat": { src: "/exercise-visuals/squat.svg", label: "Hack squat demo" },
  deadlift: { src: "/exercise-visuals/hinge.svg", label: "Deadlift demo" },
  "romanian deadlift": { src: "/exercise-visuals/hinge.svg", label: "Romanian deadlift demo" },
  "single-leg romanian deadlift": { src: "/exercise-visuals/hinge.svg", label: "Single-leg Romanian deadlift demo" },
  "trap bar deadlift": { src: "/exercise-visuals/hinge.svg", label: "Trap bar deadlift demo" },
  "hip thrust": { src: "/exercise-visuals/hinge.svg", label: "Hip thrust demo" },
  "walking lunge": { src: "/exercise-visuals/lunge.svg", label: "Walking lunge demo" },
  "reverse lunge": { src: "/exercise-visuals/lunge.svg", label: "Reverse lunge demo" },
  "bulgarian split squat": { src: "/exercise-visuals/lunge.svg", label: "Bulgarian split squat demo" },
  "hanging leg raise": { src: "/exercise-visuals/core.svg", label: "Hanging leg raise demo" },
  "cable crunch": { src: "/exercise-visuals/core.svg", label: "Cable crunch demo" },
  "optional: bike zone 2": { src: "/exercise-visuals/conditioning.svg", label: "Zone 2 bike demo" },
  "optional: bike intervals": { src: "/exercise-visuals/conditioning.svg", label: "Bike intervals demo" },
  "optional: easy bike": { src: "/exercise-visuals/conditioning.svg", label: "Easy bike demo" },
  "optional: tempo bike": { src: "/exercise-visuals/conditioning.svg", label: "Tempo bike demo" },
  "optional: farmer carry": { src: "/exercise-visuals/conditioning.svg", label: "Farmer carry demo" },
  "optional: sled push": { src: "/exercise-visuals/conditioning.svg", label: "Sled push demo" },
  "lateral raise": { src: "/exercise-visuals/accessory.svg", label: "Lateral raise demo" },
  "cable lateral raise": { src: "/exercise-visuals/accessory.svg", label: "Cable lateral raise demo" },
  "face pull": { src: "/exercise-visuals/accessory.svg", label: "Face pull demo" },
  "rear delt fly": { src: "/exercise-visuals/accessory.svg", label: "Rear delt fly demo" },
  "ez-bar curl": { src: "/exercise-visuals/accessory.svg", label: "EZ-bar curl demo" },
  "hammer curl": { src: "/exercise-visuals/accessory.svg", label: "Hammer curl demo" },
  "overhead triceps extension": { src: "/exercise-visuals/accessory.svg", label: "Overhead triceps extension demo" },
  "standing calf raise": { src: "/exercise-visuals/accessory.svg", label: "Standing calf raise demo" },
  "seated calf raise": { src: "/exercise-visuals/accessory.svg", label: "Seated calf raise demo" },
};

function normalizeExerciseName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\(light\)|\(heavy\)|\(tempo\)|\(controlled\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getExerciseVisual(name: string): ExerciseVisual | null {
  const normalized = normalizeExerciseName(name);
  const mapped = EXERCISE_VISUAL_MAP[normalized];
  if (!mapped) return null;
  return { ...mapped, source: VISUAL_SOURCE };
}
