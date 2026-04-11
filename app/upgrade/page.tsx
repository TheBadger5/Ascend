"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EARLY_ACCESS_PRICE_LABEL,
  FREE_MAX_PATH_LEVEL,
  loadMonetizationState,
  simulateUpgradeToPaid,
} from "@/lib/monetization";
import LoadingScreen from "../loading-screen";

export default function UpgradePage() {
  const [ready, setReady] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    const m = loadMonetizationState();
    setIsPaid(m.isPaidUser);
    setReady(true);
  }, []);

  if (!ready) {
    return <LoadingScreen label="Loading…" />;
  }

  if (isPaid) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center justify-center px-4 py-12">
          <section className="w-full max-w-md text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-500/90">Full system</p>
            <p className="mt-4 text-lg text-zinc-300">Your account has full progression access.</p>
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Early access</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">Upgrade your system</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Unlock full progression beyond Level {FREE_MAX_PATH_LEVEL}, advanced prescriptions, faster level-ups, and extra training sessions—one disciplined stack.
          </p>
          <ul className="mt-8 space-y-3 border-t border-zinc-800/80 pt-6 text-[13px] leading-relaxed text-zinc-500">
            <li className="flex gap-2">
              <span className="text-zinc-600">—</span>
              <span>Deeper programming (tier-locked protocols)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-600">—</span>
              <span>Faster progression (fewer required sessions per level)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-600">—</span>
              <span>Full extra-session mode after your daily anchor</span>
            </li>
          </ul>
          <p className="mt-8 text-center">
            <span className="text-3xl font-semibold tabular-nums text-zinc-100">{EARLY_ACCESS_PRICE_LABEL}</span>
            <span className="ml-2 text-sm text-zinc-500">one-time early access</span>
          </p>
          <p className="mt-2 text-center text-[11px] text-zinc-600">Payments not connected yet — simulation only.</p>
          <button
            type="button"
            className="mt-8 w-full rounded-full border border-zinc-500 bg-zinc-100 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-white"
            onClick={() => {
              simulateUpgradeToPaid();
              window.location.href = "/";
            }}
          >
            Unlock full progression
          </button>
          <Link href="/" className="mt-5 block text-center text-xs text-zinc-600 transition-colors hover:text-zinc-400">
            Return without upgrading
          </Link>
        </section>
      </main>
    </div>
  );
}
