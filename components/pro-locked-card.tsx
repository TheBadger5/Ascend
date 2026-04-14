"use client";

import type { ReactNode } from "react";
import AscendLogo from "@/components/ascend-logo";
import {
  PRO_CTA_EMAIL_HINT,
  PRO_CTA_PRICE_HINT,
  PRO_LOCKED_BODY_LEAD,
  PRO_LOCKED_BODY_PREFIX,
  PRO_LOCKED_BULLETS,
  PRO_LOCKED_HEADLINE,
  proUnlockCtaLabel,
} from "@/lib/pro-conversion-copy";
import { EARLY_ACCESS_PRICE_LABEL, GUMROAD_ASCEND_CHECKOUT_URL } from "@/lib/monetization";
import RefreshAccessButton from "@/app/refresh-access-button";

type Props = {
  variant?: "compact" | "standard";
  className?: string;
  /** Optional banner (e.g. XP cap) above body */
  notice?: ReactNode;
  /** e.g. Free vs Pro comparison */
  children?: ReactNode;
};

export default function ProLockedCard({ variant = "standard", className = "", notice, children }: Props) {
  const pad = variant === "compact" ? "px-3 py-3" : "px-4 py-5";
  const headlineCls = variant === "compact" ? "text-sm font-semibold text-zinc-100" : "text-base font-semibold text-zinc-50 md:text-lg";
  const logoSize = variant === "compact" ? 36 : 44;
  return (
    <div
      className={`rounded-xl border border-zinc-800/90 bg-zinc-950/60 ${pad} text-left shadow-[0_16px_48px_-36px_rgba(0,0,0,0.9)] ${className}`}
    >
      {notice ? <div className="mb-3">{notice}</div> : null}
      <div className="mb-4 flex justify-center">
        <AscendLogo size={logoSize} />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">Full system</p>
      <h2 className={`mt-3 tracking-tight ${headlineCls}`}>{PRO_LOCKED_HEADLINE}</h2>
      <p className="mt-3 text-[13px] leading-relaxed text-zinc-500">{PRO_LOCKED_BODY_LEAD}</p>
      <p className="mt-4 text-[12px] font-medium text-zinc-400">{PRO_LOCKED_BODY_PREFIX}</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-[13px] leading-relaxed text-zinc-400">
        {PRO_LOCKED_BULLETS.map((line) => (
          <li key={line} className="pl-0.5">
            {line}
          </li>
        ))}
      </ul>
      <a
        href={GUMROAD_ASCEND_CHECKOUT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-5 flex w-full items-center justify-center rounded-full border border-zinc-500 bg-zinc-100 font-semibold text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-white ${
          variant === "compact" ? "py-2.5 text-xs" : "py-3 text-sm"
        }`}
      >
        {proUnlockCtaLabel(EARLY_ACCESS_PRICE_LABEL)}
      </a>
      <p className="mt-2 text-center text-[11px] leading-snug text-zinc-600">{PRO_CTA_PRICE_HINT}</p>
      <p className="mt-3 text-center text-[11px] leading-snug text-zinc-600">{PRO_CTA_EMAIL_HINT}</p>
      <div className="mt-4 flex justify-center border-t border-zinc-800/80 pt-4">
        <RefreshAccessButton />
      </div>
      {children ? <div className="mt-5 border-t border-zinc-800/70 pt-5">{children}</div> : null}
    </div>
  );
}
