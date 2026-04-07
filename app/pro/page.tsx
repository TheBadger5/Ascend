"use client";

import { useEffect, useState } from "react";

const PRO_ACCESS_STORAGE_KEY = "ascend.pro-access.v1";

export default function ProPage() {
  const [isProUser, setIsProUser] = useState(false);

  useEffect(() => {
    setIsProUser(window.localStorage.getItem(PRO_ACCESS_STORAGE_KEY) === "true");
  }, []);

  const togglePro = () => {
    const next = !isProUser;
    setIsProUser(next);
    window.localStorage.setItem(PRO_ACCESS_STORAGE_KEY, next ? "true" : "false");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center justify-center px-4 py-8">
        <section className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/95 px-6 py-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Ascend Pro</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">Upgrade your system with Ascend Pro</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Ascend Pro expands protocol architecture with multi-path execution, deeper protocol layers, and path-specific unlock structures.
          </p>

          <div className="mt-6 space-y-2 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4 text-sm text-zinc-300">
            <p>- Multiple paths per category</p>
            <p>- Additional paths (future-ready)</p>
            <p>- Advanced protocol depth (structure ready)</p>
            <p>- Path-specific unlock systems (structure ready)</p>
          </div>

          <div className="mt-6 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Access Mode</p>
            <p className="mt-1 text-sm text-zinc-300">{isProUser ? "Ascend Pro Active" : "Ascend Free Active"}</p>
          </div>

          <button
            className="mt-6 w-full rounded-full border border-zinc-500 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-all duration-200 hover:border-zinc-300 hover:bg-white"
            onClick={togglePro}
          >
            {isProUser ? "Switch to Free (Simulation)" : "Enable Ascend Pro (Simulation)"}
          </button>
        </section>
      </main>
    </div>
  );
}
