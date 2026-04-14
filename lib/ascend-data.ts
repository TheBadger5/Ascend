"use client";

import { logProfileTableDebug } from "@/lib/profile-supabase-debug";
import { supabase } from "@/lib/supabase";

export type ProfileRow = {
  id: string;
  total_xp: number;
  level: number;
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
  return user;
};

/** Only core columns required by the current progression model. */
function coreProfileUpsertPayload(userId: string) {
  return {
    id: userId,
    total_xp: 0,
    level: 1,
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
