"use client";

import { useState } from "react";
import { getWeekKey, saveWeekSnapshot } from "@/lib/baseline-metrics";
import { supabase } from "@/lib/supabase";

type Props = {
  userId: string;
  onComplete: () => void;
};

/**
 * Day 1: Baseline Session — max reps tests stored on `profiles` (pushups_max, squats_max, plank_time).
 */
export default function BaselineSession({ userId, onComplete }: Props) {
  const [pushups, setPushups] = useState("");
  const [squats, setSquats] = useState("");
  const [plank, setPlank] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const p = Number.parseInt(pushups, 10);
    const s = Number.parseInt(squats, 10);
    const plRaw = plank.trim();
    const pl = plRaw === "" ? null : Number.parseInt(plRaw, 10);
    if (!Number.isFinite(p) || p < 1) {
      setError("Enter max push-ups (at least 1).");
      return;
    }
    if (!Number.isFinite(s) || s < 1) {
      setError("Enter max bodyweight squats (at least 1).");
      return;
    }
    if (pl != null && (!Number.isFinite(pl) || pl < 1)) {
      setError("Plank hold: enter seconds or leave empty.");
      return;
    }
    setError(null);
    setSaving(true);
    const now = new Date().toISOString();
    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        pushups_max: p,
        squats_max: s,
        plank_time: pl,
        current_pushups_max: p,
        current_squats_max: s,
        current_plank_time: pl,
        baseline_completed_at: now,
      })
      .eq("id", userId);
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    saveWeekSnapshot({ weekKey: getWeekKey(), pushups: p, squats: s, plank: pl });
    onComplete();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/95 px-6 py-10 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-500/90">Day 1</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">Baseline Session</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            Quick tests — max effort, good form. We use these to show real progress over time.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Max push-ups</label>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={pushups}
                onChange={(e) => setPushups(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-600/60"
                placeholder="e.g. 20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Bodyweight squats (max reps)
              </label>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={squats}
                onChange={(e) => setSquats(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-600/60"
                placeholder="e.g. 30"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Plank hold (seconds, optional)
              </label>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={plank}
                onChange={(e) => setPlank(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-600/60"
                placeholder="Skip if you prefer"
              />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-rose-400/90">{error}</p>}

          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="mt-8 w-full rounded-full border border-emerald-600/40 bg-emerald-950/40 py-3 text-sm font-semibold text-emerald-100 transition-colors hover:border-emerald-500/50 hover:bg-emerald-950/60 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save baseline & continue"}
          </button>
        </section>
      </main>
    </div>
  );
}
