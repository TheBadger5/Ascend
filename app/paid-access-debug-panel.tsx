"use client";

import { getProFeatureDebugLines } from "@/lib/pro-gating";
import { useProEntitlement } from "@/lib/use-pro-entitlement";

/**
 * Development-only: Supabase Pro state + which features are locked.
 * Remove when finished debugging.
 */
export default function PaidAccessDebugPanel() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const { isPaidReady, isPaidUser, effectivePro, debug } = useProEntitlement();
  const lines = getProFeatureDebugLines(effectivePro);

  const email = debug?.userEmail ?? "—";
  const uid = debug?.userId ?? "—";
  const row = debug?.profileRowFound === true ? "yes" : debug?.profileRowFound === false ? "no" : "—";
  const raw =
    debug?.isPaidUserRaw === true || debug?.isPaidUserRaw === false
      ? String(debug.isPaidUserRaw)
      : debug?.profileRowFound
        ? "null/undefined"
        : "—";

  return (
    <div
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] max-h-[45vh] overflow-y-auto border-t border-amber-900/40 bg-zinc-950/95 px-3 py-2 font-mono text-[10px] leading-relaxed text-amber-200/90 backdrop-blur-sm"
      aria-hidden
    >
      <p className="text-amber-500/90">[paid debug · dev only]</p>
      <p className="mt-1">
        <span className="text-zinc-500">email:</span> {email}
        <span className="mx-2 text-zinc-700">·</span>
        <span className="text-zinc-500">user id:</span> {uid}
      </p>
      <p className="mt-0.5">
        <span className="text-zinc-500">profile row:</span> {row}
        <span className="mx-2 text-zinc-700">·</span>
        <span className="text-zinc-500">is_paid_user:</span> {raw}
      </p>
      <p className="mt-0.5">
        <span className="text-zinc-500">isPaidReady:</span> {String(isPaidReady)}
        <span className="mx-2 text-zinc-700">·</span>
        <span className="text-zinc-500">isPaidUser:</span> {String(isPaidUser)}
        <span className="mx-2 text-zinc-700">·</span>
        <span className="text-zinc-500">effectivePro:</span> {String(effectivePro)}
      </p>
      <p className="mt-1.5 text-zinc-500">Pro features</p>
      <ul className="mt-0.5 space-y-0.5 pl-2">
        {lines.map((l) => (
          <li key={l.id}>
            <span className="text-zinc-600">{l.label}:</span>{" "}
            <span className={l.state === "unlocked" ? "text-emerald-400/90" : "text-rose-400/85"}>{l.state}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
