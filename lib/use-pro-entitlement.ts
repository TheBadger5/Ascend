"use client";

import { useMemo } from "react";
import { usePaidAccess } from "@/lib/paid-access-provider";
import { effectiveProAccess } from "@/lib/pro-gating";

/**
 * Single rule for Pro: profile loaded (`isPaidReady`) and `is_paid_user === true`.
 * Use `effectivePro` for every Pro gate — never `isPaidUser` alone (fails open before fetch).
 */
export function useProEntitlement() {
  const { isPaidUser, isReady: isPaidReady, refresh, debug } = usePaidAccess();
  const effectivePro = useMemo(
    () => effectiveProAccess(isPaidReady, isPaidUser),
    [isPaidReady, isPaidUser]
  );
  return { isPaidUser, isPaidReady, effectivePro, refresh, debug };
}
