"use client";

import Link from "next/link";
import FreeVsProComparison from "@/components/free-vs-pro-comparison";
import ProLockedCard from "@/components/pro-locked-card";
import { FREE_MAX_PATH_LEVEL } from "@/lib/monetization";
import { useProEntitlement } from "@/lib/use-pro-entitlement";
import LoadingScreen from "../loading-screen";

export default function UpgradePage() {
  const { effectivePro, isPaidReady } = useProEntitlement();

  if (!isPaidReady) {
    return <LoadingScreen label="Loading…" />;
  }

  if (effectivePro) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center justify-center px-4 py-12">
          <section className="w-full max-w-md text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-500/90">Full system</p>
            <p className="mt-4 text-lg text-zinc-300">Your account has full access — structured programming and advanced sessions are unlocked.</p>
            <Link
              href="/"
              className="mt-8 inline-block rounded-full border border-zinc-600 bg-zinc-100 px-6 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-white"
            >
              Back to training
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl justify-center px-4 py-12">
        <section className="w-full max-w-md">
          <ProLockedCard variant="standard">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                  Free vs Unlock Full System
                </p>
                <div className="mt-2">
                  <FreeVsProComparison />
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-600">
                Unlock Full System removes the Level {FREE_MAX_PATH_LEVEL} XP cap, unlocks deeper programming layers, and
                adds faster progression pacing after your daily protocol.
              </p>
            </div>
          </ProLockedCard>
          <Link href="/" className="mt-8 block text-center text-xs text-zinc-600 transition-colors hover:text-zinc-400">
            Return to training
          </Link>
        </section>
      </main>
    </div>
  );
}
