"use client";

import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "./ascend-data";

/** Result of reading `public.profiles` for Pro gating (no client-side fake flags). */
export type PaidAccessFetchResult = {
  isPaidUser: boolean;
  userId: string | null;
  userEmail: string | null;
  /** `true` if a row exists in `public.profiles` for this user. */
  profileRowFound: boolean;
  /** Raw `is_paid_user` from the row; `null` if no row or column absent. */
  isPaidUserRaw: boolean | null;
};

/**
 * Loads the signed-in user, fetches `public.profiles` (`id`, `is_paid_user`), derives Pro access.
 * Pro is granted only when `is_paid_user === true` on an existing row.
 */
export async function fetchPaidAccessState(): Promise<PaidAccessFetchResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        isPaidUser: false,
        userId: null,
        userEmail: null,
        profileRowFound: false,
        isPaidUserRaw: null,
      };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, is_paid_user")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) {
      return {
        isPaidUser: false,
        userId: user.id,
        userEmail: user.email ?? null,
        profileRowFound: false,
        isPaidUserRaw: null,
      };
    }

    const raw = data.is_paid_user;
    const isPaid = raw === true;
    const normalizedRaw: boolean | null =
      typeof raw === "boolean" ? raw : null;

    return {
      isPaidUser: isPaid,
      userId: user.id,
      userEmail: user.email ?? null,
      profileRowFound: true,
      isPaidUserRaw: normalizedRaw,
    };
  } catch {
    return {
      isPaidUser: false,
      userId: null,
      userEmail: null,
      profileRowFound: false,
      isPaidUserRaw: null,
    };
  }
}

