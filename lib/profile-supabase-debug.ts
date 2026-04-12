/**
 * Temporary: set NEXT_PUBLIC_ASCEND_DEBUG_PROFILES=1 to log which Supabase project
 * and which `profiles` operations run. Remove after schema is confirmed in production.
 */
export function logProfileTableDebug(
  source: string,
  op: "select" | "upsert" | "update",
  extra?: Record<string, unknown>
): void {
  if (process.env.NEXT_PUBLIC_ASCEND_DEBUG_PROFILES !== "1") return;
  if (typeof window === "undefined") return;
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let host = "";
  let projectRef = "";
  try {
    const u = new URL(raw);
    host = u.host;
    projectRef = u.hostname.split(".")[0] ?? "";
  } catch {
    host = "(invalid NEXT_PUBLIC_SUPABASE_URL)";
  }
  console.log("[Ascend profiles debug]", {
    source,
    op,
    table: "profiles",
    supabaseHost: host,
    projectRef,
    ...extra,
  });
}
