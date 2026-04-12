"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoadingScreen from "./loading-screen";

const PUBLIC_ROUTES = new Set(["/login", "/signup"]);

/**
 * Max time to wait for `getSession()` before unblocking the shell.
 * Safari (and some privacy settings) can stall on Web Locks + storage longer than Chrome;
 * without a cap the UI never leaves "Checking your session…".
 */
const AUTH_SESSION_MAX_WAIT_MS = 4500;

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const currentPath = pathname ?? "/";
  const isPublicRoute = PUBLIC_ROUTES.has(currentPath);
  /** Bumps on each effect run so late async work from a previous run is ignored (Strict Mode / fast navigation). */
  const generationRef = useRef(0);

  useEffect(() => {
    if (isPublicRoute) {
      setIsChecking(false);
      return;
    }

    const gen = ++generationRef.current;
    let settled = false;
    setIsChecking(true);

    const maxWaitTimer = window.setTimeout(() => {
      if (settled || generationRef.current !== gen) return;
      settled = true;
      // Could not confirm a session in time — unblock shell and send to login (null session policy).
      router.replace("/login");
      setIsChecking(false);
    }, AUTH_SESSION_MAX_WAIT_MS);

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (generationRef.current !== gen) return;

        if (settled) return;
        settled = true;
        window.clearTimeout(maxWaitTimer);

        const session = data?.session ?? null;
        if (error || !session) {
          router.replace("/login");
        }
      } catch {
        if (generationRef.current !== gen) return;
        if (settled) return;
        settled = true;
        window.clearTimeout(maxWaitTimer);
        router.replace("/login");
      } finally {
        if (generationRef.current === gen) {
          setIsChecking(false);
        }
      }
    })();

    return () => {
      window.clearTimeout(maxWaitTimer);
    };
  }, [isPublicRoute, router]);

  if (isChecking) {
    return <LoadingScreen label="Checking your session" variant="session" />;
  }

  return <>{children}</>;
}
