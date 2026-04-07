"use client";

export default function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-200">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/95 px-6 py-8 text-center shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-200" />
        <p className="mt-4 text-sm tracking-wide text-zinc-400">Loading debug mode</p>
      </div>
    </div>
  );
}
