"use client";

export type TrainingLevel = "beginner" | "intermediate" | "advanced";

export const TRAINING_LEVEL_STORAGE_KEY = "ascend.training-level.v1";

export function parseTrainingLevel(raw: unknown): TrainingLevel | null {
  const v = String(raw ?? "").toLowerCase();
  if (v === "beginner" || v === "intermediate" || v === "advanced") return v;
  return null;
}

export function normalizeTrainingLevel(raw: unknown): TrainingLevel {
  return parseTrainingLevel(raw) ?? "intermediate";
}

export function trainingLevelLabel(level: TrainingLevel): string {
  if (level === "beginner") return "Beginner";
  if (level === "advanced") return "Advanced";
  return "Intermediate";
}

export function progressionSpeedForTrainingLevel(level: TrainingLevel): "slow" | "standard" | "aggressive" {
  if (level === "beginner") return "slow";
  if (level === "advanced") return "aggressive";
  return "standard";
}
