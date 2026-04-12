"use client";

import { useState } from "react";
import { usePaidAccess } from "@/lib/paid-access-provider";

type Props = {
  className?: string;
  /** Default: post-purchase sync copy */
  label?: string;
};

/**
 * Re-fetches `profiles` from Supabase and updates `isPaidUser` from real `is_paid_user` only
 * (no client-side unlock — see `fetchPaidAccessState`).
 */
export default function RefreshAccessButton({
  className = "",
  label = "Already paid? Refresh access",
}: Props) {
  const { refresh } = usePaidAccess();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void refresh().finally(() => {
          setBusy(false);
        });
      }}
      className={`text-[11px] font-medium tracking-wide text-zinc-500 transition-colors hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {busy ? "Checking access…" : label}
    </button>
  );
}
