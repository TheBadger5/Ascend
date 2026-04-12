"use client";

import { supabase } from "@/lib/supabase";

export type ProfileRow = {
  id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  best_streak: number;
  /** Pro access — set in Supabase (`is_paid_user`), e.g. via Gumroad webhook. */
  is_paid_user?: boolean;
  /** Day 1 baseline tests (max reps; plank_time in seconds, optional). */
  pushups_max?: number | null;
  squats_max?: number | null;
  plank_time?: number | null;
  /** Latest re-test (defaults to baseline until updated on Progress). */
  current_pushups_max?: number | null;
  current_squats_max?: number | null;
  current_plank_time?: number | null;
  baseline_completed_at?: string | null;
};

export type DailyTasksRow = {
  id: string;
  user_id: string;
  date: string;
  tasks: Array<{ id: number; category: string; task: string }>;
  completed: boolean[];
};

export type HistoryRow = {
  id: string;
  user_id: string;
  date: string;
  xp_earned: number;
  completed_all: boolean;
  streak: number;
};

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const getOrCreateProfile = async (userId: string): Promise<ProfileRow> => {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!error && data) {
    return data as ProfileRow;
  }
  const fallback: ProfileRow = {
    id: userId,
    total_xp: 0,
    level: 1,
    current_streak: 0,
    best_streak: 0,
    is_paid_user: false,
    pushups_max: null,
    squats_max: null,
    plank_time: null,
    current_pushups_max: null,
    current_squats_max: null,
    current_plank_time: null,
    baseline_completed_at: null,
  };
  await supabase.from("profiles").upsert(fallback);
  return fallback;
};
