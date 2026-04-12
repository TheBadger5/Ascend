"use client";

import AscendLogo from "@/components/ascend-logo";

type LoadingScreenProps = {
  label?: string;
  /** Session gate uses a calmer, premium treatment. */
  variant?: "default" | "session";
};

export default function LoadingScreen({ label = "Synchronizing system", variant = "default" }: LoadingScreenProps) {
  const isSession = variant === "session";

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-200"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={`w-full text-center ${
          isSession ? "max-w-xs border-0 bg-transparent px-4 py-10 shadow-none" : "max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/95 px-6 py-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]"
        }`}
      >
        <div className="mx-auto flex flex-col items-center gap-5">
          <AscendLogo size={isSession ? 48 : 56} />
          <div
            className={`rounded-full border-2 border-zinc-800 border-t-zinc-300 animate-spin ${
              isSession ? "h-7 w-7" : "h-8 w-8 border-zinc-700"
            }`}
          />
        </div>
        <p
          className={`mt-5 font-medium uppercase text-zinc-500 ${
            isSession ? "text-[11px] tracking-[0.2em]" : "text-[13px] tracking-[0.12em]"
          }`}
        >
          {label}
        </p>
        {isSession && (
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
            Securing your session
          </p>
        )}
      </div>
    </div>
  );
}
