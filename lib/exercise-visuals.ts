export type ExerciseVisual = {
  src: string;
  label: string;
  source: string;
};

const VISUAL_SOURCE = "Ascend movement SVG pack";

const KEYWORD_VISUALS: Array<{ keywords: string[]; visual: Omit<ExerciseVisual, "source"> }> = [
  { keywords: ["bench", "press", "dip"], visual: { src: "/exercise-visuals/push.svg", label: "Push movement demo" } },
  { keywords: ["row", "pull", "pulldown", "chin"], visual: { src: "/exercise-visuals/pull.svg", label: "Pull movement demo" } },
  { keywords: ["squat", "leg press", "hack squat"], visual: { src: "/exercise-visuals/squat.svg", label: "Squat movement demo" } },
  { keywords: ["deadlift", "rdl", "hinge", "hip thrust"], visual: { src: "/exercise-visuals/hinge.svg", label: "Hinge movement demo" } },
  { keywords: ["lunge", "split squat", "step-up"], visual: { src: "/exercise-visuals/lunge.svg", label: "Lunge movement demo" } },
  { keywords: ["curl", "triceps", "raise", "face pull"], visual: { src: "/exercise-visuals/accessory.svg", label: "Accessory movement demo" } },
  { keywords: ["leg raise", "plank", "crunch", "core"], visual: { src: "/exercise-visuals/core.svg", label: "Core movement demo" } },
  { keywords: ["bike", "cardio", "carry"], visual: { src: "/exercise-visuals/conditioning.svg", label: "Conditioning movement demo" } },
];

export function getExerciseVisual(name: string): ExerciseVisual {
  const normalized = name.trim().toLowerCase();
  for (const entry of KEYWORD_VISUALS) {
    if (entry.keywords.some((k) => normalized.includes(k))) {
      return { ...entry.visual, source: VISUAL_SOURCE };
    }
  }
  return {
    src: "/exercise-visuals/accessory.svg",
    label: "General strength movement demo",
    source: VISUAL_SOURCE,
  };
}
