"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

/**
 * Auth: Safari is stricter about Web Locks + storage latency than Chrome; the JS client
 * coordinates tabs with `navigator.locks` by default. A bounded lock wait avoids rare
 * deadlocks where `getSession()` never settles before our UI timeout.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // GoTrue supports this; @supabase/supabase-js typings omit it on `auth`.
    // @ts-expect-error — lockAcquireTimeout (see auth-js GoTrueClientOptions)
    lockAcquireTimeout: 3000,
  },
});
