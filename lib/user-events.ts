/**
 * Append-only client events → `public.user_events` (Supabase).
 *
 * - Only authenticated users: pass `userId` from `auth` (no-op if missing).
 * - Inserts are fire-and-forget; failures never throw to callers.
 *
 * Metadata examples (all optional except what you pass):
 * - `protocol_title`, `strength_level`, `session_length_seconds`, `quest_id`, `scope`, etc.
 */

import { supabase } from "./supabase";

export const USER_EVENT_TYPES = {
  PROTOCOL_STARTED: "protocol_started",
  PROTOCOL_COMPLETED: "protocol_completed",
  SESSION_STARTED: "session_started",
  SESSION_COMPLETED: "session_completed",
} as const;

export type UserEventTypeName = (typeof USER_EVENT_TYPES)[keyof typeof USER_EVENT_TYPES];

/**
 * Insert one row into `public.user_events` (`user_id`, `event_type`, `metadata`).
 * Safe to call from UI: no await; errors are swallowed aside from a console warning.
 */
export function logUserEvent(
  userId: string | null | undefined,
  eventType: UserEventTypeName,
  metadata?: Record<string, unknown> | null
): void {
  if (userId == null || typeof userId !== "string" || userId.length === 0) {
    return;
  }

  try {
    void supabase
      .from("user_events")
      .insert({
        user_id: userId,
        event_type: eventType,
        metadata: metadata ?? null,
      })
      .then(({ error }) => {
        if (error) {
          console.warn("[Ascend] user_events:", eventType, error.message);
        }
      });
  } catch (e) {
    console.warn("[Ascend] user_events: unexpected", eventType, e);
  }
}
