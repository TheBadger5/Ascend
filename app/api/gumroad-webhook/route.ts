/**
 * Gumroad → Ascend: unlock paid access after a sale.
 *
 * ## How it works
 * 1. Gumroad sends an HTTP **POST** to this URL when a product is sold (Ping / webhook).
 * 2. We parse the body (usually `application/x-www-form-urlencoded`; sometimes JSON).
 * 3. We read the buyer’s **email** — same email they must use for Ascend signup.
 * 4. We call Supabase RPC `grant_paid_access_by_email`, which sets `profiles.is_paid_user = true`
 *    for the `auth.users` row with that email (server-side, service role).
 *
 * ## Gumroad fields we use
 * - **`email`** — buyer email (required). Other fields (`product_id`, `price`, `order_number`, …)
 *   are only logged as keys for debugging, not stored.
 *
 * ## Optional security
 * Set `GUMROAD_WEBHOOK_SECRET` in your deployment env, then add the same value to your Gumroad
 * ping URL as `?secret=YOUR_SECRET` (or Gumroad may echo a `secret` field in the POST body).
 * If the env is set, requests must match or we return 401.
 *
 * ## Behaviour on “no user”
 * If there is no Supabase user with that email, we still return **200** so Gumroad does not retry
 * forever, and we log a warning (buyer must create an Ascend account first with the same email).
 */

import { NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type ParsedBody = Record<string, string>;

function flattenFormData(fd: FormData): ParsedBody {
  const out: ParsedBody = {};
  fd.forEach((value, key) => {
    out[key] = typeof value === "string" ? value : value.name;
  });
  return out;
}

async function parseGumroadBody(request: Request): Promise<ParsedBody> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const j = (await request.json()) as unknown;
    if (j && typeof j === "object" && !Array.isArray(j)) {
      const o: ParsedBody = {};
      for (const [k, v] of Object.entries(j as Record<string, unknown>)) {
        if (v == null) continue;
        o[k] = typeof v === "string" ? v : JSON.stringify(v);
      }
      return o;
    }
    return {};
  }
  const fd = await request.formData();
  return flattenFormData(fd);
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const secretFromQuery = url.searchParams.get("secret");
    const body = await parseGumroadBody(request);

    // Debug: log payload shape (keys only) — avoids dumping secrets in full.
    console.log("[gumroad-webhook] event keys:", Object.keys(body).sort().join(", "));

    const expectedSecret = process.env.GUMROAD_WEBHOOK_SECRET;
    if (expectedSecret) {
      const fromBody = body["secret"];
      const ok = secretFromQuery === expectedSecret || fromBody === expectedSecret;
      if (!ok) {
        console.warn("[gumroad-webhook] rejected: secret mismatch");
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
    }

    const emailRaw = body["email"]?.trim();
    if (!emailRaw) {
      console.warn("[gumroad-webhook] missing email in payload");
      return NextResponse.json({ ok: true, message: "ignored_no_email" }, { status: 200 });
    }

    let admin;
    try {
      admin = createSupabaseAdmin();
    } catch (e) {
      console.error("[gumroad-webhook] Supabase admin not configured:", e);
      return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 200 });
    }

    const { data, error } = await admin.rpc("grant_paid_access_by_email", { p_email: emailRaw });

    if (error) {
      console.error("[gumroad-webhook] RPC grant_paid_access_by_email:", error.message);
      return NextResponse.json({ ok: true, warning: "rpc_error_logged" }, { status: 200 });
    }

    const result = data as { ok?: boolean; reason?: string; user_id?: string } | null;
    if (result?.ok === false && result?.reason === "user_not_found") {
      console.warn(
        "[gumroad-webhook] no Supabase user for email (sign up in Ascend with same email first):",
        emailRaw
      );
      return NextResponse.json({ ok: true, matched: false, reason: "user_not_found" }, { status: 200 });
    }

    console.log("[gumroad-webhook] paid access granted for:", emailRaw);
    return NextResponse.json({ ok: true, matched: true, user_id: result?.user_id }, { status: 200 });
  } catch (e) {
    console.error("[gumroad-webhook] unexpected:", e);
    return NextResponse.json({ ok: true, warning: "exception_logged" }, { status: 200 });
  }
}
