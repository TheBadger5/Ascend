"use client";

import AscendLogo from "@/components/ascend-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { usePaidAccess } from "@/lib/paid-access-provider";
import { supabase } from "@/lib/supabase";
import LogoutButton from "./logout-button";

const WEEKLY_REVIEW_UNLOCK_LEVEL = 10;

export default function TopNav() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReviewUnlocked, setIsReviewUnlocked] = useState(false);
  const { isPaidUser, isReady: isPaidReady } = usePaidAccess();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isToday = pathname === "/";
  const isProgress = pathname === "/progress";
  const isReview = pathname === "/review";
  const isStats = pathname === "/stats";
  const isUpgrade = pathname === "/upgrade";

  useEffect(() => {
    const syncAuthAndUnlocks = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsAuthenticated(false);
          setIsReviewUnlocked(false);
          return;
        }
        setIsAuthenticated(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("level")
          .eq("id", session.user.id)
          .single();
        const level = Number(profile?.level ?? 1);
        setIsReviewUnlocked(level >= WEEKLY_REVIEW_UNLOCK_LEVEL);
      } catch {
        setIsAuthenticated(false);
        setIsReviewUnlocked(false);
      }
    };

    syncAuthAndUnlocks();
    window.addEventListener("focus", syncAuthAndUnlocks);
    return () => {
      window.removeEventListener("focus", syncAuthAndUnlocks);
    };
  }, []);

  if (isAuthPage) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-90"
          aria-label="Ascend home"
        >
          <AscendLogo size={40} priority />
        </Link>
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1 rounded-full border border-zinc-700/80 bg-zinc-900/80 p-1">
          <Link
            href="/"
            className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              isToday
                ? "bg-zinc-200 text-zinc-900"
                : "text-zinc-300 hover:text-zinc-100"
            }`}
          >
            Today
          </Link>
          <Link
            href="/progress"
            className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              isProgress
                ? "bg-zinc-200 text-zinc-900"
                : "text-zinc-300 hover:text-zinc-100"
            }`}
          >
            Progress
          </Link>
          <Link
            href="/stats"
            className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              isStats
                ? "bg-zinc-200 text-zinc-900"
                : "text-zinc-300 hover:text-zinc-100"
            }`}
          >
            Stats
          </Link>
          {isReviewUnlocked && (
            <Link
              href="/review"
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                isReview
                  ? "bg-zinc-200 text-zinc-900"
                  : "text-zinc-300 hover:text-zinc-100"
              }`}
            >
              Review
            </Link>
          )}
          {isPaidReady && !isPaidUser && (
            <Link
              href="/upgrade"
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                isUpgrade ? "bg-zinc-200 text-zinc-900" : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              Upgrade
            </Link>
          )}
          </nav>
          {isAuthenticated && <LogoutButton />}
        </div>
      </div>
    </header>
  );
}
