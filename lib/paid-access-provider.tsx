"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PaidAccessFetchResult } from "@/lib/paid-access";
import { fetchPaidAccessState } from "@/lib/paid-access";
import { supabase } from "@/lib/supabase";

type PaidAccessContextValue = {
  /** Mirrors `public.profiles.is_paid_user === true` after fetch. */
  isPaidUser: boolean;
  /** False until the first paid-access fetch completes. */
  isReady: boolean;
  /** Re-query `public.profiles` for `is_paid_user`. */
  refresh: () => Promise<boolean>;
  /** Temporary: last fetch diagnostics (remove when done debugging). */
  debug: PaidAccessFetchResult | null;
};

const PaidAccessContext = createContext<PaidAccessContextValue | null>(null);

export function PaidAccessProvider({ children }: { children: React.ReactNode }) {
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [debug, setDebug] = useState<PaidAccessFetchResult | null>(null);

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const result = await fetchPaidAccessState();
      setIsPaidUser(result.isPaidUser);
      setDebug(result);
      return result.isPaidUser;
    } catch {
      setIsPaidUser(false);
      setDebug({
        isPaidUser: false,
        userId: null,
        userEmail: null,
        profileRowFound: false,
        isPaidUserRaw: null,
      });
      return false;
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ isPaidUser, isReady, refresh, debug }),
    [isPaidUser, isReady, refresh, debug]
  );

  return <PaidAccessContext.Provider value={value}>{children}</PaidAccessContext.Provider>;
}

export function usePaidAccess(): PaidAccessContextValue {
  const ctx = useContext(PaidAccessContext);
  if (!ctx) {
    throw new Error("usePaidAccess must be used within PaidAccessProvider");
  }
  return ctx;
}
