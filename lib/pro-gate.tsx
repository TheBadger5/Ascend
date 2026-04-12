"use client";

import type { ReactNode } from "react";
import { useProEntitlement } from "@/lib/use-pro-entitlement";

type ProGateProps = {
  children: ReactNode;
  /** Shown when profile is ready and user is not Pro (locked + CTA). */
  fallback: ReactNode;
  /** When true, also hide children until `isPaidReady` (shows nothing). */
  waitForProfile?: boolean;
};

/**
 * Renders `children` only when `effectivePro` is true (profile loaded + `is_paid_user`).
 * Use for any Pro-only UI block; prefer `useProEntitlement().effectivePro` for inline checks.
 */
export function ProGate({ children, fallback, waitForProfile = false }: ProGateProps) {
  const { effectivePro, isPaidReady } = useProEntitlement();
  if (!isPaidReady) {
    return waitForProfile ? null : <>{fallback}</>;
  }
  if (!effectivePro) return <>{fallback}</>;
  return <>{children}</>;
}
