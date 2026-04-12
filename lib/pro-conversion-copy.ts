/**
 * Unified Pro conversion copy — serious, minimal. CTA targets Gumroad; access only via Supabase `is_paid_user`.
 */

export const HOME_HERO_HEADLINE = "Turn your training into a system that progresses";
export const HOME_HERO_SUBHEADLINE = "Structured training. Real progression. No guesswork.";

export const PRO_LOCKED_HEADLINE = "You've reached the limit of your current system";

export const PRO_LOCKED_BODY_LEAD = "Most people stay here — and stop progressing.";

export const PRO_LOCKED_BODY_PREFIX = "The full system gives you:";

export const PRO_LOCKED_BULLETS = [
  "Structured weekly programming",
  "Real progression tracking",
  "Advanced protocols",
] as const;

/** Primary CTA — price comes from `EARLY_ACCESS_PRICE_LABEL` in monetization. */
export function proUnlockCtaLabel(priceLabel: string): string {
  return `Unlock Full System (${priceLabel})`;
}

export const PRO_CTA_EMAIL_HINT = "Use the same email to unlock instantly";

export const FIRST_SYSTEM_MOMENT_LINE_1 = "You've started your system.";
export const FIRST_SYSTEM_MOMENT_LINE_2 = "Most people never get this far.";

/** localStorage — one-time first completion moment */
export const FIRST_SYSTEM_MOMENT_STORAGE_KEY = "ascend.first-system-moment.v1";
