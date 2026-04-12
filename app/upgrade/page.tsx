"use client";

import Link from "next/link";
import {
  EARLY_ACCESS_PRICE_LABEL,
  FREE_MAX_PATH_LEVEL,
  GUMROAD_ASCEND_CHECKOUT_URL,
} from "@/lib/monetization";
import { useProEntitlement } from "@/lib/use-pro-entitlement";
import LoadingScreen from "../loading-screen";
import RefreshAccessButton from "../refresh-access-button";

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
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-500/90">Pro</p>
            <p className="mt-4 text-lg text-zinc-300">Your account has full access.</p>
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
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center justify-center px-4 py-12">
        <section className="w-full max-w-md rounded-2xl border border-zinc-800/90 bg-zinc-900/40 px-8 py-10 shadow-[0_24px_80px_-50px_rgba(0,0,0,0.85)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Locked</p>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-zinc-50 md:text-2xl">
            Upgrade to unlock this feature
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            Full progression beyond Level {FREE_MAX_PATH_LEVEL}, tier-locked protocols, faster level-ups, and extra training sessions after checkout.
          </p>
          <div className="mt-8 rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Get Early Access on Gumroad</p>
            <p className="mt-2 text-sm text-zinc-400">
              One-time purchase. Use the same email as your Ascend account so access is applied automatically.
            </p>
            <p className="mt-5 flex items-baseline justify-center gap-2">
              <span className="text-3xl font-semibold tabular-nums text-zinc-100">{EARLY_ACCESS_PRICE_LABEL}</span>
              <span className="text-sm text-zinc-600">early access</span>
            </p>
            <a
              href={GUMROAD_ASCEND_CHECKOUT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center rounded-full border border-zinc-500 bg-zinc-100 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-white"
            >
              Continue to checkout
            </a>
            <div className="mt-5 flex justify-center border-t border-zinc-800/80 pt-4">
              <RefreshAccessButton />
            </div>
          </div>
          <Link href="/" className="mt-6 block text-center text-xs text-zinc-600 transition-colors hover:text-zinc-400">
            Return to training
          </Link>
        </section>
      </main>
    </div>
  );
}
