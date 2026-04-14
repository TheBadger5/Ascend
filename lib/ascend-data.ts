"use client";

import { logProfileTableDebug } from "@/lib/profile-supabase-debug";
import { supabase } from "@/lib/supabase";

export type ProfileRow = {
  id: string;
  total_xp: number;
  level: number;
  total_strength_xp?: number;
  strength_level?: number;
  system_integrity?: number;
  baseline_completed_at?: string | null;
  strength_gate_sessions?: number;
  strength_gate_dates?: string[];
  strength_gate_tracked_level?: number;
  training_level?: "beginner" | "intermediate" | "advanced";
  current_streak: number;
  best_streak: number;
  /** Pro access — set in Supabase (`is_paid_user`), e.g. via Gumroad webhook. */
  is_paid_user?: boolean;
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
  if (user) return user;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) return session.user;
  await new Promise((resolve) => setTimeout(resolve, 180));
  const {
    data: { user: retriedUser },
  } = await supabase.auth.getUser();
  return retriedUser ?? null;
};

/** Only core columns required by the current progression model. */
function coreProfileUpsertPayload(userId: string) {
  return {
    id: userId,
    total_xp: 0,
    level: 1,
    total_strength_xp: 0,
    strength_level: 1,
    system_integrity: 100,
    strength_gate_sessions: 0,
    strength_gate_dates: [],
    strength_gate_tracked_level: 1,
    training_level: "intermediate",
    current_streak: 0,
    best_streak: 0,
    is_paid_user: false,
  };
}

export const getOrCreateProfile = async (userId: string): Promise<ProfileRow> => {
  logProfileTableDebug("ascend-data:getOrCreateProfile", "select", {
    query: 'from("profiles").select("*").eq("id", userId).single()',
  });
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!error && data) {
    return data as ProfileRow;
  }
  const fallback: ProfileRow = {
    id: userId,
    total_xp: 0,
    level: 1,
    total_strength_xp: 0,
    strength_level: 1,
    system_integrity: 100,
    baseline_completed_at: null,
    strength_gate_sessions: 0,
    strength_gate_dates: [],
    strength_gate_tracked_level: 1,
    training_level: "intermediate",
    current_streak: 0,
    best_streak: 0,
    is_paid_user: false,
  };
  const upsertPayload = coreProfileUpsertPayload(userId);
  logProfileTableDebug("ascend-data:getOrCreateProfile", "upsert", {
    query: 'from("profiles").upsert(corePayload)',
    upsertKeys: Object.keys(upsertPayload),
  });
  await supabase.from("profiles").upsert(upsertPayload);
  return fallback;
};
